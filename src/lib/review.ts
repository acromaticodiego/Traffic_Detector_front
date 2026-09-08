/**
 * Metadatos del flujo de revisión de incidentes.
 *
 * El detector propone y una persona dispone: cada incidente guardado es una
 * hipótesis con una confianza, y un agente decide si fue real. Esto es solo
 * la parte sin React ni red del asunto —etiquetas, colores, umbrales— para
 * poder probarla sin montar el panel.
 */

import { MUSTARD, STEEL, TERRACOTTA_BRIGHT, TEXT_MUTE } from "./palette";
import type { ReviewStatus, StoredIncident } from "./types";

export interface StatusInfo {
  label: string;
  /** Lo que el agente ve en el chip del incidente ya revisado. */
  short: string;
  color: string;
}

export const STATUS: Record<ReviewStatus, StatusInfo> = {
  pendiente: { label: "Sin revisar", short: "Pendiente", color: MUSTARD },
  confirmado: {
    label: "Accidente confirmado",
    short: "Confirmado",
    color: TERRACOTTA_BRIGHT,
  },
  // Un caso descartado se apaga: sigue ahí para las métricas, pero deja de
  // pedir la atención del agente.
  descartado: { label: "No fue un accidente", short: "Descartado", color: TEXT_MUTE },
  archivado: { label: "Caso archivado", short: "Archivado", color: STEEL },
};

export function statusInfo(status: ReviewStatus): StatusInfo {
  return STATUS[status] ?? STATUS.pendiente;
}

/**
 * Umbral de confianza por defecto de la bandeja.
 *
 * 0.8 y no 0.9 por un motivo medido, no por gusto: el motor no emite por
 * encima de 0.85 en la práctica, así que una bandeja filtrada en 0.9 le
 * abre al agente una lista vacía y parece rota. 0.8 es además el valor a
 * partir del cual el resto de la interfaz ya trata un incidente como
 * "Confirmado" (ver ALERT_CONFIDENCE en incidents.ts).
 */
export const DEFAULT_MIN_CONFIDENCE = 0.8;

/** Lo que ofrece el selector del panel. */
export const CONFIDENCE_OPTIONS = [0.7, 0.8, 0.9, 0.95] as const;

/**
 * Qué acciones tienen sentido sobre un incidente según cómo esté.
 *
 * Un incidente ya descartado no se vuelve a descartar; uno ya confirmado sí
 * se puede archivar (el caso se cierra) y también corregir a descartado, que
 * es como se deshace un clic apurado.
 */
export function availableActions(status: ReviewStatus): ReviewStatus[] {
  switch (status) {
    case "pendiente":
      return ["confirmado", "descartado", "archivado"];
    case "confirmado":
      return ["descartado", "archivado"];
    case "descartado":
      return ["confirmado"];
    case "archivado":
      return ["confirmado", "descartado"];
    default:
      return ["confirmado", "descartado", "archivado"];
  }
}

/** "hace 3 min", "hace 2 h". El agente trabaja sobre lo reciente. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();

  if (Number.isNaN(then)) return "—";

  const seconds = Math.max(0, Math.round((now - then) / 1000));

  if (seconds < 60) return "hace segundos";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

/**
 * Resumen de la bandeja: cuántos quedan por revisar y cuántos ya se vieron.
 * Es lo que le dice al agente si va ganando o perdiendo.
 */
export function summarize(items: StoredIncident[]): Record<ReviewStatus, number> {
  const counts: Record<ReviewStatus, number> = {
    pendiente: 0,
    confirmado: 0,
    descartado: 0,
    archivado: 0,
  };

  for (const item of items) {
    if (item.review_status in counts) counts[item.review_status] += 1;
  }

  return counts;
}
