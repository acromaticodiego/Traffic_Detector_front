import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PanelId =
  | "video"
  | "incidents"
  | "details"
  | "analysis"
  | "review";

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
  review: { x: 20, y: 86, w: 432, h: 576, minimized: false, visible: true, z: 11 },
  video: { x: 468, y: 86, w: 948, h: 660, minimized: false, visible: true, z: 12 },
  details: { x: 468, y: 762, w: 948, h: 252, minimized: false, visible: true, z: 10 },
  incidents: { x: 1432, y: 86, w: 456, h: 512, minimized: false, visible: true, z: 11 },
  analysis: { x: 1432, y: 614, w: 456, h: 398, minimized: false, visible: true, z: 9 },
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

  /** Devuelve al viewport todo panel que se haya quedado fuera. */
  reflow: () => void;
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

      // Se llama cuando cambia el tamaño de la ventana. Las posiciones son
      // absolutas y persistidas, así que sin esto un panel colocado con la
      // ventana ancha queda fuera de pantalla al reducirla —o al cambiar de
      // monitor, o al abrir las DevTools— y su barra de título deja de estar
      // al alcance, que es la única forma de arrastrarlo de vuelta.
      reflow: () =>
        set((s) => {
          const panels = { ...s.panels };
          let cambio = false;

          for (const id of Object.keys(panels) as PanelId[]) {
            const ajustado = clampBox(panels[id]);

            if (
              ajustado.x !== panels[id].x ||
              ajustado.y !== panels[id].y ||
              ajustado.w !== panels[id].w ||
              ajustado.h !== panels[id].h
            ) {
              panels[id] = ajustado;
              cambio = true;
            }
          }

          // Devolver el mismo objeto si nada se movió evita un render por
          // cada píxel mientras se arrastra el borde de la ventana.
          return cambio ? { panels } : s;
        }),

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
      // corrieron a su derecha.
      // 4: disposición nueva, con los cinco paneles repartidos sin solaparse.
      // Las guardadas se descartan una vez: conservarlas dejaría la pantalla
      // como estaba y el cambio no se vería.
      version: 4,
      migrate: (persisted, version) => (version < 4 ? undefined : persisted),
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
