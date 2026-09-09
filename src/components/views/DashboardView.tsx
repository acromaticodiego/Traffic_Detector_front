import { useEffect, useState } from "react";
import { useAnalytics } from "../../state/analytics";
import { useAuth } from "../../state/auth";
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
import { IconRefresh } from "../icons";

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

export function DashboardView() {
  const data = useAnalytics((s) => s.data);
  const team = useAnalytics((s) => s.team);
  const watching = useAnalytics((s) => s.watching);
  const loading = useAnalytics((s) => s.loading);
  const error = useAnalytics((s) => s.error);
  const load = useAnalytics((s) => s.load);
  const loadTeam = useAnalytics((s) => s.loadTeam);

  const puedeVerATodos = useAuth((s) => s.can("analytics:read_all"));

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
          <h2>No se pudo cargar</h2>
          <p>{error}</p>
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

  return (
    <div className="view dash">
      <header className="dash-head">
        <div>
          <h2>{data.user.full_name || data.user.email}</h2>
          <p className="dash-sub">
            <span className="tag">{data.user.role}</span>
            <span className={enTurno ? "shift-pill on" : "shift-pill"}>
              {enTurno ? "En turno" : "Fuera de turno"}
            </span>
            {data.shift && (
              <span className="muted">
                desde las{" "}
                {new Date(data.shift.started_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </p>
        </div>

        <div className="dash-actions">
          {puedeVerATodos && team && team.length > 0 && (
            <select
              className="select"
              value={watching ?? ""}
              onChange={(e) =>
                void load(e.target.value === "" ? null : Number(e.target.value))
              }
              title="Ver el dashboard de otra persona"
            >
              <option value="">Mi dashboard</option>
              {team.map((fila) => (
                <option key={fila.user.id} value={fila.user.id}>
                  {fila.user.full_name || fila.user.email}
                  {fila.on_shift ? " · en turno" : ""}
                </option>
              ))}
            </select>
          )}

          <button
            className="ghost"
            onClick={() => void load(watching)}
            disabled={loading}
          >
            <IconRefresh width={14} height={14} />
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </header>

      <section className="tiles">
        <Tile
          label="Tiempo activo hoy"
          value={duracion(tiempoHoy)}
          hint={hoy.shifts === 1 ? "1 turno" : hoy.shifts + " turnos"}
        />
        <Tile
          label="Revisados hoy"
          value={String(hoy.reviewed)}
          hint={hoy.confirmed + " confirmados · " + hoy.discarded + " descartados"}
        />
        <Tile
          label="Tasa de validez"
          value={porcentaje(hoy.accuracy)}
          hint="de lo revisado hoy resultó real"
        />
        <Tile
          label="Cortes de conexión"
          value={String(hoy.gap_count)}
          hint={
            hoy.gap_count > 0
              ? duracion(hoy.gap_seconds) + " sin señal"
              : "sin interrupciones"
          }
        />
      </section>

      <section className="charts">
        <DayBars
          title="Tiempo activo"
          hint="últimos 14 días"
          data={data.series.map((d) => ({
            date: d.date,
            value: d.active_seconds,
          }))}
          format={duracion}
        />
        <DayBars
          title="Incidentes revisados"
          hint="últimos 14 días"
          data={data.series.map((d) => ({ date: d.date, value: d.reviewed }))}
          format={(v) => String(v)}
        />
      </section>

      <section className="dash-split">
        <Veredictos titulo="Esta semana" bloque={data.week} />
        <Veredictos titulo="Desde siempre" bloque={data.total} />
      </section>

      {puedeVerATodos && team && (
        <section className="card">
          <h3>Equipo</h3>

          <table className="grid">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Hoy</th>
                <th>Revisados</th>
              </tr>
            </thead>
            <tbody>
              {team.map((fila) => (
                <tr key={fila.user.id}>
                  <td>
                    <button
                      className="linky"
                      onClick={() => void load(fila.user.id)}
                    >
                      {fila.user.full_name || fila.user.email}
                    </button>
                  </td>
                  <td>{fila.user.role}</td>
                  <td>
                    <span
                      className={fila.on_shift ? "shift-pill on" : "shift-pill"}
                    >
                      {fila.on_shift ? "En turno" : "Fuera"}
                    </span>
                  </td>
                  <td>{duracion(fila.today.active_seconds)}</td>
                  <td>{fila.today.reviewed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="card">
        <h3>Últimos registros</h3>

        {data.recent.length === 0 ? (
          <p className="muted">
            Todavía no hay veredictos. Los incidentes que confirmes o descartes
            desde el gestor aparecerán aquí.
          </p>
        ) : (
          <table className="grid">
            <thead>
              <tr>
                <th>Cuándo</th>
                <th>Cámara</th>
                <th>Confianza</th>
                <th>Veredicto</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((registro) => {
                const estado = statusInfo(
                  registro.review_status as ReviewStatus,
                );

                return (
                  <tr key={registro.id}>
                    <td>
                      {registro.reviewed_at
                        ? new Date(registro.reviewed_at).toLocaleString([], {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td>{registro.camera_id}</td>
                    <td>{Math.round(registro.confidence * 100)}%</td>
                    <td>
                      {/* Punto de color MÁS etiqueta: el color por sí solo no
                          identifica nada para quien no lo distingue. */}
                      <span className="verdict">
                        <span
                          className="verdict-dot"
                          style={{ background: estado.color }}
                        />
                        {estado.short}
                      </span>
                    </td>
                    <td className="muted">{registro.review_note || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <p className="dash-foot">
        Días cortados por {data.timezone}. Actualizado a las{" "}
        {new Date(data.generated_at).toLocaleTimeString()}.
      </p>
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="tile">
      <span className="tile-label">{label}</span>
      <strong className="tile-value">{value}</strong>
      <span className="tile-hint">{hint}</span>
    </div>
  );
}

/**
 * Confirmados frente a descartados.
 *
 * Solo esos dos, porque son los que responden a "¿fue válido?". Archivar no
 * dice si el incidente era real, así que va como cifra aparte y no como un
 * tercer trozo de la barra — que además sería indistinguible: el validador de
 * paleta rechaza el par acero/gris con visión normal.
 */
function Veredictos({ titulo, bloque }: { titulo: string; bloque: Bloque }) {
  const decididos = bloque.confirmed + bloque.discarded;
  const parteConfirmada =
    decididos > 0 ? (bloque.confirmed / decididos) * 100 : 0;

  const resumen =
    decididos === 0
      ? "sin veredictos todavía"
      : bloque.confirmed + " de " + decididos + " resultaron reales";

  return (
    <div className="card">
      <h3>{titulo}</h3>

      <div className="verdict-row">
        <strong>{porcentaje(bloque.accuracy)}</strong>
        <span className="muted">{resumen}</span>
      </div>

      <div
        className="split-bar"
        role="img"
        aria-label={
          bloque.confirmed + " confirmados y " + bloque.discarded + " descartados"
        }
      >
        <span
          className="split-fill confirmado"
          style={{ width: parteConfirmada + "%" }}
        />
        <span
          className="split-fill descartado"
          style={{ width: 100 - parteConfirmada + "%" }}
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
        {duracion(bloque.active_seconds)} trabajados
        {bloque.gap_count > 0
          ? " · " +
            bloque.gap_count +
            (bloque.gap_count === 1 ? " corte (" : " cortes (") +
            duracion(bloque.gap_seconds) +
            ")"
          : ""}
      </p>
    </div>
  );
}
