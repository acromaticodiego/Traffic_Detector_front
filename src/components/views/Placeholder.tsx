/**
 * Hueco de una sección que todavía no tiene contenido.
 *
 * Dice qué va a haber aquí en vez de enseñar números inventados: una pantalla
 * con datos de mentira se acaba tomando por buena.
 */
export function Placeholder({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="view">
      <div className="view-empty">
        <h2>{title}</h2>
        <p>{children}</p>
      </div>
    </div>
  );
}
