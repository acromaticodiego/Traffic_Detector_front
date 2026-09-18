import { useEffect, useState } from "react";
import { useAnalytics } from "../../state/analytics";
import { useAuth } from "../../state/auth";
import { useView } from "../../state/view";
import {
  duracion,
  porcentaje,
  turnoEnCurso,
  type Bloque,
} from "../../lib/analytics";
import { statusInfo } from "../../lib/review";
import type { ReviewStatus } from "../../lib/types";
import { DayBars } from "../charts/DayBars";
import { DashboardSkeleton } from "../Skeleton";
import {
  IconRefresh,
  IconClock,
  IconTarget,
  IconWifi,
  IconWifiOff,
  IconConsole,
  IconArrowUpRight,
  IconCheckCircle,
  IconDiscard,
  IconArchive,
  IconCamera,
  IconSearch,
  IconUsers,
  IconCalendar,
  IconSparkles,
  IconReview,
} from "../icons";

/** El contador del turno abierto, avanzando en pantalla. */
function useTicToc(activo: boolean): number {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (!activo) return;

    const id = window.setInterval(() => setAhora(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [activo]);

  return ahora;
}

function getGreeting(name: string): string {
  const hora = new Date().getHours();
  let saludo = "¡Buenas noches";
  if (hora >= 5 && hora < 12) saludo = "¡Buenos días";
  else if (hora >= 12 && hora < 19) saludo = "¡Buenas tardes";

  const primerNombre = name.trim().split(" ")[0] || "Operador";
  return `${saludo}, ${primerNombre}`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getConfidenceClass(conf: number): "high" | "mid" | "low" {
  const p = conf * 100;
  if (p >= 80) return "high";
  if (p >= 60) return "mid";
  return "low";
}

function formatFechaAmigable(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const hoy = new Date();
  const esHoy = d.toDateString() === hoy.toDateString();
  const hora = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (esHoy) return `Hoy, ${hora}`;
  return `${d.toLocaleDateString([], { day: "2-digit", month: "short" })}, ${hora}`;
}

export function DashboardView() {
  const data = useAnalytics((s) => s.data);
  const team = useAnalytics((s) => s.team);
  const watching = useAnalytics((s) => s.watching);
  const loading = useAnalytics((s) => s.loading);
  const error = useAnalytics((s) => s.error);
  const load = useAnalytics((s) => s.load);
  const loadTeam = useAnalytics((s) => s.loadTeam);

  const puedeVerATodos = useAuth((s) => s.can("analytics:read_all"));
  const go = useView((s) => s.go);

  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState<string>("");

  useEffect(() => {
    void load(null);
  }, [load]);

  useEffect(() => {
    if (puedeVerATodos) void loadTeam();
  }, [puedeVerATodos, loadTeam]);

  const ahora = useTicToc(Boolean(data?.shift));

  if (error) {
    return (
      <div className="view">
        <div className="view-empty">
          <h2>No se pudo cargar el dashboard</h2>
          <p>{error}</p>
          <button className="btn-primary-action" onClick={() => void load(watching)}>
            <IconRefresh width={14} height={14} />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!data) return <DashboardSkeleton />;

  const hoy = data.today;
  const enTurno = data.shift !== null;

  // El bloque del día viene del servidor; si hay turno abierto se le suma lo
  // corrido desde el último latido, para que el contador no salte de minuto
  // en minuto delante de quien lo está mirando.
  const tiempoHoy = data.shift
    ? Math.max(hoy.active_seconds, turnoEnCurso(data.shift, ahora))
    : hoy.active_seconds;

  // Filtros de registros recientes
  const query = busqueda.toLowerCase().trim();
  const registrosFiltrados = data.recent.filter((registro) => {
    const coincideEstado =
      filtroEstado === "todos" || registro.review_status === filtroEstado;
    const coincideBusqueda =
      !query ||
      registro.camera_id.toLowerCase().includes(query) ||
      registro.incident_type.toLowerCase().includes(query) ||
      (registro.review_note && registro.review_note.toLowerCase().includes(query));

    return coincideEstado && coincideBusqueda;
  });

  const conteoPorEstado = {
    todos: data.recent.length,
    confirmado: data.recent.filter((r) => r.review_status === "confirmado").length,
    descartado: data.recent.filter((r) => r.review_status === "descartado").length,
    archivado: data.recent.filter((r) => r.review_status === "archivado").length,
  };

  const nombreUsuario = data.user.full_name || data.user.email;
  const accuracyPct = hoy.accuracy !== null ? Math.round(hoy.accuracy * 100) : null;

  return (
    <div className="view dash">
      {/* ── Banner de bienvenida amigable (Hero) ── */}
      <section className="dash-hero">
        <div className="dash-hero-main">
          <div className="dash-hero-title-group">
            <h2>
              <span>{getGreeting(nombreUsuario)}</span>
              <span className="dash-hero-badge-role">{data.user.role}</span>
            </h2>
            <div className="dash-hero-status-row">
              <span className={enTurno ? "shift-pill on" : "shift-pill"}>
                {enTurno ? (
                  <>
                    <span className="pulse-dot" />
                    <strong>En turno activo</strong>
                  </>
                ) : (
                  "Fuera de turno"
                )}
              </span>
              {data.shift ? (
                <span className="muted">
                  iniciado a las{" "}
                  {new Date(data.shift.started_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              ) : (
                <span className="muted">Inicia sesión o abre la consola para registrar actividad</span>
              )}
            </div>
          </div>

          <div className="dash-hero-actions">
            {puedeVerATodos && team && team.length > 0 && (
              <select
                className="select"
                value={watching ?? ""}
                onChange={(e) =>
                  void load(e.target.value === "" ? null : Number(e.target.value))
                }
                title="Supervisar el dashboard de un miembro del equipo"
              >
                <option value="">Mi dashboard personal</option>
                {team.map((fila) => (
                  <option key={fila.user.id} value={fila.user.id}>
                    {fila.user.full_name || fila.user.email}
                    {fila.on_shift ? " · en turno" : ""}
                  </option>
                ))}
              </select>
            )}

            <button
              className="btn-primary-action"
              onClick={() => go("console")}
              title="Ir a la consola de cámaras e inferencia en vivo"
            >
              <IconConsole width={15} height={15} />
              <span>Monitoreo en vivo</span>
              <IconArrowUpRight width={14} height={14} />
            </button>

            <button
              className="ghost"
              onClick={() => void load(watching)}
              disabled={loading}
              title="Actualizar las métricas"
            >
              <IconRefresh width={14} height={14} />
              {loading ? "Actualizando…" : "Actualizar"}
            </button>
          </div>
        </div>
      </section>

      {/* ── Tarjetas de métricas clave (KPIs) ── */}
      <section className="tiles">
        <Tile
          label="Tiempo activo hoy"
          value={duracion(tiempoHoy)}
          icon={<IconClock width={18} height={18} />}
          variant="iris"
          hint={
            enTurno ? (
              <span className="chip-stat" style={{ color: "var(--good)" }}>
                ● Contador en marcha
              </span>
            ) : hoy.shifts === 1 ? (
              "1 turno completado"
            ) : (
              `${hoy.shifts} turnos hoy`
            )
          }
        />

        <Tile
          label="Incidentes revisados hoy"
          value={String(hoy.reviewed)}
          icon={<IconReview width={18} height={18} />}
          variant="default"
          hint={
            hoy.reviewed === 0 ? (
              "Aún sin revisiones registradas"
            ) : (
              <>
                <span className="chip-stat confirmed">
                  {hoy.confirmed} confirmados
                </span>
                <span className="chip-stat discarded">
                  {hoy.discarded} descartados
                </span>
              </>
            )
          }
        />

        <Tile
          label="Tasa de validez de alertas"
          value={porcentaje(hoy.accuracy)}
          icon={<IconTarget width={18} height={18} />}
          variant={
            accuracyPct === null
              ? "default"
              : accuracyPct >= 80
              ? "good"
              : accuracyPct >= 50
              ? "warn"
              : "bad"
          }
          meterValue={accuracyPct}
          hint={
            hoy.accuracy === null
              ? "Pendiente de emitir veredictos hoy"
              : accuracyPct && accuracyPct >= 80
              ? "Alta precisión en las alertas"
              : "De lo revisado hoy resultó real"
          }
        />

        <Tile
          label="Estabilidad de conexión"
          value={hoy.gap_count === 0 ? "100% Estable" : `${hoy.gap_count} cortes`}
          icon={
            hoy.gap_count > 0 ? (
              <IconWifiOff width={18} height={18} />
            ) : (
              <IconWifi width={18} height={18} />
            )
          }
          variant={hoy.gap_count === 0 ? "good" : "warn"}
          hint={
            hoy.gap_count > 0
              ? `${duracion(hoy.gap_seconds)} sin señal acumulados`
              : "Sin interrupciones durante el turno"
          }
        />
      </section>

      {/* ── Gráficas de los últimos 14 días ── */}
      <section className="charts">
        <DayBars
          title="Tiempo activo"
          hint="Histórico de los últimos 14 días"
          icon={<IconClock width={15} height={15} />}
          data={data.series.map((d) => ({
            date: d.date,
            value: d.active_seconds,
          }))}
          format={duracion}
        />
        <DayBars
          title="Incidentes revisados"
          hint="Histórico de los últimos 14 días"
          icon={<IconReview width={15} height={15} />}
          data={data.series.map((d) => ({ date: d.date, value: d.reviewed }))}
          format={(v) => `${v}`}
        />
      </section>

      {/* ── Veredictos: Calidad de detección ── */}
      <section className="dash-split">
        <Veredictos
          titulo="Rendimiento de esta semana"
          bloque={data.week}
          icono={<IconSparkles width={16} height={16} style={{ color: "var(--iris)" }} />}
        />
        <Veredictos
          titulo="Rendimiento histórico acumulado"
          bloque={data.total}
          icono={<IconTarget width={16} height={16} style={{ color: "var(--brand)" }} />}
        />
      </section>

      {/* ── Supervisión de Equipo (si tiene permisos) ── */}
      {puedeVerATodos && team && (
        <section className="card">
          <div className="card-header-bar">
            <h3>
              <IconUsers width={16} height={16} />
              <span>Supervisión de Equipo</span>
            </h3>
            <span className="pill-metric">
              {team.filter((f) => f.on_shift).length} de {team.length} en turno ahora
            </span>
          </div>

          <div className="table-wrapper">
            <table className="grid">
              <thead>
                <tr>
                  <th>Miembro del equipo</th>
                  <th>Rol</th>
                  <th>Estado del turno</th>
                  <th>Tiempo activo hoy</th>
                  <th>Incidentes revisados</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {team.map((fila) => {
                  const nombre = fila.user.full_name || fila.user.email;
                  return (
                    <tr key={fila.user.id}>
                      <td>
                        <div className="user-cell">
                          <span className="avatar-badge">{getInitials(nombre)}</span>
                          <div>
                            <strong>{nombre}</strong>
                            {fila.user.full_name && (
                              <div className="muted small">{fila.user.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="tag">{fila.user.role}</span>
                      </td>
                      <td>
                        <span className={fila.on_shift ? "shift-pill on" : "shift-pill"}>
                          {fila.on_shift && <span className="pulse-dot" />}
                          {fila.on_shift ? "En turno" : "Fuera de turno"}
                        </span>
                      </td>
                      <td>
                        <strong>{duracion(fila.today.active_seconds)}</strong>
                      </td>
                      <td>
                        <span className="pill-metric">{fila.today.reviewed}</span>
                      </td>
                      <td>
                        <button
                          className="linky"
                          onClick={() => void load(fila.user.id)}
                          title={`Ver dashboard de ${nombre}`}
                        >
                          <span>Ver detalle</span>
                          <IconArrowUpRight width={13} height={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Últimos registros con buscador y filtros ── */}
      <section className="card">
        <div className="card-header-bar">
          <h3>
            <IconReview width={16} height={16} />
            <span>Últimos registros evaluados</span>
          </h3>

          <div className="filter-controls">
            {/* Buscador */}
            <div className="search-input-wrap">
              <IconSearch width={13} height={13} />
              <input
                type="text"
                className="search-input"
                placeholder="Buscar cámara o nota…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            {/* Chips de filtro por veredicto */}
            <div className="filter-chips">
              <button
                className={`filter-chip ${filtroEstado === "todos" ? "active" : ""}`}
                onClick={() => setFiltroEstado("todos")}
              >
                Todos ({conteoPorEstado.todos})
              </button>
              <button
                className={`filter-chip ${filtroEstado === "confirmado" ? "active" : ""}`}
                onClick={() => setFiltroEstado("confirmado")}
              >
                Confirmados ({conteoPorEstado.confirmado})
              </button>
              <button
                className={`filter-chip ${filtroEstado === "descartado" ? "active" : ""}`}
                onClick={() => setFiltroEstado("descartado")}
              >
                Descartados ({conteoPorEstado.descartado})
              </button>
              <button
                className={`filter-chip ${filtroEstado === "archivado" ? "active" : ""}`}
                onClick={() => setFiltroEstado("archivado")}
              >
                Archivados ({conteoPorEstado.archivado})
              </button>
            </div>
          </div>
        </div>

        {data.recent.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconReview width={24} height={24} />
            </div>
            <h4>Todavía no hay veredictos registrados</h4>
            <p>
              Los incidentes que confirmes, descartes o archives desde la consola de
              cámaras aparecerán aquí organizados en tiempo real.
            </p>
            <button className="btn-primary-action" onClick={() => go("console")}>
              <IconConsole width={14} height={14} />
              Ir al gestor de incidentes
            </button>
          </div>
        ) : registrosFiltrados.length === 0 ? (
          <div className="empty-state">
            <h4>No se encontraron coincidencias</h4>
            <p>Ningún registro coincide con el filtro o la búsqueda aplicada.</p>
            <button
              className="ghost"
              onClick={() => {
                setFiltroEstado("todos");
                setBusqueda("");
              }}
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="grid">
              <thead>
                <tr>
                  <th>Momento de revisión</th>
                  <th>Cámara</th>
                  <th>Confianza del modelo</th>
                  <th>Veredicto emitido</th>
                  <th>Nota u observación</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((registro) => {
                  const estado = statusInfo(registro.review_status as ReviewStatus);
                  const confLevel = getConfidenceClass(registro.confidence);
                  const confPct = Math.round(registro.confidence * 100);

                  return (
                    <tr key={registro.id}>
                      <td>
                        <strong>{formatFechaAmigable(registro.reviewed_at)}</strong>
                      </td>
                      <td>
                        <span className="camera-tag">
                          <IconCamera width={12} height={12} />
                          {registro.camera_id}
                        </span>
                      </td>
                      <td>
                        <div className="confidence-cell" title={`Nivel de certeza: ${confPct}%`}>
                          <div className="confidence-bar">
                            <div
                              className={`confidence-fill ${confLevel}`}
                              style={{ width: `${confPct}%` }}
                            />
                          </div>
                          <span className="confidence-text">{confPct}%</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${registro.review_status}`}
                          style={{
                            color: estado.color,
                            borderColor: `${estado.color}40`,
                          }}
                        >
                          {registro.review_status === "confirmado" ? (
                            <IconCheckCircle width={12} height={12} />
                          ) : registro.review_status === "descartado" ? (
                            <IconDiscard width={12} height={12} />
                          ) : (
                            <IconArchive width={12} height={12} />
                          )}
                          {estado.short}
                        </span>
                      </td>
                      <td className="muted">{registro.review_note || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Pie de información ── */}
      <footer className="dash-foot">
        <IconCalendar width={13} height={13} />
        <span>
          Cálculos delimitados por zona horaria {data.timezone}. Última sincronización a
          las {new Date(data.generated_at).toLocaleTimeString()}.
        </span>
      </footer>
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  icon,
  variant = "default",
  meterValue,
}: {
  label: string;
  value: string;
  hint: React.ReactNode;
  icon?: React.ReactNode;
  variant?: "default" | "iris" | "good" | "warn" | "bad";
  meterValue?: number | null;
}) {
  return (
    <div className="tile">
      <div className="tile-top">
        <span className="tile-label">{label}</span>
        {icon && <div className={`tile-icon-box ${variant}`}>{icon}</div>}
      </div>
      <strong className="tile-value">{value}</strong>
      <div className="tile-hint">{hint}</div>
      {typeof meterValue === "number" && (
        <div className="tile-meter-bar">
          <div
            className="tile-meter-fill"
            style={{ width: `${Math.min(Math.max(meterValue, 0), 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Confirmados frente a descartados con indicadores amigables.
 */
function Veredictos({
  titulo,
  bloque,
  icono,
}: {
  titulo: string;
  bloque: Bloque;
  icono?: React.ReactNode;
}) {
  const decididos = bloque.confirmed + bloque.discarded;
  const parteConfirmada =
    decididos > 0 ? (bloque.confirmed / decididos) * 100 : 0;

  const resumen =
    decididos === 0
      ? "Sin veredictos registrados en este periodo"
      : `${bloque.confirmed} de ${decididos} resultaron ser incidentes reales`;

  return (
    <div className="card">
      <div className="card-header-bar">
        <h3>
          {icono}
          <span>{titulo}</span>
        </h3>
        <span className="pill-metric">
          Precisión: <strong>{porcentaje(bloque.accuracy)}</strong>
        </span>
      </div>

      <div className="verdict-row">
        <strong>{porcentaje(bloque.accuracy)}</strong>
        <span className="muted">{resumen}</span>
      </div>

      <div
        className="split-bar"
        role="img"
        aria-label={`${bloque.confirmed} confirmados y ${bloque.discarded} descartados`}
      >
        <span
          className="split-fill confirmado"
          style={{ width: `${parteConfirmada}%` }}
          title={`Confirmados: ${Math.round(parteConfirmada)}%`}
        />
        <span
          className="split-fill descartado"
          style={{ width: `${100 - parteConfirmada}%` }}
          title={`Descartados: ${Math.round(100 - parteConfirmada)}%`}
        />
      </div>

      <ul className="legend">
        <li>
          <span className="verdict-dot confirmado" />
          Confirmados <strong>{bloque.confirmed}</strong>
        </li>
        <li>
          <span className="verdict-dot descartado" />
          Descartados <strong>{bloque.discarded}</strong>
        </li>
        <li className="muted">
          Archivados <strong>{bloque.archived}</strong>
        </li>
      </ul>

      <p className="muted small">
        {duracion(bloque.active_seconds)} dedicados
        {bloque.gap_count > 0
          ? ` · ${bloque.gap_count} ${
              bloque.gap_count === 1 ? "corte (" : "cortes ("
            }${duracion(bloque.gap_seconds)})`
          : " · conexión continua sin interrupciones"}
      </p>
    </div>
  );
}
