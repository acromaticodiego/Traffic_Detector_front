import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiHeaders,
  clearToken,
  getToken,
  setToken,
  wsUrlWithToken,
} from "./session";

beforeEach(() => {
  localStorage.clear();
});

describe("token", () => {
  it("guarda y recupera", () => {
    setToken("abc123");

    expect(getToken()).toBe("abc123");
  });

  it("cerrar sesión lo borra", () => {
    setToken("abc123");
    clearToken();

    expect(getToken()).toBeNull();
  });

  it("sobrevive a un almacenamiento bloqueado", () => {
    // Modo privado, o un navegador con las cookies de sitio bloqueadas: la
    // sesión no persiste entre recargas, pero la aplicación no puede caerse.
    const romper = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });

    expect(() => getToken()).not.toThrow();
    expect(getToken()).toBeNull();

    romper.mockRestore();
  });
});

describe("cabeceras", () => {
  it("manda el token como Bearer", () => {
    setToken("abc123");

    expect(apiHeaders().Authorization).toBe("Bearer abc123");
  });

  it("sin token no inventa una cabecera vacía", () => {
    // Mandar "Bearer " vacío haría que el backend responda 401 con un
    // mensaje de token inválido en vez de "falta el token".
    expect(apiHeaders().Authorization).toBeUndefined();
  });

  it("conserva las cabeceras extra", () => {
    setToken("abc123");

    const headers = apiHeaders({ "Content-Type": "application/json" });

    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers.Authorization).toBe("Bearer abc123");
  });
});

describe("URL del WebSocket", () => {
  it("añade el token a una URL que ya tiene query", () => {
    setToken("abc123");

    expect(wsUrlWithToken("ws://x/ws?stride=1")).toBe(
      "ws://x/ws?stride=1&token=abc123",
    );
  });

  it("añade el token a una URL sin query", () => {
    setToken("abc123");

    expect(wsUrlWithToken("ws://x/ws")).toBe("ws://x/ws?token=abc123");
  });

  it("escapa el token", () => {
    // Un JWT no trae caracteres raros, pero construir URLs concatenando sin
    // escapar es exactamente cómo se cuelan cosas donde no deben.
    setToken("a+b/c=d");

    expect(wsUrlWithToken("ws://x/ws")).toBe("ws://x/ws?token=a%2Bb%2Fc%3Dd");
  });

  it("sin token deja la URL intacta", () => {
    expect(wsUrlWithToken("ws://x/ws")).toBe("ws://x/ws");
  });
});
