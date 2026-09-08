/** Display metadata for incident types emitted by the vision service. */

import { MUSTARD, STEEL, TERRACOTTA_BRIGHT } from "./palette";

export interface IncidentTypeInfo {
  label: string;
  color: string;
}

const TYPES: Record<string, IncidentTypeInfo> = {
  possible_collision: { label: "Posible colisión", color: TERRACOTTA_BRIGHT },
  vehiculo_detenido: { label: "Vehículo detenido", color: MUSTARD },
};

const FALLBACK: IncidentTypeInfo = {
  label: "Incidente",
  color: MUSTARD,
};

export function incidentType(type: string): IncidentTypeInfo {
  return TYPES[type] ?? { ...FALLBACK, label: type.replace(/_/g, " ") };
}

/** Confidence at/above which an incident is treated as confirmed. */
export const ALERT_CONFIDENCE = 0.8;

/** Marcador en el video: no se dibuja por debajo de este valor. */
export const MARKER_MIN_CONFIDENCE = 0.9;

/** A/desde este valor el marcador se queda fijo; por debajo, caduca 2 s
 *  después de que sus objetos dejan de detectarse. */
export const MARKER_STICKY_CONFIDENCE = 0.95;

export interface Severity {
  key: "confirmed" | "pending" | "low";
  label: string;
  color: string;
}

// hex (not CSS vars) so the canvas overlay can use these directly
export function severity(confidence: number): Severity {
  if (confidence >= ALERT_CONFIDENCE)
    return { key: "confirmed", label: "Confirmado", color: TERRACOTTA_BRIGHT };
  if (confidence >= 0.5)
    return { key: "pending", label: "Por confirmar", color: MUSTARD };
  // Acero y no verde: la ausencia de color cálido ya dice "esto no urge",
  // y un verde saturado abriría una cuarta familia de color para repetirlo.
  return { key: "low", label: "Baja confianza", color: STEEL };
}

/** Severity accent from confidence, used for the list bar / dot / marker. */
export function severityColor(confidence: number): string {
  return severity(confidence).color;
}
