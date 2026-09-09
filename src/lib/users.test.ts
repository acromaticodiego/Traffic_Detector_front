import { describe, expect, it } from "vitest";
import {
  digits,
  formatCedula,
  formatLastLogin,
  formatPhone,
  isPlaceholderCedula,
} from "./users";

describe("normalización", () => {
  it("se queda solo con los dígitos, igual que el servidor", () => {
    // Si el frontend y el backend normalizaran distinto, el panel mostraría
    // una cédula que no es la que se guardó.
    for (const forma of ["1.234.567.890", "1 234 567 890", "1-234-567-890"]) {
      expect(digits(forma)).toBe("1234567890");
    }
  });
});

describe("formato", () => {
  it("pone los puntos de millar de la cédula", () => {
    expect(formatCedula("1234567890")).toBe("1.234.567.890");
    expect(formatCedula("98765432")).toBe("98.765.432");
  });

  it("agrupa un celular de diez dígitos", () => {
    expect(formatPhone("3001234567")).toBe("300 123 4567");
  });

  it("un largo distinto se deja tal cual en vez de partirlo mal", () => {
    expect(formatPhone("573001234567")).toBe("573001234567");
  });

  it("un campo vacío no imprime 'undefined'", () => {
    expect(formatCedula("")).toBe("—");
    expect(formatPhone("")).toBe("—");
  });
});

describe("cédulas de relleno", () => {
  it("reconoce lo que puso la migración", () => {
    // La migración rellenó las cuentas existentes con el id acolchado de
    // ceros, porque la columna es única y obligatoria y no había dato. En
    // pantalla eso se lee como una cédula cualquiera si nadie lo marca.
    expect(isPlaceholderCedula("0000000001")).toBe(true);
    expect(isPlaceholderCedula("0000000002")).toBe(true);
  });

  it("no marca una cédula real", () => {
    expect(isPlaceholderCedula("1098765432")).toBe(false);
    expect(isPlaceholderCedula("98765432")).toBe(false);
  });

  it("una cédula vacía no es un relleno, es un vacío", () => {
    expect(isPlaceholderCedula("")).toBe(false);
  });
});

describe("último ingreso", () => {
  it("quien nunca entró se dice con esas palabras", () => {
    expect(formatLastLogin(null)).toBe("nunca");
  });

  it("una fecha inválida no imprime 'Invalid Date'", () => {
    expect(formatLastLogin("no es una fecha")).toBe("—");
  });
});
