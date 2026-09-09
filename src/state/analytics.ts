/**
 * La analítica del dashboard.
 *
 * Se pide bajo demanda y no se refresca sola: son números de turno, no un
 * indicador en vivo, y un sondeo constante solo añadiría carga a la base para
 * que un número cambie mientras nadie lo mira. El botón de recargar está a la
 * vista para cuando sí interese.
 */

import { create } from "zustand";
import { API_BASE } from "../lib/config";
import { apiHeaders } from "../lib/session";
import type { Analitica, FilaEquipo } from "../lib/analytics";

interface AnalyticsStore {
  data: Analitica | null;
  team: FilaEquipo[] | null;

  /** Null = mis propios números. Un id = los de otra persona (solo admin). */
  watching: number | null;

  loading: boolean;
  error: string | null;

  load: (userId?: number | null) => Promise<void>;
  loadTeam: () => Promise<void>;
}

async function pedir<T>(ruta: string): Promise<T> {
  const res = await fetch(`${API_BASE}${ruta}`, { headers: apiHeaders() });

  if (!res.ok) {
    const cuerpo = await res.json().catch(() => null);
    throw new Error(cuerpo?.detail ?? `HTTP ${res.status}`);
  }

  return (await res.json()) as T;
}

export const useAnalytics = create<AnalyticsStore>((set) => ({
  data: null,
  team: null,
  watching: null,
  loading: false,
  error: null,

  load: async (userId = null) => {
    set({ loading: true, error: null, watching: userId });

    try {
      const ruta =
        userId === null ? "/api/analytics/me" : `/api/analytics/users/${userId}`;

      set({ data: await pedir<Analitica>(ruta), loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  loadTeam: async () => {
    try {
      const cuerpo = await pedir<{ users: FilaEquipo[] }>("/api/analytics/users");
      set({ team: cuerpo.users });
    } catch {
      // El equipo es un extra del administrador: si falla, su propio
      // dashboard tiene que seguir viéndose igual.
      set({ team: null });
    }
  },
}));
