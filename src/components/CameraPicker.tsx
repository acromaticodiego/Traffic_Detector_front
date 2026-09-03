import { useCameras } from "../state/cameras";
import { IconCamera } from "./icons";

export function CameraPicker() {
  const list = useCameras((s) => s.list);
  const selectedId = useCameras((s) => s.selectedId);
  const loading = useCameras((s) => s.loading);
  const error = useCameras((s) => s.error);
  const select = useCameras((s) => s.select);

  if (error) {
    return (
      <span className="cam-picker error" title={error}>
        <IconCamera width={14} height={14} />
        Sin registro de cámaras
      </span>
    );
  }

  if (loading || list.length === 0) {
    return (
      <span className="cam-picker loading">
        <IconCamera width={14} height={14} />
        Cargando cámaras…
      </span>
    );
  }

  const current = list.find((c) => c.id === selectedId);

  return (
    <span className="cam-picker" title={current?.notes || undefined}>
      <IconCamera width={14} height={14} />
      <select
        value={selectedId ?? ""}
        onChange={(e) => select(e.target.value)}
        aria-label="Cámara"
      >
        {list.map((c) => (
          <option key={c.id} value={c.id} disabled={!c.available}>
            {c.name}
            {c.available ? "" : " (no disponible)"}
          </option>
        ))}
      </select>
      {current && !current.calibrated && (
        <span
          className="cam-warn"
          title="Esta cámara no tiene ROI de calzada: la ocupación se mide sobre el frame completo"
        >
          sin calibrar
        </span>
      )}
    </span>
  );
}
