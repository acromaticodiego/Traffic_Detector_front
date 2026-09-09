import { describe, expect, it } from "vitest";
import { describeIncident, detectionCount } from "./incidentData";

/** Payload real de la tabla `incidents`, copiado tal cual. */
const COLISION = {
  iou: 0.11,
  class_a: "car",
  class_b: "car",
  speed_a: 5.13,
  speed_b: 0.06,
  involved: [294, 297],
  severity: "pending",
  detections: 1,
  last_frame: 1184,
  approaching: false,
  bbox_gap_px: 0.0,
  distance_px: 60.76,
  first_frame: 1184,
  ref_size_px: 81.6,
  recent_crash: true,
  acceleration_a: -1.95,
  acceleration_b: 0.06,
};

const DETENIDO = {
  class: "truck",
  still_frames: 120,
  abrupt_stop: true,
  peak_speed: 6.2,
  detections: 4,
};

function fact(data: Record<string, unknown>, label: string) {
  return describeIncident(data).find((f) => f.label === label);
}

describe("colisión", () => {
  it("traduce una separación de 0 px a 'en contacto'", () => {
    // "bbox_gap_px: 0" no le dice nada a un agente de turno; que las cajas
    // se toquen, sí.
    expect(fact(COLISION, "Separación")?.value).toBe("en contacto");
  });

  it("mide la separación contra el tamaño del vehículo, no en absoluto", () => {
    // 10 px entre dos vehículos lejanos es contacto; entre dos cercanos no.
    // Sin relativizar, el mismo número significaría cosas opuestas.
    const lejos = fact({ ...COLISION, bbox_gap_px: 10, ref_size_px: 40 }, "Separación");
    const cerca = fact({ ...COLISION, bbox_gap_px: 10, ref_size_px: 400 }, "Separación");

    expect(lejos?.strong).toBe(false);
    expect(cerca?.strong).toBe(true);
  });

  it("lee una aceleración muy negativa como frenazo", () => {
    expect(fact(COLISION, "Vehículo A")?.hint).toContain("frenazo");
  });

  it("no llama frenazo a una desaceleración suave", () => {
    const suave = fact({ ...COLISION, acceleration_a: -0.6 }, "Vehículo A");

    expect(suave?.hint).toContain("desacelerando");
    expect(suave?.hint).not.toContain("frenazo");
  });

  it("un vehículo casi parado se describe como detenido", () => {
    expect(fact(COLISION, "Vehículo B")?.hint).toContain("detenido");
  });

  it("resalta lo que sostiene la alerta", () => {
    // Contacto entre cajas y frenazo son las dos señales que hacen que el
    // motor emita: tienen que llegar marcadas al agente.
    const marcados = describeIncident(COLISION)
      .filter((f) => f.strong)
      .map((f) => f.label);

    expect(marcados).toContain("Separación");
    expect(marcados).toContain("Frenazo reciente");
  });
});

describe("desenlace", () => {
  it("marca como fuerte que un vehículo quedara inmovilizado", () => {
    const f = fact({ ...COLISION, aftermath: "immobilized" }, "Desenlace");

    expect(f?.value).toBe("quedó inmovilizado");
    expect(f?.strong).toBe(true);
  });

  it("avisa cuando los dos siguieron circulando", () => {
    // Es el falso positivo típico y el agente tiene que verlo sin abrir la
    // foto: la caja que se solapa era de otro carril.
    const f = fact({ ...COLISION, aftermath: "kept_moving" }, "Desenlace");

    expect(f?.hint).toContain("probablemente no hubo choque");
    expect(f?.strong).toBeFalsy();
  });

  it("va de primero, antes que la geometría", () => {
    const labels = describeIncident({
      ...COLISION,
      aftermath: "kept_moving",
    }).map((f) => f.label);

    expect(labels[0]).toBe("Desenlace");
  });

  it("un incidente viejo sin desenlace no rompe nada", () => {
    // Los que ya estaban guardados antes de este cambio no traen el campo.
    expect(fact(COLISION, "Desenlace")).toBeUndefined();
    expect(describeIncident(COLISION).length).toBeGreaterThan(0);
  });
});

describe("métricas físicas (cámara calibrada)", () => {
  const METRICO = {
    ...COLISION,
    separation_m: 0.8,
    closing_speed_ms: 3.2,
    ttc_s: 0.9,
  };

  it("muestra la separación real sobre el asfalto", () => {
    const f = fact(METRICO, "Separación real");

    expect(f?.value).toBe("0.8 m");
    expect(f?.strong).toBe(true);
  });

  it("marca como conflicto un TTC por debajo de 1,5 s", () => {
    const f = fact(METRICO, "Tiempo hasta el impacto");

    expect(f?.hint).toContain("habrían chocado");
    expect(f?.strong).toBe(true);
  });

  it("no marca como conflicto un TTC holgado", () => {
    const f = fact({ ...METRICO, ttc_s: 4.0 }, "Tiempo hasta el impacto");

    expect(f?.hint).toContain("margen de sobra");
    expect(f?.strong).toBeFalsy();
  });

  it("avisa cuando no se estaban acercando", () => {
    // El falso positivo dominante: van juntos pero sin cerrarse.
    const f = fact({ ...METRICO, closing_speed_ms: 0.1 }, "Se cerraban a");

    expect(f?.hint).toContain("no se estaban acercando");
  });

  it("una cámara sin calibrar no muestra nada de esto", () => {
    // Los incidentes viejos y las cámaras sin homografía siguen igual.
    expect(fact(COLISION, "Separación real")).toBeUndefined();
    expect(fact(COLISION, "Tiempo hasta el impacto")).toBeUndefined();
    expect(describeIncident(COLISION).length).toBeGreaterThan(0);
  });
});

describe("vehículo detenido", () => {
  it("convierte los frames a segundos", () => {
    expect(fact(DETENIDO, "Tiempo detenido")?.hint).toBe("~4.0 s sin moverse");
  });

  it("distingue una parada brusca de una progresiva", () => {
    expect(fact(DETENIDO, "Parada")?.value).toBe("brusca");
    expect(fact({ ...DETENIDO, abrupt_stop: false }, "Parada")?.value).toBe(
      "progresiva",
    );
  });
});

describe("robustez", () => {
  it("un data vacío no rompe el panel", () => {
    expect(describeIncident({})).toEqual([]);
    expect(describeIncident(null)).toEqual([]);
    expect(describeIncident(undefined)).toEqual([]);
  });

  it("un tipo de incidente que no conocemos devuelve lista vacía", () => {
    // Cuando el motor emita un tipo nuevo, el panel cae en mostrar los datos
    // crudos en vez de dibujar campos inventados.
    expect(describeIncident({ algo_nuevo: 1 })).toEqual([]);
  });

  it("un campo faltante se omite en vez de imprimir NaN", () => {
    const sinAceleracion = { ...COLISION, acceleration_a: undefined };

    expect(fact(sinAceleracion, "Vehículo A")?.hint).not.toContain("NaN");
  });
});

describe("conteo de detecciones", () => {
  it("lo lee cuando está", () => {
    expect(detectionCount(DETENIDO)).toBe(4);
  });

  it("devuelve null cuando no está, para no imprimir 'null frames'", () => {
    expect(detectionCount({})).toBeNull();
  });
});
