import { useEffect, useRef } from "react";
import { API_BASE } from "../lib/config";
import { apiHeaders } from "../lib/session";

/**
 * Le dice al servidor, cada tanto, que esta persona sigue delante de la
 * consola. Es lo que mide el tiempo de turno.
 *
 * Un latido perdido no se reintenta: el siguiente llega igual y el servidor
 * acredita el hueco entero mientras esté dentro de su tolerancia, así que
 * insistir solo añadiría peticiones sin cambiar el resultado. Es también la
 * razón de que un corte de internet no le cueste tiempo a nadie.
 *
 * El ritmo lo decide el servidor y no esta constante: así se puede ajustar la
 * tolerancia en el `.env` sin reconstruir el frontend.
 */
const RITMO_POR_DEFECTO = 60_000;

export function useHeartbeat(activo: boolean) {
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!activo) return;

    let cancelado = false;

    const latir = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/shifts/heartbeat`, {
          method: "POST",
          headers: apiHeaders(),
        });

        if (res.ok) {
          const cuerpo = await res.json();
          const siguiente = Number(cuerpo?.next_in_seconds);

          if (Number.isFinite(siguiente) && siguiente > 0) {
            return siguiente * 1000;
          }
        }
      } catch {
        // Sin red. No se hace nada: el siguiente latido llegará cuando
        // vuelva, y el servidor ya sabe qué hacer con el hueco.
      }

      return RITMO_POR_DEFECTO;
    };

    const programar = (espera: number) => {
      timer.current = window.setTimeout(async () => {
        if (cancelado) return;
        programar(await latir());
      }, espera);
    };

    void latir().then((espera) => {
      if (!cancelado) programar(espera);
    });

    return () => {
      cancelado = true;
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [activo]);
}
