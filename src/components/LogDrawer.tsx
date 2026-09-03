import { useMemo, useState } from "react";
import { useLogs, type LogKind, type LogEntry } from "../state/logs";
import { IconChevronRight, IconLogs, IconTrash } from "./icons";

const KIND_LABEL: Record<LogKind, string> = {
  sistema: "Sistema",
  video: "Video",
  incidente: "Incidentes",
  trafico: "Tráfico",
};

const FILTERS: (LogKind | "todo")[] = [
  "todo",
  "incidente",
  "trafico",
  "video",
  "sistema",
];

function clock(at: number): string {
  return new Date(at).toLocaleTimeString("es-CO", { hour12: false });
}

/** Video position as m:ss, so a line can be matched against the player. */
function stamp(t: number | null | undefined): string | null {
  if (t == null || !Number.isFinite(t)) return null;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Row({ entry }: { entry: LogEntry }) {
  const at = stamp(entry.t);

  return (
    <li className={`log-row ${entry.level}`}>
      <span className="log-time">{clock(entry.at)}</span>
      <span className="log-body">
        <span className="log-text">
          {entry.text}
          {at && <span className="log-at">{at}</span>}
        </span>
        {entry.detail && <span className="log-detail">{entry.detail}</span>}
      </span>
    </li>
  );
}

export function LogDrawer() {
  const entries = useLogs((s) => s.entries);
  const open = useLogs((s) => s.open);
  const unseen = useLogs((s) => s.unseen);
  const toggle = useLogs((s) => s.toggle);
  const clear = useLogs((s) => s.clear);

  const [filter, setFilter] = useState<LogKind | "todo">("todo");

  const shown = useMemo(
    () => (filter === "todo" ? entries : entries.filter((e) => e.kind === filter)),
    [entries, filter],
  );

  return (
    <>
      <button
        className={`log-handle${open ? " open" : ""}`}
        onClick={toggle}
        title={open ? "Contraer registro" : "Desplegar registro"}
      >
        <IconLogs width={15} height={15} />
        <span className="log-handle-text">Registro</span>
        {!open && unseen > 0 && <span className="log-badge">{unseen}</span>}
      </button>

      <aside className={`log-drawer${open ? " open" : ""}`}>
        <header className="log-head">
          <IconLogs width={14} height={14} />
          <strong>Registro de actividad</strong>
          <span className="spacer" />
          <button title="Limpiar" onClick={clear} disabled={entries.length === 0}>
            <IconTrash width={13} height={13} />
          </button>
          <button title="Contraer" onClick={toggle}>
            <IconChevronRight width={15} height={15} />
          </button>
        </header>

        <div className="log-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`log-chip${filter === f ? " on" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "todo" ? "Todo" : KIND_LABEL[f]}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="log-empty">
            {entries.length === 0
              ? "Sin actividad todavía."
              : "Nada en este filtro."}
          </p>
        ) : (
          <ul className="log-list">
            {shown.map((e) => (
              <Row key={e.id} entry={e} />
            ))}
          </ul>
        )}
      </aside>
    </>
  );
}
