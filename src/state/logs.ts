import { create } from "zustand";

export type LogKind = "sistema" | "video" | "incidente" | "trafico";

/** Visual weight, not the incident's own severity. */
export type LogLevel = "info" | "ok" | "warn" | "alert";

export interface LogEntry {
  id: number;
  /** wall clock when the line was written */
  at: number;
  /** position in the video the line refers to, in seconds */
  t?: number | null;
  kind: LogKind;
  level: LogLevel;
  text: string;
  /** secondary line, e.g. the numbers behind the event */
  detail?: string;
}

/** Enough to cover a full run without letting a long session grow forever. */
const MAX_ENTRIES = 500;

interface LogsStore {
  entries: LogEntry[];
  /** entries added while the drawer was closed */
  unseen: number;
  open: boolean;

  log: (e: Omit<LogEntry, "id" | "at">) => void;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  clear: () => void;
}

let nextId = 1;

export const useLogs = create<LogsStore>((set) => ({
  entries: [],
  unseen: 0,
  open: false,

  // Newest first: the interesting line is the one that just happened, and
  // that way the list needs no scroll juggling to stay useful.
  log: (e) =>
    set((s) => ({
      entries: [{ ...e, id: nextId++, at: Date.now() }, ...s.entries].slice(
        0,
        MAX_ENTRIES,
      ),
      unseen: s.open ? 0 : s.unseen + 1,
    })),

  setOpen: (open) => set((s) => ({ open, unseen: open ? 0 : s.unseen })),

  toggle: () => set((s) => ({ open: !s.open, unseen: s.open ? s.unseen : 0 })),

  clear: () => set({ entries: [], unseen: 0 }),
}));

/** Shorthand so call sites read as one line. */
export function log(e: Omit<LogEntry, "id" | "at">): void {
  useLogs.getState().log(e);
}
