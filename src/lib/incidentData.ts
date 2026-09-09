/**
 * Traduce el diccionario `data` del motor a algo que una persona pueda leer.
 *
 * El panel de detalle mostraba un `JSON.stringify` crudo: `bbox_gap_px: 0`,
 * `iou: 0.11`, `acceleration_a: -1.95`. Son los datos correctos, pero un
 * agente de turno no tiene por qué saber que "gap 0 con un vehículo de
 * referencia de 81 px" significa que las cajas se estaban tocando, ni que
 * una aceleración negativa grande es un frenazo.
 *
 * Todo esto es puro a propósito: la interpretación es donde se equivocan
 * estas cosas, así que va aparte del componente y con tests.
 */

/** Aceleración por debajo de la cual se considera frenazo. Espejo de
 *  HARD_DECEL en incident_engine.py. */
const HARD_DECEL = -1.5;

/** Por debajo de esto, en anchos de frame por segundo, el vehículo está
 *  prácticamente quieto. */
const STOPPED_SPEED = 0.5;

export interface Fact {
  label: string;
  value: string;
  /** La lectura en cristiano, cuando el número solo no dice nada. */
  hint?: string;
  /** Resalta lo que apunta a que el incidente es real. */
  strong?: boolean;
}

function speedWord(speed: number): string {
  if (speed <= STOPPED_SPEED) return "detenido";
  if (speed < 2) return "muy lento";
  if (speed < 5) return "en marcha";
  return "rápido";
}

function accelWord(accel: number): string {
  if (accel <= HARD_DECEL) return "frenazo";
  if (accel < -0.4) return "desacelerando";
  if (accel > 0.4) return "acelerando";
  return "velocidad estable";
}

/**
 * Qué pasó DESPUÉS del contacto, que es lo que de verdad decide si hubo
 * choque.
 *
 * Va primero en la lista a propósito: dos cajas que se tocan en la imagen
 * son ambiguas —la cámara aplasta la escena contra un plano, así que
 * vehículos de carriles distintos se solapan— pero "siguieron circulando"
 * le dice al agente en un segundo que esto es casi seguro un falso
 * positivo, sin tener que mirar la foto.
 */
const AFTERMATH: Record<string, Fact> = {
  immobilized: {
    label: "Desenlace",
    value: "quedó inmovilizado",
    hint: "un vehículo se detuvo tras el contacto",
    strong: true,
  },
  kept_moving: {
    label: "Desenlace",
    value: "siguieron circulando",
    hint: "ninguno se detuvo: probablemente no hubo choque",
  },
  pending: {
    label: "Desenlace",
    value: "sin resolver",
    hint: "aún esperando a ver si alguno se detiene",
  },
};

/** TTC por debajo del cual la literatura de seguridad vial habla de un
 *  conflicto serio. Espejo de TTC_CONFLICT_S en incident_engine.py. */
const TTC_CONFLICT_S = 1.5;

/**
 * Lo que solo existe con la cámara calibrada: metros y segundos.
 *
 * Sin homografía estos campos no vienen, y la lista simplemente no los
 * incluye — los incidentes viejos y las cámaras sin calibrar siguen
 * mostrándose igual que antes.
 */
function metricFacts(data: Record<string, unknown>): Fact[] {
  const facts: Fact[] = [];

  const separation = Number(data.separation_m);

  if (Number.isFinite(separation)) {
    facts.push({
      label: "Separación real",
      value: `${separation.toFixed(1)} m`,
      hint:
        separation <= 1
          ? "prácticamente en contacto sobre la vía"
          : "medida sobre el asfalto, no en la imagen",
      strong: separation <= 1,
    });
  }

  const ttc = Number(data.ttc_s);

  if (Number.isFinite(ttc)) {
    facts.push({
      label: "Tiempo hasta el impacto",
      value: `${ttc.toFixed(1)} s`,
      hint:
        ttc <= TTC_CONFLICT_S
          ? "conflicto: habrían chocado sin reaccionar"
          : "había margen de sobra para reaccionar",
      strong: ttc <= TTC_CONFLICT_S,
    });
  }

  const closing = Number(data.closing_speed_ms);

  if (Number.isFinite(closing)) {
    facts.push({
      label: "Se cerraban a",
      value: `${Math.abs(closing).toFixed(1)} m/s`,
      hint:
        closing > 0.5
          ? "la distancia entre ellos se acortaba"
          : "no se estaban acercando",
      strong: closing > 2,
    });
  }

  return facts;
}

