/**
 * Un ratio contra su techo, en anillo.
 *
 * Es un MEDIDOR, no un gráfico de tarta partido en dos. La diferencia no es
 * cosmética: una tarta de dos porciones pone a competir dos categorías por el
 * mismo espacio y obliga a comparar dos ángulos, que es justo lo que peor se
 * le da al ojo. Aquí hay un solo arco sobre una pista neutra —lo que se lee es
 * cuánto se ha llenado de 100, igual que una barra de progreso— y la cifra del
 * centro es la que manda; el arco solo la acompaña.
 *
 * El desglose de confirmados y descartados vive al lado, en leyenda con sus
 * números. Poner cada uno como porción de este anillo sería convertir el
 * medidor en la tarta que se está evitando.
 */

export function RingMeter({
  value,
  label,
  accent = "var(--brand)",
  size = 148,
}: {
  /** 0–100, o null cuando todavía no hay nada que medir. */
  value: number | null;
  label: string;
  accent?: string;
  size?: number;
}) {
  const grosor = 12;
  const radio = (size - grosor) / 2;
  const vuelta = 2 * Math.PI * radio;

  const acotado = value === null ? 0 : Math.min(Math.max(value, 0), 100);
  const lleno = (acotado / 100) * vuelta;

  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={
          value === null ? `${label}: sin datos` : `${label}: ${acotado}%`
        }
      >
        {/* Arranca arriba y avanza en el sentido del reloj, que es como se
            lee un indicador de llenado. Sin esto empezaría a las 3 en punto. */}
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            className="ring-track"
            cx={size / 2}
            cy={size / 2}
            r={radio}
            fill="none"
            strokeWidth={grosor}
          />
          {value !== null && (
            <circle
              className="ring-fill"
              cx={size / 2}
              cy={size / 2}
              r={radio}
              fill="none"
              stroke={accent}
              strokeWidth={grosor}
              strokeLinecap="round"
              strokeDasharray={`${lleno} ${vuelta}`}
            />
          )}
        </g>
      </svg>

      <div className="ring-center">
        <strong>{value === null ? "—" : `${Math.round(value)}%`}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
