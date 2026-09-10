import { beforeEach, describe, expect, it } from "vitest";
import { defaultsFor, usePanels } from "./panels";

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

  it("un panel guardado fuera de pantalla vuelve a ser alcanzable al abrirlo", () => {
    // Pasa al abrir en un portátil un layout guardado en un monitor ancho, y
    // al desconectar una pantalla externa. Sin ajustar al mostrarlo, el panel
    // aparece con su barra de título fuera del viewport: no hay de dónde
    // agarrarlo para traerlo de vuelta.
    usePanels.getState().setVisible("review", false);
    usePanels.setState((s) => ({
      panels: {
        ...s.panels,
        review: { ...s.panels.review, x: window.innerWidth + 4000 },
      },
    }));

    usePanels.getState().setVisible("review", true);

    const { x, w } = usePanels.getState().panels.review;

    expect(x).toBeLessThanOrEqual(window.innerWidth - 60);
    expect(x + w).toBeGreaterThan(0);
  });

  it("al encoger la ventana los paneles vuelven a ser alcanzables", () => {
    // Pasa al cambiar de monitor, al abrir las DevTools o al rotar una
    // tablet. Sin reajustar, un panel colocado con la ventana ancha queda
    // con su barra de título fuera del viewport y no hay de dónde agarrarlo.
    usePanels.setState((s) => ({
      panels: {
        ...s.panels,
        video: { ...s.panels.video, x: window.innerWidth + 3000 },
      },
    }));

    usePanels.getState().reflow();

    expect(usePanels.getState().panels.video.x).toBeLessThanOrEqual(
      window.innerWidth - 60,
    );
  });

  it("mostrar un panel oculto lo desminimiza", () => {
    const { toggleMin, setVisible } = usePanels.getState();
    toggleMin("incidents");
    setVisible("incidents", false);
    setVisible("incidents", true);

    expect(usePanels.getState().panels.incidents.minimized).toBe(false);
  });
});

describe("disposición inicial", () => {
  // Estaba en píxeles fijos pensados para 1920 y con el escalado de Windows
  // el viewport en CSS es más estrecho: los paneles se salían por la derecha.
  const tamaños: [number, number][] = [
    [1920, 1080],
    [1548, 837],
    [1366, 768],
    [2560, 1440],
  ];

  it.each(tamaños)("cabe entera en %ix%i", (vw, vh) => {
    for (const box of Object.values(defaultsFor(vw, vh))) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.w).toBeLessThanOrEqual(vw);
      expect(box.y + box.h).toBeLessThanOrEqual(vh);
      expect(box.w).toBeGreaterThan(0);
      expect(box.h).toBeGreaterThan(0);
    }
  });

  it.each(tamaños)("no se solapan en %ix%i", (vw, vh) => {
    const cajas = Object.values(defaultsFor(vw, vh));

    for (let i = 0; i < cajas.length; i++) {
      for (let j = i + 1; j < cajas.length; j++) {
        const a = cajas[i];
        const b = cajas[j];
        const solapa =
          a.x < b.x + b.w &&
          b.x < a.x + a.w &&
          a.y < b.y + b.h &&
          b.y < a.y + a.h;
        expect(solapa).toBe(false);
      }
    }
  });
});
