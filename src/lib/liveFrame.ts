/**
 * El último frame que mandó el servicio, ya decodificado.
 *
 * Vive fuera del store a propósito. El store guarda todos los frames de la
 * sesión para poder mirar atrás, y una imagen de 38 KB por frame lo llevaría
 * a decenas de megas en una sola pasada. Aquí solo cabe uno: el que se está
 * pintando.
 *
 * Tampoco es reactivo. El dibujo va en un bucle de requestAnimationFrame, así
 * que avisar a React de cada frame solo provocaría renders que nadie usa.
 */

type LiveFrame = { frameId: number; bitmap: ImageBitmap };

let current: LiveFrame | null = null;

export function liveFrame(): LiveFrame | null {
  return current;
}

export async function setLiveFrame(
  frameId: number,
  base64: string,
): Promise<void> {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const bitmap = await createImageBitmap(
    new Blob([bytes], { type: "image/jpeg" }),
  );

  // Decodificar es asíncrono, así que dos frames pueden terminar al revés.
  // El viejo se descarta: pintar hacia atrás se ve como un tirón.
  if (current && current.frameId > frameId) {
    bitmap.close();
    return;
  }

  current?.bitmap.close();
  current = { frameId, bitmap };
}

export function clearLiveFrame(): void {
  current?.bitmap.close();
  current = null;
}
