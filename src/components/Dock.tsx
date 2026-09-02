import { usePanels, type PanelId } from "../state/panels";
import { IconAlert, IconEye, IconLayout, IconListTree } from "./icons";

const ITEMS: { id: PanelId; label: string; icon: JSX.Element }[] = [
  { id: "video", label: "Cámara", icon: <IconEye width={15} height={15} /> },
  {
    id: "incidents",
    label: "Incidentes",
    icon: <IconListTree width={15} height={15} />,
  },
  {
    id: "details",
    label: "Detalle",
    icon: <IconAlert width={15} height={15} />,
  },
];

export function Dock() {
  const panels = usePanels((s) => s.panels);
  const setVisible = usePanels((s) => s.setVisible);
  const resetLayout = usePanels((s) => s.resetLayout);

  return (
    <div className="dock">
      <span className="dock-label">Paneles</span>
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
  );
}
