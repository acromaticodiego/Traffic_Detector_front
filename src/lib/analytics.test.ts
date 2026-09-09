import { describe, expect, it } from "vitest";
import { duracion, etiquetaDia, porcentaje, turnoEnCurso } from "./analytics";

describe("duración", () => {
  it("por debajo de una hora habla en minutos", () => {
    expect(duracion(48 * 60)).toBe("48 min");
  });

  it("combina horas y minutos", () => {
    expect(duracion(6 * 3600 + 12 * 60)).toBe("6 h 12 min");
  });

  it("omite los minutos cuando la hora es exacta", () => {
    expect(duracion(2 * 3600)).toBe("2 h");
  });

  it("al redondear 59 min 40 s sube la hora en vez de decir 60 min", () => {
    expect(duracion(3600 + 59 * 60 + 40)).toBe("2 h");
  });

  it("un turno sin empezar no dice nada raro", () => {
    expect(duracion(0)).toBe("0 min");
    expect(duracion(-5)).toBe("0 min");
  });
});

describe("porcentaje", () => {
  it("sin veredictos muestra un guion y no un cero", () => {
    // Un 0% se leería como "se equivoca siempre" en vez de "aún no revisó".
    expect(porcentaje(null)).toBe("—");
  });

  it("redondea a entero", () => {
    expect(porcentaje(0.756)).toBe("76%");
  });
});

describe("etiqueta del día", () => {
  it("es día/mes", () => {
    expect(etiquetaDia("2026-09-08")).toBe("08/09");
  });
});

describe("turno en curso", () => {
  const turno = {
    started_at: "2026-09-08T12:00:00+00:00",
    last_seen_at: "2026-09-08T14:00:00+00:00",
    active_seconds: 7200,
    gap_count: 0,
    gap_seconds: 0,
  };

  it("suma lo transcurrido desde el último latido", () => {
    const ahora = Date.parse("2026-09-08T14:00:30+00:00");

    expect(turnoEnCurso(turno, ahora)).toBe(7230);
  });

  it("no suma más de la tolerancia, que es lo máximo que acreditaría el servidor", () => {
    const ahora = Date.parse("2026-09-08T15:00:00+00:00");

    expect(turnoEnCurso(turno, ahora, 600)).toBe(7800);
  });

  it("un reloj adelantado en el navegador no resta tiempo", () => {
    const ahora = Date.parse("2026-09-08T13:00:00+00:00");

    expect(turnoEnCurso(turno, ahora)).toBe(7200);
  });
});
