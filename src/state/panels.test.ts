import { beforeEach, describe, expect, it } from "vitest";
import { usePanels } from "./panels";

beforeEach(() => {
  usePanels.getState().resetLayout();
});

describe("clamp de posición", () => {
  it("no deja arrastrar un panel debajo de la barra superior", () => {
    usePanels.getState().move("video", 400, -500);
    expect(usePanels.getState().panels.video.y).toBeGreaterThanOrEqual(60);
  });

  it("deja siempre un asa visible al soltar un panel fuera de pantalla", () => {
    const { move } = usePanels.getState();
    move("video", 99999, 99999);

    const { x, y, w } = usePanels.getState().panels.video;
    expect(x).toBeLessThanOrEqual(window.innerWidth - 60);
    expect(y).toBeLessThanOrEqual(window.innerHeight - 44);
    // El borde derecho del panel nunca queda del todo fuera por la izquierda.
    expect(x + w).toBeGreaterThan(120);
  });
});

describe("resize", () => {
  it("respeta el tamaño mínimo utilizable", () => {
    usePanels.getState().resize("video", 10, 10);
    const { w, h } = usePanels.getState().panels.video;
    expect(w).toBe(260);
    expect(h).toBe(120);
  });

  it("no crece más allá del viewport", () => {
    usePanels.getState().resize("video", 99999, 99999);
    const { w, h } = usePanels.getState().panels.video;
    expect(w).toBeLessThanOrEqual(window.innerWidth - 16);
    expect(h).toBeLessThanOrEqual(window.innerHeight - 60 - 16);
  });

  it("al estirar desde la esquina superior, el borde inferior no se mueve", () => {
    const before = usePanels.getState().panels.video;
    const bottom = before.y + before.h;

    usePanels.getState().resizeNE("video", before.w, before.h + 100, bottom);

    const after = usePanels.getState().panels.video;
    expect(after.y + after.h).toBe(bottom);
    expect(after.y).toBeLessThan(before.y);
  });

  it("al llegar a la barra superior, la esquina se detiene ahí", () => {
    const { w } = usePanels.getState().panels.video;
    usePanels.getState().resizeNE("video", w, 5000, 600);

    const after = usePanels.getState().panels.video;
    expect(after.y).toBe(60);
    expect(after.y + after.h).toBe(600);
  });
});

describe("foco y visibilidad", () => {
  it("trae al frente el panel que se muestra desde el dock", () => {
    const { setVisible } = usePanels.getState();
    setVisible("details", false);
    setVisible("details", true);

    const { panels, topZ } = usePanels.getState();
    expect(panels.details.visible).toBe(true);
    expect(panels.details.z).toBe(topZ);
  });

  it("mostrar un panel oculto lo desminimiza", () => {
    const { toggleMin, setVisible } = usePanels.getState();
    toggleMin("incidents");
    setVisible("incidents", false);
    setVisible("incidents", true);

    expect(usePanels.getState().panels.incidents.minimized).toBe(false);
  });
});
