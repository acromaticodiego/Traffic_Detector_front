import { create } from "zustand";
import { CAMERAS_URL } from "../lib/config";
import { apiHeaders } from "../lib/session";
import type { CameraInfo } from "../lib/types";

interface CamerasStore {
  list: CameraInfo[];
  /** null until the registry loads; then the remembered or first camera. */
  selectedId: string | null;
  loading: boolean;
  error: string | null;

  load: () => Promise<void>;
  select: (id: string) => void;
  current: () => CameraInfo | null;
}

/** Remembering the choice per browser avoids landing on camera #1 every
 *  reload when an operator watches a specific intersection. */
const STORAGE_KEY = "td-camera";

function remembered(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function remember(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* private mode / blocked storage: the choice just does not persist */
  }
}

export const useCameras = create<CamerasStore>((set, get) => ({
  list: [],
  selectedId: null,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });

    try {
      const res = await fetch(CAMERAS_URL, { headers: apiHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const list = (await res.json()) as CameraInfo[];
      const saved = remembered();

      // A remembered id that no longer exists in the registry must not leave
      // the app pointing at nothing.
      const selectedId =
        (saved && list.some((c) => c.id === saved) ? saved : null) ??
        list[0]?.id ??
        null;

      set({ list, selectedId, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  select: (id) => {
    if (id === get().selectedId) return;
    remember(id);
    set({ selectedId: id });
  },

  current: () => {
    const { list, selectedId } = get();
    return list.find((c) => c.id === selectedId) ?? null;
  },
}));
