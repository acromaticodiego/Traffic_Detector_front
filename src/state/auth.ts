/**
 * Sesión del usuario.
 *
 * Guarda quién entró y qué puede hacer. Los permisos que trae sirven para
 * dibujar la interfaz —esconder lo que este rol no puede usar— y para nada
 * más: quien decide de verdad es el backend, que los vuelve a comprobar en
 * cada petición. Esconder un botón no impide llamar a la API con curl.
 */

import { create } from "zustand";
import { API_BASE } from "../lib/config";
import { apiHeaders, clearToken, getToken, setToken } from "../lib/session";

export interface Profile {
  id: number;
  email: string;
  full_name: string;
  role: string;
  permissions: string[];
}

interface AuthStore {
  user: Profile | null;

  /** true mientras se comprueba el token guardado al arrancar. Sin esto la
   *  pantalla de login parpadea antes de restaurar una sesión válida. */
  checking: boolean;

  submitting: boolean;
  error: string | null;

  restore: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
}

export const useAuth = create<AuthStore>((set, get) => ({
  user: null,
  checking: true,
  submitting: false,
  error: null,

  restore: async () => {
    if (!getToken()) {
      set({ checking: false });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: apiHeaders(),
      });

      if (!res.ok) throw new Error(String(res.status));

      set({ user: (await res.json()) as Profile, checking: false });
    } catch {
      // El token guardado ya no vale (venció, o cambió el secreto del
      // servidor). Se descarta en silencio y se pide entrar otra vez.
      clearToken();
      set({ user: null, checking: false });
    }
  },

  login: async (email, password) => {
    set({ submitting: true, error: null });

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.detail ?? "No se pudo iniciar sesión.");
      }

      setToken(body.access_token);
      set({ user: body.user as Profile, submitting: false });

      return true;
    } catch (e) {
      set({
        submitting: false,
        error: e instanceof Error ? e.message : String(e),
      });
      return false;
    }
  },

  logout: async () => {
    // Cerrar el turno ANTES de soltar el token, que es lo único que autoriza
    // la llamada. Si falla —sin red, servicio caído— la sesión se cierra
    // igual: el turno quedaría abierto y lo cierra después el barrido por
    // inactividad, que es mucho mejor que dejar a alguien sin poder salir.
    try {
      await fetch(`${API_BASE}/api/shifts/close`, {
        method: "POST",
        headers: apiHeaders(),
      });
    } catch {
      /* ignorado a propósito: ver arriba */
    }

    clearToken();
    set({ user: null, error: null });
  },

  can: (permission) => get().user?.permissions.includes(permission) ?? false,
}));
