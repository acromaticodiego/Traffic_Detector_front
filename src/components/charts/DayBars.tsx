import { useState } from "react";
import { etiquetaDia } from "../../lib/analytics";

export interface Punto {
  date: string;
  value: number;
}

/**
 * Una serie diaria en barras.
 *
 * Barras y no línea porque cada día es un total cerrado, no una medición
 * continua: una línea entre el viernes y el lunes dibujaría una pendiente por
 * un fin de semana en el que no pasó nada.
 *
 * Los días sin actividad vienen del servidor y se dibujan igual, como base
 * vacía. Si se omitieran, dos lunes seguidos parecerían días consecutivos.
 *
 * Una sola serie, así que no lleva leyenda —el título la nombra— y solo se
 * etiqueta el día más alto: un número sobre cada barra es ruido, y el máximo
 * es el único valor que se busca de un vistazo.
 */
export function DayBars({
  title,
  hint,
  data,
  format,
}: {
  title: string;
  hint: string;
  data: Punto[];
  format: (value: number) => string;
}) {
  const [sobre, setSobre] = useState<number | null>(null);

  const maximo = Math.max(...data.map((d) => d.value), 0);
  const indiceMaximo = maximo > 0 ? data.findIndex((d) => d.value === maximo) : -1;

  return (
    <figure className="chart">
      <figcaption>
        <strong>{title}</strong>
        <span>{hint}</span>
      </figcaption>

      <div className="chart-plot" onMouseLeave={() => setSobre(null)}>
        {data.map((punto, i) => {
          const alto = maximo > 0 ? (punto.value / maximo) * 100 : 0;
          const activo = sobre === i;

          return (
            <div
              key={punto.date}
              className={`chart-col${activo ? " on" : ""}`}
              onMouseEnter={() => setSobre(i)}
            >
              {activo && (
                <div className="chart-tip" role="status">
                  <strong>{format(punto.value)}</strong>
                  <span>{etiquetaDia(punto.date)}</span>
                </div>
              )}

              {i === indiceMaximo && !activo && (
                <span className="chart-peak">{format(punto.value)}</span>
              )}

              <div
                className="chart-bar"
                style={{ height: `${alto}%` }}
                /* El valor también en texto: el alto de una barra no lo lee
                   un lector de pantalla, y con el ratón fuera tampoco hay
                   tooltip. */
                aria-label={`${etiquetaDia(punto.date)}: ${format(punto.value)}`}
              />
            </div>
          );
        })}
      </div>

      <div className="chart-axis">
        <span>{data.length > 0 ? etiquetaDia(data[0].date) : ""}</span>
        <span>{data.length > 0 ? etiquetaDia(data[data.length - 1].date) : ""}</span>
      </div>
    </figure>
  );
}
