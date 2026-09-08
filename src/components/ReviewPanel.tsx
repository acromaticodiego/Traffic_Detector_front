import { useEffect, useState } from "react";
import { evidenceUrl, NGROK_HEADERS } from "../lib/config";
import { incidentType } from "../lib/incidents";
import {
  availableActions,
  CONFIDENCE_OPTIONS,
  statusInfo,
  summarize,
  timeAgo,
} from "../lib/review";
import { useReview } from "../state/review";
import type { ReviewStatus, StoredIncident } from "../lib/types";
import {
  IconArchive,
  IconCheck,
  IconDiscard,
  IconRefresh,
  IconShield,
} from "./icons";

const ACTION_ICON: Record<string, JSX.Element> = {
  confirmado: <IconCheck width={14} height={14} />,
  descartado: <IconDiscard width={14} height={14} />,
  archivado: <IconArchive width={14} height={14} />,
};

const ACTION_LABEL: Record<string, string> = {
  confirmado: "Sí fue accidente",
  descartado: "No fue accidente",
  archivado: "Archivar",
};

/**
 * La imagen del incidente.
 *
 * Se pide con fetch y no con un <img src> directo porque la cabecera que
 * salta la página intersticial de ngrok no se puede poner en una etiqueta
 * img: sin eso, a través del túnel el agente ve un HTML de advertencia en
 * vez de la foto.
 */
function Evidence({ incident }: { incident: StoredIncident }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [variant, setVariant] = useState<"annotated" | "original">("annotated");

  useEffect(() => {
    if (!incident.has_evidence) return;

    let alive = true;
    let objectUrl: string | null = null;

    setUrl(null);
    setFailed(false);

    fetch(evidenceUrl(incident.id, variant), { headers: NGROK_HEADERS })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });

    return () => {
      alive = false;
      // Sin esto cada incidente abierto deja su imagen en memoria hasta que
      // se recargue la página, y un turno de revisión son cientos.
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [incident.id, incident.has_evidence, variant]);

  if (!incident.has_evidence) {
    return (
      <div className="review-noimg">
        <IconShield width={20} height={20} />
        <span>
          Sin imagen guardada. Se detectó antes de que el servicio guardara
          evidencia, o estaba apagada.
        </span>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="review-noimg">
        <IconShield width={20} height={20} />
        <span>La evidencia está registrada pero el archivo no está en disco.</span>
      </div>
    );
  }

  return (
    <div className="review-evidence">
      {url ? (
        <img src={url} alt={`Evidencia del incidente ${incident.id}`} />
      ) : (
        <div className="review-imgloading">Cargando imagen…</div>
      )}

      <div className="review-variant">
        {(["annotated", "original"] as const).map((v) => (
          <button
            key={v}
            className={variant === v ? "on" : ""}
            onClick={() => setVariant(v)}
          >
            {v === "annotated" ? "Con marcas" : "Original"}
          </button>
        ))}
      </div>
    </div>
  );
}

function Card({ incident }: { incident: StoredIncident }) {
  const openId = useReview((s) => s.openId);
  const open = useReview((s) => s.open);
  const review = useReview((s) => s.review);
  const saving = useReview((s) => s.saving);

  const [note, setNote] = useState("");

  const isOpen = openId === incident.id;
  const busy = saving === incident.id;
  const info = statusInfo(incident.review_status);
  const type = incidentType(incident.incident_type);

  async function act(status: ReviewStatus) {
    await review(incident.id, status, note.trim() || undefined);
    setNote("");
  }

  return (
    <li className={isOpen ? "open" : ""} style={{ ["--sev" as string]: info.color }}>
      <button
        className="review-head"
        onClick={() => open(isOpen ? null : incident.id)}
      >
        <div className="review-title">
          <strong>{type.label}</strong>
          <span className="meta">
            {Math.round(incident.confidence * 100)}% ·{" "}
            {timeAgo(incident.detected_at)} · cámara {incident.camera_id}
          </span>
        </div>
        <span className="review-chip" style={{ color: info.color }}>
          {info.short}
        </span>
      </button>

      {isOpen && (
        <div className="review-body">
          <Evidence incident={incident} />

          <div className="review-facts">
            <span>
              {incident.track_ids.length} vehículo
              {incident.track_ids.length === 1 ? "" : "s"} · IDs{" "}
              {incident.track_ids.join(", ")}
            </span>
            {incident.video_t != null && (
              <span>segundo {incident.video_t.toFixed(1)} del video</span>
            )}
            {incident.reviewed_at && (
              <span>
                Revisado {timeAgo(incident.reviewed_at)}
                {incident.reviewed_by ? ` por ${incident.reviewed_by}` : ""}
              </span>
            )}
            {incident.review_note && (
              <span className="review-note">«{incident.review_note}»</span>
            )}
          </div>

          <input
            className="review-input"
            placeholder="Nota (opcional): por qué lo descartas…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={busy}
          />

          <div className="review-actions">
            {availableActions(incident.review_status).map((status) => (
              <button
                key={status}
                className={`review-btn ${status}`}
                onClick={() => void act(status)}
                disabled={busy}
              >
                {ACTION_ICON[status]}
                <span>{ACTION_LABEL[status]}</span>
              </button>
            ))}
          </div>

          <p className="review-hint">
            Nada se borra: descartar lo marca como falso positivo y lo saca de
            la bandeja, pero la fila queda para medir en qué se equivoca el
            detector.
          </p>
        </div>
      )}
    </li>
  );
}

export function ReviewPanel() {
  const items = useReview((s) => s.items);
  const loading = useReview((s) => s.loading);
  const error = useReview((s) => s.error);
  const minConfidence = useReview((s) => s.minConfidence);
  const status = useReview((s) => s.status);
  const load = useReview((s) => s.load);
  const setMinConfidence = useReview((s) => s.setMinConfidence);
  const setStatus = useReview((s) => s.setStatus);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = summarize(items);

  return (
    <div className="review">
      <div className="review-bar">
        <label>
          Confianza
          <select
            value={minConfidence}
            onChange={(e) => setMinConfidence(Number(e.target.value))}
          >
            {CONFIDENCE_OPTIONS.map((c) => (
              <option key={c} value={c}>
                ≥ {Math.round(c * 100)}%
              </option>
            ))}
          </select>
        </label>

        <label>
          Estado
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ReviewStatus)}
          >
            <option value="pendiente">Sin revisar</option>
            <option value="confirmado">Confirmados</option>
            <option value="descartado">Descartados</option>
            <option value="archivado">Archivados</option>
          </select>
        </label>

        <button
          className="review-reload"
          onClick={() => void load()}
          title="Volver a consultar"
          disabled={loading}
        >
          <IconRefresh width={14} height={14} />
        </button>
      </div>

      {error && (
        <div className="review-error">
          No se pudo consultar el histórico ({error}). Si el servicio está
          arriba, revisa que Postgres esté disponible.
        </div>
      )}

      {loading && items.length === 0 && (
        <div className="empty">
          <span>Consultando el histórico…</span>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="empty">
          <IconCheck width={22} height={22} />
          <span>
            Nada por revisar con estos filtros. Baja la confianza mínima si
            esperabas ver algo.
          </span>
        </div>
      )}

      <ul className="review-list">
        {items.map((incident) => (
          <Card key={incident.id} incident={incident} />
        ))}
      </ul>

      {items.length > 0 && (
        <div className="review-foot">
          {items.length} caso{items.length === 1 ? "" : "s"}
          {counts.pendiente > 0 && status !== "pendiente"
            ? ` · ${counts.pendiente} sin revisar`
            : ""}
        </div>
      )}
    </div>
  );
}
