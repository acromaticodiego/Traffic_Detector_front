import { usePanels, type PanelId } from "../state/panels";
import { useView } from "../state/view";
import {
  IconChevronDown,
  IconCone,
  IconEye,
  IconLayout,
  IconReview,
  IconSiren,
} from "./icons";

const ITEMS: { id: PanelId; label: string; icon: JSX.Element }[] = [
  { id: "video", label: "Cámara", icon: <IconEye width={15} height={15} /> },
  {
    id: "incidents",
    label: "Incidentes",
    icon: <IconSiren width={15} height={15} />,
  },
  {
    id: "details",
    label: "Detalle",
    icon: <IconCone width={15} height={15} />,
  },
  {
    id: "review",
    label: "Revisión",
    icon: <IconReview width={15} height={15} />,
  },
];

/**
 * El conmutador de paneles de la consola.
 *
 * Se pliega a su cabecera para devolver mapa a la pantalla, y plegado sigue
 * diciendo cuántos paneles hay abiertos: un cajón cerrado que no informa de
 * nada obliga a abrirlo para saber si hacía falta abrirlo.
 */
export function Dock() {
  const panels = usePanels((s) => s.panels);
  const setVisible = usePanels((s) => s.setVisible);
  const resetLayout = usePanels((s) => s.resetLayout);

  const open = useView((s) => s.dockOpen);
  const toggleDock = useView((s) => s.toggleDock);

  const abiertos = ITEMS.filter((it) => panels[it.id].visible).length;

  return (
    <div className={`dock${open ? "" : " closed"}`}>
      <button
        className="dock-head"
        onClick={toggleDock}
        aria-expanded={open}
        title={open ? "Plegar paneles" : "Desplegar paneles"}
      >
        <IconLayout width={14} height={14} />
        <span className="dock-label">Paneles</span>
        <span className="dock-count">
          {abiertos}/{ITEMS.length}
        </span>
        <IconChevronDown
          width={14}
          height={14}
          className={`dock-caret${open ? " up" : ""}`}
        />
      </button>

      {open && (
        <div className="dock-body">
          {ITEMS.map((it) => {
            const on = panels[it.id].visible;
            return (
              <button
                key={it.id}
                className={`dock-btn${on ? " on" : ""}`}
                onClick={() => setVisible(it.id, !on)}
                title={on ? `Guardar ${it.label}` : `Mostrar ${it.label}`}
              >
                {it.icon}
                <span>{it.label}</span>
                <span className="dock-state">{on ? "" : "oculto"}</span>
              </button>
            );
          })}

          <button
            className="dock-btn ghost"
            onClick={resetLayout}
            title="Restablecer posiciones"
          >
            <IconLayout width={15} height={15} />
            <span>Restablecer</span>
          </button>
        </div>
      )}
    </div>
  );
}
