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

  /** El menú de secciones. Cerrado por defecto: ocupaba 208 px permanentes
   *  de un ancho que la consola necesita para sus paneles, y desplazaba
   *  todo lo demás hacia la derecha hasta sacarlo de pantalla. */
  railOpen: boolean;

  go: (section: SectionId) => void;
  toggleDock: () => void;
  toggleRail: () => void;
  closeRail: () => void;
}

export const useView = create<ViewStore>()(
  persist(
    (set) => ({
      section: "console",
      dockOpen: true,
      railOpen: false,

      // Navegar cierra el menú: es lo que uno espera de un cajón, y evita
      // dejarlo tapando la sección a la que se acaba de entrar.
      go: (section) => set({ section, railOpen: false }),
      toggleDock: () => set((s) => ({ dockOpen: !s.dockOpen })),
      toggleRail: () => set((s) => ({ railOpen: !s.railOpen })),
      closeRail: () => set({ railOpen: false }),
    }),
    { name: "td-view", version: 2 },
  ),
);
