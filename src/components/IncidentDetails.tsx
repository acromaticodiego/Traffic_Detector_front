import type { ReactNode } from "react";
import { useStore } from "../state/store";
import { incidentType, severity } from "../lib/incidents";
import { IconAlert } from "./icons";

export function IncidentDetails() {
  const incident = useStore((s) =>
    s.incidents.find((i) => i.id === s.selectedIncidentId),
  );

  if (!incident) {
    return (
      <div className="empty">
        <IconAlert width={22} height={22} />
        <span>Selecciona un incidente de la lista</span>
      </div>
    );
  }

  const sev = severity(incident.confidence);

  const rows: [string, ReactNode][] = [
    [
      "Tipo",
      <span className="chip">
        {incidentType(incident.incident_type).label}
      </span>,
    ],
    [
      "Estado",
      <span className="chip" style={{ color: sev.color }}>
        {sev.label}
      </span>,
    ],
    ["Confianza", `${(incident.confidence * 100).toFixed(0)}%`],
    ["Instante", incident.t != null ? `${incident.t.toFixed(2)} s` : "—"],
    ["Objetos", incident.track_ids.join(", ")],
    ["Frame", String(incident.frame_id)],
  ];

  return (
    <>
      <div className="detail-grid">
        {rows.map(([k, v]) => (
          <div key={k}>
            <div className="k">{k}</div>
            <div className="v">{v}</div>
          </div>
        ))}
      </div>

      <h3>Análisis del pipeline</h3>
      <pre>{JSON.stringify(incident.data, null, 2)}</pre>
    </>
  );
}
