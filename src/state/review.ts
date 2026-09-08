/**
 * Bandeja de revisión de incidentes.
 *
 * A diferencia del store de la sesión en vivo, esto lee del histórico
 * guardado en Postgres: sobrevive a recargar la página y a reiniciar el
 * servicio, que es justamente lo que necesita un agente que entra a validar
 * lo que el detector marcó mientras no había nadie mirando.
 */

import { create } from "zustand";
import {
  INCIDENTS_URL,
  NGROK_HEADERS,
  reviewUrl,
  summaryUrl,
} from "../lib/config";
import { DEFAULT_MIN_CONFIDENCE } from "../lib/review";
import type { IncidentPage, ReviewStatus, StoredIncident } from "../lib/types";

interface ReviewStore {
  items: StoredIncident[];
  loading: boolean;
  error: string | null;

  /** Id del incidente abierto en el visor. */
  openId: number | null;

  minConfidence: number;
  status: ReviewStatus;

  /** Id en el que se está guardando un veredicto, para bloquear sus botones
   *  y que un doble clic no mande dos PATCH. */
  saving: number | null;

  /** Id cuyo resumen se está generando, y el error si falló. Se separan del
   *  error general porque que la IA no responda no invalida la bandeja. */
  summarizing: number | null;
  summaryError: string | null;

  load: () => Promise<void>;
  setMinConfidence: (value: number) => void;
  setStatus: (value: ReviewStatus) => void;
  open: (id: number | null) => void;
  review: (id: number, status: ReviewStatus, note?: string) => Promise<void>;
  summarize: (id: number, force?: boolean) => Promise<void>;
}

export const useReview = create<ReviewStore>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  openId: null,
  minConfidence: DEFAULT_MIN_CONFIDENCE,
  status: "pendiente",
  saving: null,
  summarizing: null,
  summaryError: null,

  load: async () => {
    const { minConfidence, status } = get();

    set({ loading: true, error: null });

    const url = new URL(INCIDENTS_URL);
    url.searchParams.set("min_confidence", String(minConfidence));
    url.searchParams.set("status", status);
    url.searchParams.set("limit", "200");

    try {
      const res = await fetch(url, { headers: NGROK_HEADERS });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const page = (await res.json()) as IncidentPage;

      set({ items: page.items, loading: false });
    } catch (e) {
      // Un 503 aquí es la base caída, no un bug del panel: el mensaje tiene
      // que dejar eso claro o se busca en el lugar equivocado.
      set({ error: String(e), loading: false, items: [] });
    }
  },

  setMinConfidence: (value) => {
    if (value === get().minConfidence) return;
    set({ minConfidence: value, openId: null });
    void get().load();
  },

  setStatus: (value) => {
    if (value === get().status) return;
    set({ status: value, openId: null });
    void get().load();
  },

  open: (id) => set({ openId: id }),

  review: async (id, status, note) => {
    set({ saving: id, error: null });

    try {
      const res = await fetch(reviewUrl(id), {
        method: "PATCH",
        headers: { ...NGROK_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: note || null }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const updated = (await res.json()) as StoredIncident;

      set((s) => {
        // El incidente sale de la lista si dejó de encajar en el filtro
        // vigente: revisado uno, el siguiente queda arriba y el agente no
        // tiene que buscar dónde se quedó.
        const stays = updated.review_status === s.status;

        const items = stays
          ? s.items.map((i) => (i.id === id ? updated : i))
          : s.items.filter((i) => i.id !== id);

        return {
          items,
          saving: null,
          openId: stays ? s.openId : null,
        };
      });
    } catch (e) {
      set({ error: String(e), saving: null });
    }
  },

  summarize: async (id, force = false) => {
    set({ summarizing: id, summaryError: null });

    try {
      const res = await fetch(summaryUrl(id, force), {
        method: "POST",
        headers: NGROK_HEADERS,
      });

      const body = await res.json();

      if (!res.ok) {
        // El backend manda 503 con un texto explicativo cuando falta la
        // clave o el proveedor no responde. Merece mostrarse tal cual: es
        // accionable, a diferencia de un "HTTP 503".
        throw new Error(body?.detail ?? `HTTP ${res.status}`);
      }

      set((s) => ({
        summarizing: null,
        items: s.items.map((i) =>
          i.id === id
            ? { ...i, ai_summary: body.summary, ai_model: body.model }
            : i,
        ),
      }));
    } catch (e) {
      set({
        summarizing: null,
        summaryError: e instanceof Error ? e.message : String(e),
      });
    }
  },
}));
