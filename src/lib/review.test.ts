import { describe, expect, it } from "vitest";
import {
  availableActions,
  DEFAULT_MIN_CONFIDENCE,
  statusInfo,
  summarize,
  timeAgo,
} from "./review";
import type { ReviewStatus, StoredIncident } from "./types";

function incidente(
  id: number,
  review_status: ReviewStatus = "pendiente",
): StoredIncident {
  return {
    id,
    camera_id: "cam1",
    cluster_id: null,
    incident_type: "possible_collision",
    confidence: 0.85,
    video_t: 12.5,
    frame_id: 300,
    track_ids: [1, 2],
    bbox: null,
    data: {},
    detected_at: "2026-09-08T15:52:12Z",
    review_status,
    reviewed_at: null,
    reviewed_by: null,
    review_note: null,
    has_evidence: true,
    ai_summary: null,
    ai_model: null,
  };
}

describe("acciones disponibles", () => {
  it("un incidente sin revisar admite los tres veredictos", () => {
    expect(availableActions("pendiente")).toEqual([
      "confirmado",
      "descartado",
      "archivado",
    ]);
  });

  it("no ofrece repetir el veredicto que ya tiene", () => {
    // Ofrecer "descartar" sobre algo ya descartado no hace nada y confunde al
    // agente sobre si su clic anterior se guardó.
    expect(availableActions("descartado")).not.toContain("descartado");
    expect(availableActions("confirmado")).not.toContain("confirmado");
  });

  it("siempre deja una salida para deshacer un clic apurado", () => {
    // Esta es la propiedad que hace que el flujo sea seguro: desde cualquier
    // estado se puede llegar a otro, así que ninguna decisión es definitiva.
    const estados: ReviewStatus[] = [
      "pendiente",
      "confirmado",
      "descartado",
      "archivado",
    ];

    for (const estado of estados) {
      expect(availableActions(estado).length).toBeGreaterThan(0);
    }
  });
});

describe("umbral por defecto", () => {
  it("es 0.8 y no 0.9", () => {
    // Medido contra la base real: el motor no emite por encima de 0.85, así
    // que 0.9 deja la bandeja vacía y parece que el panel está roto.
    expect(DEFAULT_MIN_CONFIDENCE).toBe(0.8);
  });
});

describe("estados", () => {
  it("cada estado tiene etiqueta y color", () => {
    for (const estado of [
      "pendiente",
      "confirmado",
      "descartado",
      "archivado",
    ] as ReviewStatus[]) {
      expect(statusInfo(estado).short).toBeTruthy();
      expect(statusInfo(estado).color).toMatch(/^#/);
    }
  });

  it("un estado desconocido del servicio no rompe la lista", () => {
    // Si el backend agrega un estado nuevo, el panel viejo tiene que seguir
    // dibujando la fila en vez de caerse con "cannot read property of
    // undefined".
    expect(statusInfo("inventado" as ReviewStatus)).toBeDefined();
  });
});

describe("resumen", () => {
  it("cuenta por estado", () => {
    const items = [
      incidente(1, "pendiente"),
      incidente(2, "pendiente"),
      incidente(3, "confirmado"),
    ];

    expect(summarize(items)).toEqual({
      pendiente: 2,
      confirmado: 1,
      descartado: 0,
      archivado: 0,
    });
  });
});

describe("tiempo relativo", () => {
  const base = new Date("2026-09-08T16:00:00Z").getTime();

  it("traduce a minutos, horas y días", () => {
    expect(timeAgo("2026-09-08T15:58:00Z", base)).toBe("hace 2 min");
    expect(timeAgo("2026-09-08T13:00:00Z", base)).toBe("hace 3 h");
    expect(timeAgo("2026-09-06T16:00:00Z", base)).toBe("hace 2 d");
  });

  it("una fecha inválida no imprime 'NaN'", () => {
    expect(timeAgo("no es una fecha", base)).toBe("—");
  });
});
