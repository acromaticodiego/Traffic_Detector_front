import { useCallback, useEffect, useRef } from "react";
import { inferenceWsUrl, PROTOCOL_VERSION } from "../lib/config";
import { clearLiveFrame, setLiveFrame } from "../lib/liveFrame";
import { wsUrlWithToken } from "../lib/session";
import type { StreamMessage } from "../lib/types";
import { useStore } from "../state/store";
import { log, useLogs } from "../state/logs";
import { useCameras } from "../state/cameras";

/**
 * Opens the inference WebSocket and pipes messages into the store.
 * Returns { connect, disconnect }. Auto-connects once on mount.
 */
export function useInferenceSocket() {
  const wsRef = useRef<WebSocket | null>(null);

  /** Last traffic level announced, so only transitions get logged. */
  const levelRef = useRef<string | null>(null);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const connect = useCallback((cameraId?: string | null) => {
    const camera = cameraId ?? useCameras.getState().selectedId;

    if (!camera) return;

    disconnect();

    const store = useStore.getState();
    store.reset();
    clearLiveFrame();
    store.setStatus("connecting");

    levelRef.current = null;
    useLogs.getState().clear();
    const name = useCameras.getState().list.find((c) => c.id === camera)?.name;
    log({
      kind: "sistema",
      level: "info",
      text: `Conectando a ${name ?? camera}`,
    });

    const ws = new WebSocket(wsUrlWithToken(inferenceWsUrl(camera)));
    wsRef.current = ws;

    ws.onopen = () => {
      useStore.getState().setStatus("streaming");
      log({ kind: "sistema", level: "ok", text: "Inferencia en vivo iniciada" });
    };

    ws.onmessage = (ev) => {
      let msg: StreamMessage;
      try {
        msg = JSON.parse(ev.data as string);
      } catch {
        return;
      }
      const s = useStore.getState();

      switch (msg.type) {
        case "meta":
          s.setMeta(msg);
          // Both sides keep working when these drift, they just disagree on
          // which fields exist — so say it out loud instead of failing later.
          if (msg.protocol != null && msg.protocol !== PROTOCOL_VERSION) {
            log({
              kind: "sistema",
              level: "alert",
              text: "Versión de protocolo distinta",
              detail:
                `el servicio habla v${msg.protocol} y esta interfaz v${PROTOCOL_VERSION}; ` +
                "reinicia el que esté desactualizado",
            });
          }
          log({
            kind: "sistema",
            level: "info",
            text: msg.frame_count != null ? "Video cargado" : "Cámara conectada",
            detail:
              `${msg.width}×${msg.height} · ${msg.fps} fps · ` +
              // Una fuente en vivo no tiene duración: no hay número que dar.
              (msg.frame_count != null
                ? `${msg.frame_count} frames · `
                : "fuente en vivo · ") +
              (msg.road_roi?.length
                ? `calzada de ${msg.road_roi.length} vértices`
                : "sin ROI de calzada"),
          });
          break;
        case "frame":
          if (msg.image) void setLiveFrame(msg.frame_id, msg.image);
          s.addFrame({
            frame_id: msg.frame_id,
            t: msg.t,
            tracks: msg.tracks,
            incidents: msg.incidents,
            traffic: msg.traffic ?? null,
          });
          for (const inc of msg.incidents) s.addIncident(inc, msg.frame_id);

          if (msg.traffic && msg.traffic.level !== levelRef.current) {
            const prev = levelRef.current;
            levelRef.current = msg.traffic.level;
            const occ = msg.traffic.occupancy;
            // The first frame is a baseline, not a change worth flagging.
            log({
              kind: "trafico",
              level: msg.traffic.level === "alto" ? "warn" : "info",
              t: msg.t,
              text: prev
                ? `Tráfico ${prev} → ${msg.traffic.level}`
                : `Tráfico ${msg.traffic.level}`,
              detail:
                `${msg.traffic.vehicles} vehículos` +
                (typeof occ === "number"
                  ? ` · ${(occ * 100).toFixed(0)} % de la calzada`
                  : " · nivel por conteo (servicio antiguo)"),
            });
          }
          s.noteTrackActivity(
            msg.frame_id,
            msg.tracks.map((t) => t.track_id),
          );
          break;
        case "incident": {
          const { type, ...incident } = msg;
          void type;
          s.addIncident(incident, s.lastFrameId);
          break;
        }
        case "done":
          s.setStatus("done");
          log({
            kind: "sistema",
            level: "ok",
            text: "Procesamiento completo",
            detail: `${msg.processed} de ${msg.frames} frames analizados`,
          });
          break;
        case "error":
          s.setStatus("error", msg.message);
          log({ kind: "sistema", level: "alert", text: "Error del servicio", detail: msg.message });
          break;
      }
    };

    ws.onerror = () => {
      useStore.getState().setStatus("error", "WebSocket error");
      log({ kind: "sistema", level: "alert", text: "Fallo de conexión con el servicio" });
    };

    ws.onclose = () => {
      const st = useStore.getState().status;
      if (st !== "done" && st !== "error") {
        useStore.getState().setStatus("closed");
        log({ kind: "sistema", level: "warn", text: "Conexión cerrada" });
      }
    };
  }, [disconnect]);

  const selectedId = useCameras((st) => st.selectedId);

  // Reconnects whenever the operator switches camera: the service runs one
  // session at a time, so switching means tearing the old one down.
  useEffect(() => {
    if (!selectedId) return;

    // Small delay so React 18 StrictMode's mount→unmount→mount in dev
    // doesn't actually open (and immediately reset) a real socket.
    const t = window.setTimeout(() => connect(selectedId), 80);
    return () => {
      window.clearTimeout(t);
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return { connect, disconnect };
}
