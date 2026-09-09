import { useAuth } from "../state/auth";
import { useEffect } from "react";
import { useView } from "../state/view";
import { IconClose, IconMenu } from "./icons";
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

  const open = useView((s) => s.railOpen);
  const toggle = useView((s) => s.toggleRail);
  const close = useView((s) => s.closeRail);

  const sections = visibleSections(can);

  // Escape cierra, como cualquier cajón. Sin esto la única salida es acertar
  // al botón, que en una pantalla llena de paneles no siempre está a la vista.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const actual = sections.find((s) => s.id === section);

  return (
    <>
      <button
        className={`rail-handle${open ? " on" : ""}`}
        onClick={toggle}
        title={open ? "Cerrar el menú" : "Abrir el menú de secciones"}
        aria-expanded={open}
      >
        {open ? <IconClose width={16} height={16} /> : <IconMenu width={16} height={16} />}
        <span className="rail-handle-text">{actual?.label ?? "Secciones"}</span>
      </button>

      {/* Un velo que cierra al tocar fuera. Solo existe con el menú abierto,
          así que no intercepta nada el resto del tiempo. */}
      {open && <div className="rail-veil" onClick={close} aria-hidden />}

      <nav className={`rail${open ? " open" : ""}`} aria-label="Secciones">
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
    </>
  );
}
