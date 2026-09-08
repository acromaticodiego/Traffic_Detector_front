import { useStore } from "../state/store";
import { incidentType, severity } from "../lib/incidents";
import { IconSiren } from "./icons";

function fmtTime(t: number | null): string {
  if (t == null) return "—";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function IncidentList() {
  const incidents = useStore((s) => s.incidents);
  const selectedId = useStore((s) => s.selectedIncidentId);
  const select = useStore((s) => s.selectIncident);

  if (incidents.length === 0) {
    return (
      <div className="empty">
        <IconSiren width={22} height={22} />
        <span>Sin incidentes detectados todavía</span>
      </div>
    );
  }

  return (
    <ul className="incident-list">
      {incidents.map((inc) => {
        const conf = Math.round(inc.confidence * 100);
        const sev = severity(inc.confidence);
        return (
          <li
            key={inc.id}
            className={inc.id === selectedId ? "active" : ""}
            style={{ ["--sev" as string]: sev.color }}
            onClick={() => select(inc.id === selectedId ? null : inc.id)}
          >
            <IconSiren className="incident-ico" width={16} height={16} />
            <div className="incident-row">
              <strong>{incidentType(inc.incident_type).label}</strong>
              <span className="meta">
                {sev.label} · {conf}% · {fmtTime(inc.t)}
              </span>
              <span className="meta">
                {inc.track_ids.length} objeto
                {inc.track_ids.length === 1 ? "" : "s"} · IDs{" "}
                {inc.track_ids.join(", ")}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
