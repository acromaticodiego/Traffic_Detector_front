import { useAuth } from "../state/auth";
import { useReview } from "../state/review";
import { IconAI, IconRefresh } from "./icons";

export function CaseAnalysis() {
  const openId = useReview((s) => s.openId);
  const incident = useReview((s) => s.items.find((i) => i.id === s.openId));

  const summarize = useReview((s) => s.summarize);
  const summarizing = useReview((s) => s.summarizing);
  const summaryError = useReview((s) => s.summaryError);
  const puedeResumir = useAuth((s) => s.can("incidents:summarize"));

  if (!incident || openId == null) {
    return (
      <div className="empty">
        <IconAI width={22} height={22} />
        <span>
          Abre un caso en el Gestor de incidentes y aquí aparece su lectura
        </span>
      </div>
    );
  }

  const busy = summarizing === incident.id;

  return (
    <div className="detail">
      <section className="detail-ai">
        <h3>
          <IconAI width={14} height={14} />
          <span>Lectura del caso #{incident.id}</span>
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
        ) : !puedeResumir ? (
          <p className="detail-disclaimer">
            Aún no se ha analizado este caso. Generarlo requiere el rol de
            analista o administrador.
          </p>
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
