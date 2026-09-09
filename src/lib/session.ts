/**
 * El token de sesión: dónde vive y cómo se manda.
 *
 * Va en `localStorage` y no en una cookie httpOnly. La cookie sería más
 * resistente a un XSS —un script inyectado no podría leerla— pero aquí el
 * frontend y la API viven en dominios distintos (y a veces detrás de un
 * túnel de ngrok), lo que obliga a cookies de terceros y a protección CSRF
 * aparte. Es una compensación consciente, no un descuido: la defensa contra
 * XSS en este montaje es no inyectar HTML sin escapar, que es lo que React
 * hace por defecto.
 *
 * Está en un módulo plano y no en el store de zustand porque lo necesitan
 * cosas que no son componentes —la URL del WebSocket, las cabeceras de cada
 * fetch— y hacerlo al revés crea importaciones circulares.
 */

const STORAGE_KEY = "td-token";

/** Cabecera que salta la página de advertencia de ngrok. */
import { IS_NGROK } from "./config";

export function getToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // Modo privado o almacenamiento bloqueado: la sesión no persiste entre
    // recargas, pero la aplicación tiene que seguir funcionando.
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    /* ignorado: ver getToken */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignorado */
  }
}

/**
 * Las cabeceras de cualquier llamada a la API.
 *
 * Sustituye a NGROK_HEADERS en todas partes: si una petición se queda sin
 * el token, el backend responde 401 y la pantalla se queda vacía sin decir
 * por qué. Centralizarlo evita ese olvido.
 */
export function apiHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getToken();

  return {
    ...(IS_NGROK ? { "ngrok-skip-browser-warning": "true" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

/**
 * Añade el token a una URL de WebSocket.
 *
 * La API de WebSocket del navegador no permite mandar cabeceras propias al
 * abrir la conexión, así que no hay forma de enviar `Authorization` y el
 * token tiene que viajar en la query. Es la razón por la que el backend
 * acepta `?token=` solo en esa ruta.
 */
export function wsUrlWithToken(url: string): string {
  const token = getToken();

  if (!token) return url;

  return `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
}
