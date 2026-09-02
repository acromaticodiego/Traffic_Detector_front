import { useCallback, useEffect, useRef } from "react";
import { INFERENCE_WS_URL } from "../lib/config";
import type { StreamMessage } from "../lib/types";
import { useStore } from "../state/store";

/**
 * Opens the inference WebSocket and pipes messages into the store.
 * Returns { connect, disconnect }. Auto-connects once on mount.
 */
export function useInferenceSocket() {
  const wsRef = useRef<WebSocket | null>(null);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const connect = useCallback(() => {
    disconnect();

    const store = useStore.getState();
    store.reset();
    store.setStatus("connecting");

    const ws = new WebSocket(INFERENCE_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => useStore.getState().setStatus("streaming");

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
          break;
        case "frame":
          s.addFrame({
            frame_id: msg.frame_id,
            t: msg.t,
            tracks: msg.tracks,
            incidents: msg.incidents,
            traffic: msg.traffic ?? null,
          });
          for (const inc of msg.incidents) s.addIncident(inc, msg.frame_id);
          break;
        case "incident": {
          const { type, ...incident } = msg;
          void type;
          s.addIncident(incident, s.lastFrameId);
          break;
        }
        case "done":
          s.setStatus("done");
          break;
        case "error":
          s.setStatus("error", msg.message);
          break;
      }
    };

    ws.onerror = () =>
      useStore.getState().setStatus("error", "WebSocket error");

    ws.onclose = () => {
      const st = useStore.getState().status;
      if (st !== "done" && st !== "error") {
        useStore.getState().setStatus("closed");
      }
    };
  }, [disconnect]);

  useEffect(() => {
    // Small delay so React 18 StrictMode's mount→unmount→mount in dev
    // doesn't actually open (and immediately reset) a real socket.
    const t = window.setTimeout(connect, 80);
    return () => {
      window.clearTimeout(t);
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { connect, disconnect };
}
