import { create } from "zustand";
import {
  ALERT_CONFIDENCE,
  incidentType,
  severity,
  MARKER_STICKY_CONFIDENCE,
} from "../lib/incidents";
import { log } from "./logs";
import type {
  FrameResult,
  Incident,
  MetaMessage,
  SocketStatus,
} from "../lib/types";

interface StoredIncident extends Incident {
  id: string;
  frame_id: number;
}

interface AppState {
  status: SocketStatus;
  error: string | null;
  meta: MetaMessage | null;

  /** frame_id -> result, for time-synced overlay lookup */
  frames: Map<number, FrameResult>;
  frameIds: number[]; // sorted, for nearest-lookup
  lastFrameId: number;
  processed: number;

  incidents: StoredIncident[];
  selectedIncidentId: string | null;

  /** incident id -> last frame_id where one of its tracks was present */
  incidentActivity: Map<string, number>;

  setStatus: (s: SocketStatus, error?: string | null) => void;
  setMeta: (m: MetaMessage) => void;
  addFrame: (f: FrameResult) => void;
  addIncident: (i: Incident, frameId: number) => void;
  noteTrackActivity: (frameId: number, trackIds: number[]) => void;
  selectIncident: (id: string | null) => void;
  reset: () => void;

  /** result at or just before the given frame id */
  frameAt: (frameId: number) => FrameResult | null;
}

function insertSorted(arr: number[], value: number): number[] {
  if (arr.length === 0 || value > arr[arr.length - 1]) {
    arr.push(value);
    return arr;
  }
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  if (arr[lo] !== value) arr.splice(lo, 0, value);
  return arr;
}

export const useStore = create<AppState>((set, get) => ({
  status: "idle",
  error: null,
  meta: null,
  frames: new Map(),
  frameIds: [],
  lastFrameId: 0,
  processed: 0,
  incidents: [],
  selectedIncidentId: null,
  incidentActivity: new Map(),

  setStatus: (status, error = null) => set({ status, error }),

  setMeta: (meta) => set({ meta }),

  addFrame: (f) =>
    set((state) => {
      state.frames.set(f.frame_id, f);
      insertSorted(state.frameIds, f.frame_id);
      return {
        frames: state.frames,
        frameIds: state.frameIds,
        lastFrameId: Math.max(state.lastFrameId, f.frame_id),
        processed: state.processed + 1,
      };
    }),

  addIncident: (i, frameId) =>
    set((state) => {
      // stable id from the backend cluster, or a synthetic fallback
      const id =
        i.incident_id ??
        `${i.incident_type}:${i.track_ids.join("-")}:${frameId}`;

      const existingIdx = state.incidents.findIndex((x) => x.id === id);

      if (existingIdx >= 0) {
        // upsert: overlapping detections of the same event -> merge in place
        const prev = state.incidents[existingIdx];
        const merged = {
          ...prev,
          ...i,
          id,
          frame_id: prev.frame_id, // keep the first sighting's frame/time
          t: prev.t ?? i.t,
        };
        const next = state.incidents.slice();
        next[existingIdx] = merged;
        return { incidents: next };
      }

      // Only first sightings reach here; the upsert above swallows repeats,
      // so the log gets one line per real incident instead of one per frame.
      const info = incidentType(i.incident_type);
      log({
        kind: "incidente",
        level:
          i.confidence >= MARKER_STICKY_CONFIDENCE
            ? "alert"
            : i.confidence >= ALERT_CONFIDENCE
              ? "warn"
              : "info",
        t: i.t,
        text: `${info.label} · ${severity(i.confidence).label}`,
        detail:
          `confianza ${(i.confidence * 100).toFixed(0)} % · ` +
          `${i.track_ids.length === 1 ? "objeto" : "objetos"} ` +
          i.track_ids.map((n) => `#${n}`).join(", "),
      });

      return {
        incidents: [{ ...i, id, frame_id: frameId }, ...state.incidents],
      };
    }),

  noteTrackActivity: (frameId, trackIds) =>
    set((state) => {
      if (trackIds.length === 0 || state.incidents.length === 0) return state;
      const present = new Set(trackIds);
      for (const inc of state.incidents) {
        if (inc.track_ids.some((id) => present.has(id))) {
          state.incidentActivity.set(inc.id, frameId);
        }
      }
      return { incidentActivity: state.incidentActivity };
    }),

  selectIncident: (selectedIncidentId) => set({ selectedIncidentId }),

  reset: () =>
    set({
      status: "idle",
      error: null,
      meta: null,
      frames: new Map(),
      frameIds: [],
      lastFrameId: 0,
      processed: 0,
      incidents: [],
      selectedIncidentId: null,
      incidentActivity: new Map(),
    }),

  frameAt: (frameId) => {
    const { frames, frameIds } = get();
    if (frameIds.length === 0) return null;

    // binary search for greatest id <= frameId
    let lo = 0;
    let hi = frameIds.length - 1;
    let best = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (frameIds[mid] <= frameId) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    const key = best >= 0 ? frameIds[best] : frameIds[0];
    return frames.get(key) ?? null;
  },
}));

export type { StoredIncident };

// dev-only: expose the store for quick console debugging
if (import.meta.env.DEV) {
  (window as unknown as { __store?: typeof useStore }).__store = useStore;
}
