import { useStore } from "../state/store";
import { IconEye, IconRefresh } from "./icons";
import { CameraPicker } from "./CameraPicker";

const STATUS_LABEL: Record<string, string> = {
  idle: "Inactivo",
  connecting: "Conectando…",
  streaming: "En vivo",
  done: "Procesamiento completo",
  error: "Error",
  closed: "Conexión cerrada",
};

export function StatusBar({ onReconnect }: { onReconnect: () => void }) {
  const status = useStore((s) => s.status);
  const error = useStore((s) => s.error);
  const meta = useStore((s) => s.meta);
  const processed = useStore((s) => s.processed);

  return (
    <header className="topbar">
      <span className="brand">
        <span className="brand-mark">
          <IconEye width={16} height={16} />
        </span>
        Traffic Intelligence
      </span>

      <CameraPicker />

      <span className={`live ${status}`}>
        <span className="live-dot" />
        {STATUS_LABEL[status] ?? status}
      </span>

      {meta && (
        <span className="stat">
          {meta.width}×{meta.height} · {meta.fps} fps · {processed} frames
        </span>
      )}
      {error && <span className="error-text">{error}</span>}

      <span className="spacer" />

      <button className="ghost" onClick={onReconnect}>
        <IconRefresh width={14} height={14} />
        Reiniciar
      </button>
    </header>
  );
}
