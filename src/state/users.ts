/**
 * Administración de cuentas.
 *
 * Solo lo usa la sección de administración, y solo un administrador llega
 * ahí. Igual que en el resto de la aplicación, esconder la vista es
 * comodidad: quien decide es el backend, que responde 403.
 */

import { create } from "zustand";
import { API_BASE } from "../lib/config";
import { apiHeaders } from "../lib/session";

export interface ManagedUser {
  id: number;
  email: string;
  full_name: string;
  cedula: string;
  phone: string;
  role: string;
  active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface RoleInfo {
  name: string;
  description: string;
  permissions: string[];
}

export interface NewUser {
  email: string;
  full_name: string;
  cedula: string;
  phone: string;
  role: string;
  password: string;
}

interface UsersStore {
  items: ManagedUser[];
  roles: RoleInfo[];
  loading: boolean;
  error: string | null;

  /** Error del formulario, aparte del de la lista: que un correo esté
   *  repetido no invalida lo que ya se está mostrando. */
  formError: string | null;
  saving: boolean;

  load: () => Promise<void>;
  create: (user: NewUser) => Promise<boolean>;
  update: (id: number, cambios: Partial<ManagedUser>) => Promise<void>;
  clearFormError: () => void;
}

const URL = `${API_BASE}/api/users`;

async function detalle(res: Response): Promise<string> {
  // El backend manda un `detail` legible en 409 y 422 —"Ya existe una cuenta
  // con esa cédula"— y eso es justo lo que hay que enseñar. Un "HTTP 409" no
  // le dice nada a nadie.
  const body = await res.json().catch(() => null);

  return body?.detail ?? `Error ${res.status}`;
}

export const useUsers = create<UsersStore>((set, get) => ({
  items: [],
  roles: [],
  loading: false,
  error: null,
  formError: null,
  saving: false,

  load: async () => {
    set({ loading: true, error: null });

    try {
      const [usuarios, roles] = await Promise.all([
        fetch(URL, { headers: apiHeaders() }),
        fetch(`${URL}/roles`, { headers: apiHeaders() }),
      ]);

      if (!usuarios.ok) throw new Error(await detalle(usuarios));
      if (!roles.ok) throw new Error(await detalle(roles));

      set({
        items: (await usuarios.json()).items,
        roles: (await roles.json()).items,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  create: async (user) => {
    set({ saving: true, formError: null });

    try {
      const res = await fetch(URL, {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(user),
      });

      if (!res.ok) throw new Error(await detalle(res));

      const creado = (await res.json()) as ManagedUser;

      set((s) => ({ items: [...s.items, creado], saving: false }));

      return true;
    } catch (e) {
      set({
        saving: false,
        formError: e instanceof Error ? e.message : String(e),
      });
      return false;
    }
  },

  update: async (id, cambios) => {
    set({ error: null });

    // Optimista: el interruptor de activar responde al instante y se
    // revierte si el servidor dice que no. Esperar la respuesta hace que
    // parezca que el clic no registró.
    const previos = get().items;

    set((s) => ({
      items: s.items.map((u) => (u.id === id ? { ...u, ...cambios } : u)),
    }));

    try {
      const res = await fetch(`${URL}/${id}`, {
        method: "PATCH",
        headers: apiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(cambios),
      });

      if (!res.ok) throw new Error(await detalle(res));

      const actualizado = (await res.json()) as ManagedUser;

      set((s) => ({
        items: s.items.map((u) => (u.id === id ? actualizado : u)),
      }));
    } catch (e) {
      set({
        items: previos,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  clearFormError: () => set({ formError: null }),
}));
