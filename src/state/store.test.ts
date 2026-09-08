import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "./store";
import { useLogs } from "./logs";
import type { FrameResult, Incident } from "../lib/types";

function frame(frame_id: number): FrameResult {
  return { frame_id, t: frame_id / 30, tracks: [], incidents: [], traffic: null };
}

function incident(over: Partial<Incident> = {}): Incident {
  return {
    incident_type: "possible_collision",
    track_ids: [1, 2],
    confidence: 0.9,
    bbox: null,
    data: {},
    t: 1,
    ...over,
  };
}

beforeEach(() => {
  useStore.getState().reset();
  useLogs.getState().clear();
});

describe("addFrame / frameAt", () => {
  it("devuelve el frame anterior más cercano cuando no hay uno exacto", () => {
    const { addFrame } = useStore.getState();
    [0, 3, 6, 9].forEach((id) => addFrame(frame(id)));

    expect(useStore.getState().frameAt(7)?.frame_id).toBe(6);
    expect(useStore.getState().frameAt(6)?.frame_id).toBe(6);
    expect(useStore.getState().frameAt(100)?.frame_id).toBe(9);
  });

  it("no se queda sin overlay si el video va por delante del primer frame", () => {
    useStore.getState().addFrame(frame(10));
    expect(useStore.getState().frameAt(2)?.frame_id).toBe(10);
  });

  it("mantiene frameIds ordenado aunque lleguen desordenados", () => {
    const { addFrame } = useStore.getState();
    [5, 1, 9, 1, 3].forEach((id) => addFrame(frame(id)));

    expect(useStore.getState().frameIds).toEqual([1, 3, 5, 9]);
    expect(useStore.getState().lastFrameId).toBe(9);
  });

  it("sin frames no hay overlay que dibujar", () => {
    expect(useStore.getState().frameAt(0)).toBeNull();
  });
});

describe("addIncident", () => {
  it("fusiona repeticiones del mismo incidente en vez de duplicarlas", () => {
    const { addIncident } = useStore.getState();
    addIncident(incident({ incident_id: "abc", confidence: 0.6 }), 10);
    addIncident(incident({ incident_id: "abc", confidence: 0.95 }), 40);

    const { incidents } = useStore.getState();
    expect(incidents).toHaveLength(1);
    expect(incidents[0].confidence).toBe(0.95);
    // El primer avistamiento es el que marca el momento del incidente.
    expect(incidents[0].frame_id).toBe(10);
  });

  it("registra una sola línea de log por incidente real", () => {
    const { addIncident } = useStore.getState();
    addIncident(incident({ incident_id: "abc" }), 10);
    addIncident(incident({ incident_id: "abc" }), 11);

    const lines = useLogs
      .getState()
      .entries.filter((e) => e.kind === "incidente");
    expect(lines).toHaveLength(1);
  });

  it("sin incident_id, sintetiza uno estable por tipo/tracks/frame", () => {
    useStore.getState().addIncident(incident({ incident_id: null }), 10);
    expect(useStore.getState().incidents[0].id).toBe(
      "possible_collision:1-2:10",
    );
  });
});

describe("noteTrackActivity", () => {
  it("marca el último frame donde se vio alguno de los tracks", () => {
    const { addIncident, noteTrackActivity } = useStore.getState();
    addIncident(incident({ incident_id: "abc", track_ids: [7, 8] }), 10);

    noteTrackActivity(20, [8, 99]);
    expect(useStore.getState().incidentActivity.get("abc")).toBe(20);

    noteTrackActivity(30, [99]);
    expect(useStore.getState().incidentActivity.get("abc")).toBe(20);
  });
});
