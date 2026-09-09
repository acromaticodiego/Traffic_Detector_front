import { useStore } from "../state/store";
import { IconLogout, IconRefresh, IconTower } from "./icons";
import { useAuth } from "../state/auth";
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
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const status = useStore((s) => s.status);
  const error = useStore((s) => s.error);
  const meta = useStore((s) => s.meta);
  const processed = useStore((s) => s.processed);

  return (
    <header className="topbar">
      <span className="brand">
        <span className="brand-mark">
          <IconTower width={16} height={16} />
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

      {user && (
        <div className="whoami" title={user.email}>
          <div className="whoami-text">
            <strong>{user.full_name || user.email}</strong>
            {/* El rol a la vista: si alguien no encuentra un botón, lo
                primero que tiene que poder comprobar es con qué rol entró. */}
            <span>{user.role}</span>
          </div>
          <button className="ghost" onClick={logout} title="Cerrar sesión">
            <IconLogout width={14} height={14} />
          </button>
        </div>
      )}
    </header>
  );
}
