import type { TrafficInfo, TrafficLevel } from "../lib/types";

const STYLE: Record<TrafficLevel, { label: string; color: string; dot: string }> =
  {
    bajo: { label: "Tráfico bajo", color: "#16351f", dot: "#22c55e" },
    medio: { label: "Tráfico medio", color: "#3a3212", dot: "#eab308" },
    alto: { label: "Tráfico alto", color: "#3a1717", dot: "#ef4444" },
  };

/** Why the backend picked this level, in one line. */
function reason(t: TrafficInfo): string {
  // No occupancy means the level came from the legacy vehicle-count rule, so
  // any talk of a full road would be invented. Say where the number came from
  // instead: a silent fallback here reads as a real (wrong) measurement.
  if (typeof t.occupancy !== "number") return "por conteo · servicio antiguo";

  if (t.level === "alto") {
    return (t.stopped ?? 0) >= 0.6 ? "vía llena y detenida" : "vía llena, avance lento";
  }
  if (t.level === "medio") return "denso, pero fluye";
  return t.vehicles === 0 ? "vía libre" : "vía despejada";
}

export function TrafficBadge({ traffic }: { traffic: TrafficInfo | null }) {
  if (!traffic) return null;
  const s = STYLE[traffic.level] ?? STYLE.bajo;

  // A vision service older than the occupancy rework sends neither field;
  // degrade to the plain vehicle count instead of blanking the whole app.
  const occupancy =
    typeof traffic.occupancy === "number" ? traffic.occupancy : null;
  const meanSpeed =
    typeof traffic.mean_speed === "number" ? traffic.mean_speed : null;

  const tip =
    occupancy == null
      ? "El servicio de visión no envía ocupación: nivel calculado por conteo " +
        "de vehículos (versión anterior). Reinicia el backend."
      : `Ocupación de la calzada ${(occupancy * 100).toFixed(1)} %` +
        (meanSpeed == null
          ? ""
          : ` · velocidad media ${meanSpeed.toFixed(1)} px/frame`);

  return (
    <div className="traffic-badge" style={{ background: s.color }} title={tip}>
      <span className="traffic-dot" style={{ background: s.dot }} />
      <strong>{s.label}</strong>
      <span className="traffic-count">
        {occupancy == null ? "" : `${(occupancy * 100).toFixed(0)}% vía · `}
        {traffic.vehicles} veh
        {traffic.people > 0 ? ` · ${traffic.people} pers` : ""}
      </span>
      <span className="traffic-reason">{reason(traffic)}</span>
    </div>
  );
}
