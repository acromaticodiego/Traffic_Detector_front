import { useRef, type ReactNode } from "react";
import { usePanels, type PanelId } from "../state/panels";
import { IconClose, IconGrip, IconMinus, IconResize } from "./icons";

interface Props {
  id: PanelId;
  title: string;
  icon?: ReactNode;
  headerRight?: ReactNode;
  /** pad the body (default true). Video panel sets false. */
  pad?: boolean;
  children: ReactNode;
}

export function FloatingPanel({
  id,
  title,
  icon,
  headerRight,
  pad = true,
  children,
}: Props) {
  const box = usePanels((s) => s.panels[id]);
  const move = usePanels((s) => s.move);
  const resize = usePanels((s) => s.resize);
  const resizeNE = usePanels((s) => s.resizeNE);
  const toggleMin = usePanels((s) => s.toggleMin);
  const setVisible = usePanels((s) => s.setVisible);
  const focus = usePanels((s) => s.focus);

  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const rez = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const rezNE = useRef<
    { x: number; y: number; w: number; h: number; bottom: number } | null
  >(null);

  if (!box.visible) return null;

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    focus(id);
    drag.current = { dx: e.clientX - box.x, dy: e.clientY - box.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onHeaderPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    move(id, e.clientX - drag.current.dx, e.clientY - drag.current.dy);
  };
  const endDrag = (e: React.PointerEvent) => {
    drag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  const onResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    focus(id);
    rez.current = { x: e.clientX, y: e.clientY, w: box.w, h: box.h };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onResizePointerMove = (e: React.PointerEvent) => {
    if (!rez.current) return;
    resize(
      id,
      rez.current.w + (e.clientX - rez.current.x),
      rez.current.h + (e.clientY - rez.current.y),
    );
  };
  const endResize = () => {
    rez.current = null;
  };

  const onResizeNEPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    focus(id);
    rezNE.current = {
      x: e.clientX,
      y: e.clientY,
      w: box.w,
      h: box.h,
      bottom: box.y + box.h,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onResizeNEPointerMove = (e: React.PointerEvent) => {
    const start = rezNE.current;
    if (!start) return;
    resizeNE(
      id,
      start.w + (e.clientX - start.x),
      start.h - (e.clientY - start.y),
      start.bottom,
    );
  };
  const endResizeNE = () => {
    rezNE.current = null;
  };

  return (
    <section
      className={`fpanel${box.minimized ? " min" : ""}`}
      style={{
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.minimized ? undefined : box.h,
        zIndex: box.z,
      }}
      onPointerDown={() => focus(id)}
    >
      <header
        className="fpanel-head"
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <IconGrip className="fpanel-grip" width={14} height={14} />
        <span className="fpanel-title">
          {icon}
          {title}
        </span>
        <span className="fpanel-hr">{headerRight}</span>
        <span className="fpanel-actions">
          <button
            title={box.minimized ? "Expandir" : "Minimizar"}
            onClick={() => toggleMin(id)}
          >
            <IconMinus width={14} height={14} />
          </button>
          <button title="Ocultar" onClick={() => setVisible(id, false)}>
            <IconClose width={14} height={14} />
          </button>
        </span>
      </header>

      {!box.minimized && (
        <div
          className="fpanel-resize-ne"
          title="Arrastra para cambiar el tamaño"
          onPointerDown={onResizeNEPointerDown}
          onPointerMove={onResizeNEPointerMove}
          onPointerUp={endResizeNE}
          onPointerCancel={endResizeNE}
        >
          <IconResize width={13} height={13} />
        </div>
      )}

      {!box.minimized && (
        <div className={`fpanel-body${pad ? "" : " nopad"}`}>{children}</div>
      )}

      {!box.minimized && (
        <div
          className="fpanel-resize"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={endResize}
          onPointerCancel={endResize}
        />
      )}
    </section>
  );
}