/** Los dos vehículos de una colisión, cada uno con su lectura. */
function collisionFacts(data: Record<string, unknown>): Fact[] {
  const facts: Fact[] = [];

  const aftermath = AFTERMATH[String(data.aftermath)];
  if (aftermath) facts.push(aftermath);

  // Cuando la cámara está calibrada, la física manda sobre la geometría de
  // la imagen: la distancia en metros y el TTC dicen si esto fue un
  // conflicto o dos vehículos circulando juntos, que en una vía urbana es
  // lo normal. Va justo después del desenlace y antes de los píxeles.
  facts.push(...metricFacts(data));

  const gap = Number(data.bbox_gap_px);
  const ref = Number(data.ref_size_px);
  const iou = Number(data.iou);

  if (Number.isFinite(gap) && Number.isFinite(ref) && ref > 0) {
    // El dato clave: la separación importa RELATIVA al tamaño del vehículo.
    // 10 px entre dos carros lejanos es contacto; entre dos cercanos, no.
    const ratio = gap / ref;

    facts.push({
      label: "Separación",
      value: gap === 0 ? "en contacto" : `${gap.toFixed(1)} px`,
      hint:
        gap === 0
          ? "las cajas se tocan"
          : `${(ratio * 100).toFixed(0)}% del tamaño del vehículo`,
      strong: ratio < 0.1,
    });
  }

  if (Number.isFinite(iou)) {
    facts.push({
      label: "Solape",
      value: `${(iou * 100).toFixed(0)}%`,
      hint: iou > 0 ? "las cajas se superponen" : "sin superposición",
      strong: iou > 0.15,
    });
  }

  for (const lado of ["a", "b"] as const) {
    const clase = data[`class_${lado}`];
    if (!clase) continue;

    const speed = Number(data[`speed_${lado}`]);
    const accel = Number(data[`acceleration_${lado}`]);

    facts.push({
      label: `Vehículo ${lado.toUpperCase()}`,
      value: String(clase),
      hint: [
        Number.isFinite(speed) ? speedWord(speed) : null,
        Number.isFinite(accel) ? accelWord(accel) : null,
      ]
        .filter(Boolean)
        .join(" · "),
      strong: Number.isFinite(accel) && accel <= HARD_DECEL,
    });
  }

  if (data.recent_crash !== undefined) {
    facts.push({
      label: "Frenazo reciente",
      value: data.recent_crash ? "sí" : "no",
      hint: data.recent_crash
        ? "hubo un cambio brusco en los frames previos"
        : "ninguno de los dos frenó de golpe",
      strong: Boolean(data.recent_crash),
    });
  }

  if (data.approaching !== undefined) {
    facts.push({
      label: "Se acercaban",
      value: data.approaching ? "sí" : "no",
      hint: data.approaching
        ? "las trayectorias convergían"
        : "no convergían al momento de la alerta",
    });
  }

  return facts;
}

/** Un vehículo detenido en la vía. */
function stoppedFacts(data: Record<string, unknown>): Fact[] {
  const facts: Fact[] = [];

  if (data.class) {
    facts.push({ label: "Vehículo", value: String(data.class) });
  }

  const still = Number(data.still_frames);
  if (Number.isFinite(still)) {
    facts.push({
      label: "Tiempo detenido",
      value: `${still} frames`,
      // A 30 fps, que es lo típico de estas cámaras.
      hint: `~${(still / 30).toFixed(1)} s sin moverse`,
      strong: still > 90,
    });
  }

  if (data.abrupt_stop !== undefined) {
    facts.push({
      label: "Parada",
      value: data.abrupt_stop ? "brusca" : "progresiva",
      hint: data.abrupt_stop
        ? "se detuvo de golpe, no frenando normal"
        : "redujo la marcha de forma normal",
      strong: Boolean(data.abrupt_stop),
    });
  }

  const peak = Number(data.peak_speed);
  if (Number.isFinite(peak)) {
    facts.push({
      label: "Venía a",
      value: speedWord(peak),
      hint: "velocidad máxima antes de detenerse",
    });
  }

  return facts;
}

/**
 * Los hechos legibles de un incidente, en el orden en que conviene leerlos.
 * Un `data` vacío o de un tipo que no conocemos devuelve lista vacía, y el
 * panel cae en mostrar los datos crudos.
 */
export function describeIncident(
  data: Record<string, unknown> | null | undefined,
): Fact[] {
  if (!data) return [];

  if (data.class_a || data.class_b) return collisionFacts(data);
  if (data.still_frames !== undefined) return stoppedFacts(data);

  return [];
}

/** Cuántas veces se volvió a detectar el mismo incidente. Más detecciones =
 *  no fue un destello de un solo frame. */
export function detectionCount(
  data: Record<string, unknown> | null | undefined,
): number | null {
  const n = Number(data?.detections);
  return Number.isFinite(n) ? n : null;
}
