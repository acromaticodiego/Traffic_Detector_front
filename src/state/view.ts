/**
 * Estado del armazón de la aplicación: en qué sección estás y si el dock de
 * paneles está desplegado.
 *
 * Va aparte de `panels` a propósito. Ese store guarda la posición y el tamaño
 * de las ventanas flotantes de la consola; esto es el cromo que las rodea y
 * que sigue existiendo cuando la consola ni siquiera se ve.
 *
 * Se persiste porque las dos cosas son preferencias de trabajo: quien vive en
 * el dashboard no quiere aterrizar en la consola cada mañana, y quien plegó el
 * dock para ganar mapa no quiere volver a plegarlo en cada recarga.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SectionId = "console" | "dashboard" | "admin";

interface ViewStore {
  section: SectionId;
  dockOpen: boolean;

  go: (section: SectionId) => void;
  toggleDock: () => void;
}

export const useView = create<ViewStore>()(
  persist(
    (set) => ({
      section: "console",
      dockOpen: true,

      go: (section) => set({ section }),
      toggleDock: () => set((s) => ({ dockOpen: !s.dockOpen })),
    }),
    { name: "td-view", version: 1 },
  ),
);
