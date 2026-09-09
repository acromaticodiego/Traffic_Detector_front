/**
 * Presentación de los datos de identidad de una cuenta.
 *
 * En la base viven como dígitos pelados —es lo que hace que comparar y
 * garantizar unicidad funcione— así que darles forma es trabajo de aquí.
 */

/** Solo los dígitos, igual que hace el servidor al guardar. */
export function digits(value: string): string {
  return (value ?? "").replace(/\D+/g, "");
}

/** '1234567890' -> '1.234.567.890', como se escribe en Colombia. */
export function formatCedula(cedula: string): string {
  const d = digits(cedula);

  if (!d) return "—";

  return d.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** '3001234567' -> '300 123 4567'. Otros largos se dejan como están. */
export function formatPhone(phone: string): string {
  const d = digits(phone);

  if (!d) return "—";

  return d.length === 10
    ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
    : d;
}

/**
 * Si la cédula es el relleno que puso la migración y no un dato real.
 *
 * Cuando se añadió la columna, las cuentas que ya existían no tenían cédula
 * y la columna es única y obligatoria, así que la migración las rellenó con
 * el id acolchado de ceros. Detectarlo importa: un `0000000001` en pantalla
 * se lee como una cédula cualquiera, y nadie corrige lo que no sabe que
 * está mal.
 *
 * La regla es que una cédula colombiana no empieza por cero.
 */
export function isPlaceholderCedula(cedula: string): boolean {
  const d = digits(cedula);

  return d.length > 0 && d.startsWith("0");
}

/** Cuándo entró por última vez, en corto. */
export function formatLastLogin(iso: string | null): string {
  if (!iso) return "nunca";

  const fecha = new Date(iso);

  if (Number.isNaN(fecha.getTime())) return "—";

  return fecha.toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
