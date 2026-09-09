import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PanelId = "video" | "incidents" | "details" | "review";

export interface PanelBox {
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
  visible: boolean;
  z: number;
}

/** Ancho de la barra de navegación. Los paneles no se meten debajo. */
const RAIL = 208;

const DEFAULTS: Record<PanelId, PanelBox> = {
  incidents: { x: 228, y: 74, w: 320, h: 560, minimized: false, visible: true, z: 11 },
  video: { x: 568, y: 74, w: 760, h: 540, minimized: false, visible: true, z: 12 },
  details: { x: 568, y: 632, w: 760, h: 250, minimized: false, visible: true, z: 10 },
  // Arranca oculto: es una herramienta de turno de revisión, no algo que el
  // operador que solo mira el vivo necesite tapándole el video.
  review: { x: 1348, y: 74, w: 460, h: 700, minimized: false, visible: false, z: 13 },
};

const TOP_BAR = 60;

function clampBox(b: PanelBox): PanelBox {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(Math.max(b.w, 260), vw - 16);
  const h = Math.min(Math.max(b.h, 120), vh - TOP_BAR - 16);
  return {
    ...b,
    w,
    h,
    x: Math.min(Math.max(b.x, RAIL - w + 120), vw - 60),
    y: Math.min(Math.max(b.y, TOP_BAR), vh - 44),
  };
}

interface PanelsStore {
  panels: Record<PanelId, PanelBox>;
  topZ: number;
  move: (id: PanelId, x: number, y: number) => void;
  resize: (id: PanelId, w: number, h: number) => void;
  resizeNE: (id: PanelId, w: number, h: number, bottom: number) => void;
  toggleMin: (id: PanelId) => void;
  setVisible: (id: PanelId, v: boolean) => void;
  focus: (id: PanelId) => void;
  resetLayout: () => void;
}

export const usePanels = create<PanelsStore>()(
  persist(
    (set, get) => ({
      panels: structuredClone(DEFAULTS),
      topZ: 12,

      move: (id, x, y) =>
        set((s) => ({
          panels: {
            ...s.panels,
            [id]: clampBox({ ...s.panels[id], x, y }),
          },
        })),

      resize: (id, w, h) =>
        set((s) => ({
          panels: {
            ...s.panels,
            [id]: clampBox({ ...s.panels[id], w, h }),
          },
        })),

      // Resize from the top-right corner. Unlike the bottom-right grip, the
      // panel's bottom edge has to stay where it is, so the height and the y
      // position move together: growing upwards is a smaller y, not a bigger
      // box anchored at the top.
      resizeNE: (id, w, h, bottom) =>
        set((s) => {
          const maxH = window.innerHeight - TOP_BAR - 16;
          const clampedH = Math.min(Math.max(h, 120), maxH);
          // If the top runs into the bar, the corner stops there and the
          // height follows, instead of the whole panel sliding down.
          const y = Math.max(bottom - clampedH, TOP_BAR);

          return {
            panels: {
              ...s.panels,
              [id]: clampBox({ ...s.panels[id], w, h: bottom - y, y }),
            },
          };
        }),

      toggleMin: (id) =>
        set((s) => ({
          panels: {
            ...s.panels,
            [id]: { ...s.panels[id], minimized: !s.panels[id].minimized },
          },
        })),

      setVisible: (id, v) => {
        const topZ = get().topZ + 1;
        set((s) => {
          const next = {
            ...s.panels[id],
            visible: v,
            minimized: v ? false : s.panels[id].minimized,
            z: v ? topZ : s.panels[id].z,
          };

          return {
            topZ,
            panels: {
              // Al mostrarlo se ajusta a la ventana. Las posiciones por
              // defecto se pensaron en una pantalla ancha, y las guardadas
              // vienen de la que tuviera el usuario la última vez: sin esto,
              // abrir un panel en un portátil —o después de cambiar de
              // monitor— lo deja medio fuera y con la barra de título
              // inalcanzable, o sea sin forma de arrastrarlo de vuelta.
              ...s.panels,
              [id]: v ? clampBox(next) : next,
            },
          };
        });
      },

      focus: (id) => {
        const cur = get().panels[id];
        if (cur.z === get().topZ) return;
        const topZ = get().topZ + 1;
        set((s) => ({
          topZ,
          panels: { ...s.panels, [id]: { ...s.panels[id], z: topZ } },
        }));
      },

      resetLayout: () => {
        try {
          localStorage.removeItem("td-panels");
        } catch {
          /* ignore */
        }
        set({ panels: structuredClone(DEFAULTS), topZ: 12 });
      },
    }),
    {
      name: "td-panels",
      // 3: apareció la barra de navegación y las posiciones por defecto se
      // corrieron a su derecha. Las guardadas se descartan una vez, porque
      // conservarlas dejaría los paneles debajo de la barra sin forma
      // evidente de recuperarlos.
      version: 3,
      migrate: (persisted, version) => (version < 3 ? undefined : persisted),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PanelsStore>;
        const panels = { ...current.panels };
        for (const id of Object.keys(panels) as PanelId[]) {
          if (p.panels?.[id]) panels[id] = { ...panels[id], ...p.panels[id] };
        }
        return { ...current, ...p, panels };
      },
    },
  ),
);

if (import.meta.env.DEV) {
  (window as unknown as { __panels?: typeof usePanels }).__panels = usePanels;
}
