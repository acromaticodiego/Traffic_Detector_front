/**
 * Bloques de carga.
 *
 * Un hueco con la forma de lo que viene dice "esto está llegando". La palabra
 * "Cargando" dice "aquí no hay nada", y durante ese segundo la pantalla parece
 * rota — que es justo la impresión que deja una interfaz que se siente
 * estática: nunca insinúa lo que va a pasar.
 *
 * Van marcados como `aria-hidden` y acompañados de un `role="status"` con
 * texto: para un lector de pantalla, doce rectángulos grises no son
 * información, y el aviso de que se está cargando sí.
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

/** El armazón del dashboard mientras llegan los números. */
export function DashboardSkeleton() {
  return (
    <div className="view dash">
      <p className="sr-only" role="status">
        Cargando la analítica del turno.
      </p>

      <div className="tiles">
        <Skeleton className="skeleton-tile" />
        <Skeleton className="skeleton-tile" />
        <Skeleton className="skeleton-tile" />
        <Skeleton className="skeleton-tile" />
      </div>

      <div className="charts">
        <Skeleton className="skeleton-chart" />
        <Skeleton className="skeleton-chart" />
      </div>

      <div className="card">
        <Skeleton className="skeleton-row" />
        <Skeleton className="skeleton-row" />
        <Skeleton className="skeleton-row" />
      </div>
    </div>
  );
}

/** Las filas de la tabla de cuentas. */
export function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div>
      <p className="sr-only" role="status">
        Cargando las cuentas.
      </p>

      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="skeleton-row" />
      ))}
    </div>
  );
}
