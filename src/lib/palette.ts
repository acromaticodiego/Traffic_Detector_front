/**
 * Paleta del sistema. Fuente única de verdad.
 *
 * Los mismos valores viven como variables CSS en `styles.css` para la
 * interfaz; aquí están en hex porque el canvas del overlay dibuja con
 * `ctx.strokeStyle` y no puede leer variables CSS sin un `getComputedStyle`
 * por frame. Si cambia uno, cambian los dos.
 *
 * ── La idea ────────────────────────────────────────────────────────────
 *
 * Tres familias, y cada una significa algo. El color no decora: informa.
 *
 *   AZUL MARINO   estructura y normalidad. El mapa, los paneles y el
 *                 cromo de la interfaz. Ocupa el 95 % de la pantalla, así
 *                 que cualquier cosa cálida salta sola sin necesidad de
 *                 parpadeos ni tamaños grandes.
 *
 *   MOSTAZA       precaución. Incidentes aún por confirmar y estados que
 *                 piden atención sin ser una alarma.
 *
 *   TERRACOTA     alarma. Un incidente confirmado y nada más. Es el único
 *                 color cálido saturado de la INTERFAZ, y por eso funciona:
 *                 si se usara también para decorar dejaría de leerse como
 *                 urgencia.
 *
 * En la interfaz no hay verde: el "todo va bien" lo comunica el azul acero,
 * que es analógico al marino del fondo, y un verde saturado abriría una
 * cuarta familia de color para decir algo que la ausencia de calidez ya
 * dice.
 *
 * ── La excepción ───────────────────────────────────────────────────────
 *
 * Las cajas del overlay NO siguen estas tres familias, y es deliberado:
 * ahí el color no acompaña a la información, el color ES la información.
 * Ver CLASS_COLOR más abajo.
 */

// ── Azul marino: estructura ──────────────────────────────────────────────

export const NAVY = {
  abyss: "#04121F",
  base: "#071B2C",
  surface: "#0B2438",
  raised: "#123047",
  high: "#1A3E59",
  line: "#24506F",
} as const;

/** Azul acero: interacción, foco y "normal". Un tinte del marino, no un
 *  color nuevo. */
export const STEEL = "#5E90B8";
export const STEEL_DIM = "#3E6C90";

// ── Acentos ──────────────────────────────────────────────────────────────

export const TERRACOTTA = "#C4603F";
export const TERRACOTTA_BRIGHT = "#D9714E";

export const MUSTARD = "#D5A03C";
export const MUSTARD_BRIGHT = "#E6B451";

// ── Texto ────────────────────────────────────────────────────────────────

export const TEXT = "#EAF1F7";
export const TEXT_DIM = "#A6BCCE";
export const TEXT_MUTE = "#66849B";

/**
 * Color por clase detectada, para las cajas del overlay.
 *
 * Esto se sale de las tres familias a propósito, y la razón es que el
 * overlay tiene un trabajo distinto al resto de la interfaz: aquí el color
 * es el ÚNICO dato que dice qué es cada caja. Agruparlas por riesgo se
 * probó y no sirve —todas las cajas quedan del mismo tono y hay que leer
 * la etiqueta una por una para saber si es un carro o un peatón—, así que
 * cada clase necesita su hue.
 *
 * Las restricciones son tres:
 *
 *   1. Nada azul ni blanco: el fondo es azul marino y el video de la vía
 *      está lleno de grises y blancos (asfalto, líneas, carros claros).
 *      Una caja azul o blanca desaparece sobre los dos.
 *   2. Ningún tono entre el rojo y el naranja quemado, que es donde vive
 *      la terracota de los incidentes. Si un camión se pinta del color de
 *      un choque, la alarma deja de significar alarma.
 *   3. Separados entre sí en tono, no solo en luminosidad, para que se
 *      distingan de un vistazo y a media escala.
 */
export const CLASS_COLOR = {
  car: "#F5C242", // ámbar
  motorcycle: "#FF8A3D", // naranja
  truck: "#E85DA8", // magenta
  bus: "#C77DFF", // lila
  pedestrian: "#5FE08A", // verde
  ciclist: "#3FD9C7", // turquesa
  monopatin: "#D6E04A", // lima
} as const;

/** Una clase que el modelo aprenda mañana y esta tabla no conozca. */
export const CLASS_FALLBACK = "#E8E0C8";

/** El incidente. Terracota, y solo el incidente. */
export const INCIDENT = TERRACOTTA_BRIGHT;
