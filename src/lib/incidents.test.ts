import { describe, expect, it } from "vitest";
import {
  ALERT_CONFIDENCE,
  incidentType,
  severity,
  severityColor,
} from "./incidents";

describe("incidentType", () => {
  it("mapea los tipos conocidos del vision_service", () => {
    expect(incidentType("possible_collision").label).toBe("Posible colisión");
    expect(incidentType("vehiculo_detenido").label).toBe("Vehículo detenido");
  });

  it("usa el propio tipo, legible, cuando el backend manda uno nuevo", () => {
    // Un tipo nuevo en el backend no debe dejar la UI sin etiqueta.
    expect(incidentType("congestion_subita").label).toBe("congestion subita");
    expect(incidentType("congestion_subita").color).toBeTruthy();
  });
});

describe("severity", () => {
  it("clasifica por confianza", () => {
    expect(severity(0.95).key).toBe("confirmed");
    expect(severity(0.6).key).toBe("pending");
    expect(severity(0.2).key).toBe("low");
  });

  it("trata ALERT_CONFIDENCE como confirmado (límite inclusivo)", () => {
    expect(severity(ALERT_CONFIDENCE).key).toBe("confirmed");
    expect(severity(ALERT_CONFIDENCE - 0.01).key).toBe("pending");
  });

  it("devuelve colores hex, que el canvas usa tal cual", () => {
    expect(severityColor(0.9)).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
