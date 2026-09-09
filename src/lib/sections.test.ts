/**
 * El registro de secciones.
 *
 * Lo que se prueba es el filtrado por permiso, que es lo que decide si a un
 * operario le aparece la puerta de administración. Esconderla no es la
 * defensa —la API vuelve a comprobar el permiso— pero ofrecerla y que reviente
 * con un 403 es una interfaz que miente.
 */

import { describe, expect, it } from "vitest";
import { resolveSection, SECTIONS, visibleSections } from "./sections";

const operario = () => false;
const admin = (permission: string) => permission === "users:manage";

describe("secciones visibles", () => {
  it("un operario no ve administración", () => {
    const ids = visibleSections(operario).map((s) => s.id);

    expect(ids).toContain("console");
    expect(ids).toContain("dashboard");
    expect(ids).not.toContain("admin");
  });

  it("un administrador las ve todas", () => {
    expect(visibleSections(admin)).toHaveLength(SECTIONS.length);
  });

  it("conserva el orden del registro", () => {
    const ids = visibleSections(admin).map((s) => s.id);

    expect(ids).toEqual(SECTIONS.map((s) => s.id));
  });
});

describe("sección efectiva", () => {
  it("respeta la sección pedida cuando el rol la permite", () => {
    expect(resolveSection("admin", admin)).toBe("admin");
  });

  it("cae a la primera disponible si el rol ya no la permite", () => {
    // El caso real: alguien fue admin, dejó guardada esa sección y le
    // bajaron el rol. Sin esto, la pantalla queda en blanco.
    expect(resolveSection("admin", operario)).toBe("console");
  });

  it("siempre resuelve a algo, porque la consola no pide permiso", () => {
    const nadie = () => false;

    expect(resolveSection("dashboard", nadie)).toBe("dashboard");
    expect(SECTIONS.find((s) => s.id === "console")?.permission).toBeUndefined();
  });
});
