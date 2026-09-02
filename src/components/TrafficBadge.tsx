import type { TrafficInfo, TrafficLevel } from "../lib/types";

const STYLE: Record<TrafficLevel, { label: string; color: string; dot: string }> =
  {
    bajo: { label: "Tráfico bajo", color: "#16351f", dot: "#22c55e" },
    medio: { label: "Tráfico medio", color: "#3a3212", dot: "#eab308" },
    alto: { label: "Tráfico alto", color: "#3a1717", dot: "#ef4444" },
  };

export function TrafficBadge({ traffic }: { traffic: TrafficInfo | null }) {
  if (!traffic) return null;
  const s = STYLE[traffic.level];

  return (
    <div className="traffic-badge" style={{ background: s.color }}>
      <span className="traffic-dot" style={{ background: s.dot }} />
      <strong>{s.label}</strong>
      <span className="traffic-count">
        {traffic.vehicles} veh
        {traffic.people > 0 ? ` · ${traffic.people} pers` : ""}
      </span>
    </div>
  );
}
