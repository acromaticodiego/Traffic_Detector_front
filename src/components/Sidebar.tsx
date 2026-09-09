import { useAuth } from "../state/auth";
import { useView } from "../state/view";
import { visibleSections } from "../lib/sections";

/**
 * La navegación principal.
 *
 * Se dibuja desde el registro de secciones, así que no sabe cuántas hay ni
 * cuáles: añadir una es tocar `lib/sections.tsx` y nada más.
 */
export function Sidebar() {
  const can = useAuth((s) => s.can);
  const section = useView((s) => s.section);
  const go = useView((s) => s.go);

  const sections = visibleSections(can);

  return (
    <nav className="rail" aria-label="Secciones">
      {sections.map((s) => {
        const activa = s.id === section;

        return (
          <button
            key={s.id}
            className={`rail-btn${activa ? " on" : ""}`}
            onClick={() => go(s.id)}
            title={s.hint}
            aria-current={activa ? "page" : undefined}
          >
            <span className="rail-icon">{s.icon}</span>
            <span className="rail-text">
              <strong>{s.label}</strong>
              <small>{s.hint}</small>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
