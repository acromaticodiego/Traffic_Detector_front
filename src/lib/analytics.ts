/**
 * Tipos y formatos del dashboard.
 *
 * La parte sin React ni red, para poder probarla sola: convertir segundos en
 * algo legible y decidir cómo se cuenta la validez son justo las cosas que se
 * rompen en silencio y que nadie mira hasta que el número parece raro.
 */

export interface Bloque {
  active_seconds: number;
  gap_seconds: number;
  gap_count: number;
  shifts: number;
  reviewed: number;
  confirmed: number;
  discarded: number;
  archived: number;
  /** null mientras no haya emitido ningún veredicto. */
  accuracy: number | null;
}

export interface Turno {
  started_at: string;
  last_seen_at: string;
  active_seconds: number;
  gap_count: number;
  gap_seconds: number;
}

export interface DiaSerie {
  date: string;
  active_seconds: number;
  reviewed: number;
}

export interface RegistroRevisado {
  id: number;
  camera_id: string;
  incident_type: string;
  confidence: number;
  review_status: string;
  review_note: string | null;
  reviewed_at: string | null;
  detected_at: string;
}

export interface PerfilAnalitica {
  id: number;
  email: string;
  full_name: string;
  role: string;
  active: boolean;
}

export interface Analitica {
  generated_at: string;
  timezone: string;
  user: PerfilAnalitica;
  shift: Turno | null;
  today: Bloque;
  week: Bloque;
  total: Bloque;
  series: DiaSerie[];
  recent: RegistroRevisado[];
}

export interface FilaEquipo {
  user: PerfilAnalitica;
  on_shift: boolean;
  shift: Turno | null;
  today: Bloque;
}

/**
 * Segundos como los diría una persona.
 *
 * Sin segundos por encima del minuto: en un turno nadie mira los segundos, y
 * mostrarlos sugiere una precisión que la medición por latidos no tiene.
 */
export function duracion(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos <= 0) return "0 min";

  const horas = Math.floor(segundos / 3600);
  const minutos = Math.round((segundos % 3600) / 60);

  // 59 min 60 s no existe: redondear hacia arriba tiene que subir la hora.
  if (minutos === 60) return `${horas + 1} h`;

  if (horas === 0) return `${minutos} min`;
  if (minutos === 0) return `${horas} h`;

  return `${horas} h ${minutos} min`;
}

/** El porcentaje, o un guion cuando todavía no hay nada que promediar. */
export function porcentaje(valor: number | null): string {
  return valor === null ? "—" : `${Math.round(valor * 100)}%`;
}

/** El día de la serie, corto, para el eje. */
export function etiquetaDia(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

/**
 * Cuánto lleva abierto el turno vigente.
 *
 * Se cuenta desde el servidor y se le suma lo transcurrido desde el último
 * latido, para que el contador avance en pantalla en vez de saltar de minuto
 * en minuto. Se acota a la propia tolerancia porque el servidor tampoco
 * acreditaría más que eso.
 */
export function turnoEnCurso(turno: Turno, ahora: number, toleranciaS = 600): number {
  const desdeElUltimo = (ahora - Date.parse(turno.last_seen_at)) / 1000;

  return turno.active_seconds + Math.min(Math.max(desdeElUltimo, 0), toleranciaS);
}
