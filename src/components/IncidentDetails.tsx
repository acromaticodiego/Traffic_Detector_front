import { useState } from "react";
import { useStore } from "../state/store";
import { useReview } from "../state/review";
import { incidentType, severity } from "../lib/incidents";
import { describeIncident, detectionCount, type Fact } from "../lib/incidentData";
import { statusInfo, timeAgo } from "../lib/review";
import type { StoredIncident } from "../lib/types";
import { IconAI, IconGauge, IconRefresh, IconScan, IconSiren } from "./icons";

/**
 * Panel de detalle.
 *
 * Muestra el caso abierto en el Gestor de incidentes si hay uno, y si no, el
 * seleccionado en la lista de la sesión en vivo. Esa prioridad es
 * deliberada: mientras un agente revisa, el detalle tiene que seguirle a él
 * y no a lo que vaya pasando en el video.
 */
export function IncidentDetails() {
  const live = useStore((s) =>
    s.incidents.find((i) => i.id === s.selectedIncidentId),
  );

  const openId = useReview((s) => s.openId);
  const stored = useReview((s) => s.items.find((i) => i.id === s.openId));

  if (stored && openId != null) return <StoredDetail incident={stored} />;

  if (!live) {
    return (
      <div className="empty">
        <IconSiren width={22} height={22} />
        <span>
          Selecciona un incidente de la lista, o abre uno en el Gestor de
          incidentes
        </span>
      </div>
    );
  }

  const sev = severity(live.confidence);

  return (
    <div className="detail">
      <Header
        title={incidentType(live.incident_type).label}
        color={sev.color}
        badge={sev.label}
        meta={`${Math.round(live.confidence * 100)}% · sesión en vivo${
          live.t != null ? ` · segundo ${live.t.toFixed(1)}` : ""
        }`}
      />
      <Facts facts={describeIncident(live.data)} data={live.data} />
      <p className="detail-foot">
        Este incidente es de la sesión en curso. La evidencia y la lectura con
        IA se generan sobre el histórico: ábrelo en el Gestor de incidentes.
      </p>
    </div>
  );
}

function StoredDetail({ incident }: { incident: StoredIncident }) {
  const summarize = useReview((s) => s.summarize);
  const summarizing = useReview((s) => s.summarizing);
  const summaryError = useReview((s) => s.summaryError);

  const sev = severity(incident.confidence);
  const estado = statusInfo(incident.review_status);
  const busy = summarizing === incident.id;

  return (
    <div className="detail">
      <Header
        title={incidentType(incident.incident_type).label}
        color={sev.color}
        badge={estado.short}
        badgeColor={estado.color}
        meta={`${Math.round(incident.confidence * 100)}% · ${timeAgo(
          incident.detected_at,
        )} · cámara ${incident.camera_id} · caso #${incident.id}`}
      />

      <Facts facts={describeIncident(incident.data)} data={incident.data} />

      <section className="detail-ai">
        <h3>
          <IconAI width={14} height={14} />
          <span>Lectura del caso</span>
          {incident.ai_summary && (
            <button
              className="detail-regen"
              onClick={() => void summarize(incident.id, true)}
              disabled={busy}
              title="Volver a generar"
            >
              <IconRefresh width={12} height={12} />
            </button>
          )}
        </h3>

        {incident.ai_summary ? (
          <>
            <p className="detail-summary">{incident.ai_summary}</p>
            <p className="detail-disclaimer">
              Generado por {incident.ai_model ?? "IA"} a partir de la imagen y
              los datos. Es material para tu decisión, no la decisión.
            </p>
          </>
        ) : (
          <>
            <button
              className="detail-generate"
              onClick={() => void summarize(incident.id)}
              disabled={busy}
            >
              <IconAI width={14} height={14} />
              <span>{busy ? "Analizando la imagen…" : "Analizar el caso"}</span>
            </button>
            {summaryError && <p className="detail-aierror">{summaryError}</p>}
          </>
        )}
      </section>
    </div>
  );
}

function Header({
  title,
  color,
  badge,
  badgeColor,
  meta,
}: {
  title: string;
  color: string;
  badge: string;
  badgeColor?: string;
  meta: string;
}) {
  return (
    <div className="detail-header" style={{ ["--sev" as string]: color }}>
      <IconSiren width={18} height={18} />
      <div className="detail-headtext">
        <strong>{title}</strong>
        <span className="meta">{meta}</span>
      </div>
      <span className="detail-badge" style={{ color: badgeColor ?? color }}>
        {badge}
      </span>
    </div>
  );
}

function Facts({
  facts,
  data,
}: {
  facts: Fact[];
  data: Record<string, unknown>;
}) {
  // Los datos crudos siguen accesibles pero plegados: sirven para depurar el
  // pipeline, no para el turno de un agente.
  const [raw, setRaw] = useState(false);
  const detections = detectionCount(data);

  return (
    <>
      {facts.length > 0 ? (
        <ul className="detail-facts">
          {facts.map((f) => (
            <li key={f.label} className={f.strong ? "strong" : ""}>
              <IconGauge className="detail-facticon" width={13} height={13} />
              <div>
                <span className="k">{f.label}</span>
                <span className="v">{f.value}</span>
                {f.hint && <span className="h">{f.hint}</span>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="detail-foot">
          El motor no adjuntó datos interpretables para este incidente.
        </p>
      )}

      {detections != null && (
        <p className="detail-detections">
          <IconScan width={13} height={13} />
          <span>
            Detectado en {detections} frame{detections === 1 ? "" : "s"}.{" "}
            {detections === 1
              ? "Una sola detección: puede ser un destello del detector."
              : "Varias detecciones seguidas refuerzan que no fue un error puntual."}
          </span>
        </p>
      )}

      <button className="detail-raw-toggle" onClick={() => setRaw(!raw)}>
        {raw ? "Ocultar" : "Ver"} datos crudos del pipeline
      </button>

      {raw && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </>
  );
}
