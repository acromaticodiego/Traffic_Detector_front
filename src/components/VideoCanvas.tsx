import { useEffect, useMemo, useRef, useState } from "react";
import { drawOverlay } from "../lib/overlay";
import type { IncidentMarker } from "../lib/overlay";
import {
  incidentType,
  severity,
  MARKER_MIN_CONFIDENCE,
  MARKER_STICKY_CONFIDENCE,
} from "../lib/incidents";
import { useVideoSrc } from "../hooks/useVideoSrc";
import { useStore } from "../state/store";
import { log } from "../state/logs";
import type { TrafficInfo } from "../lib/types";
import { TrafficBadge } from "./TrafficBadge";
import { IconPause, IconPlay } from "./icons";

/** Rendered content box of a letterboxed (object-fit: contain) video,
 *  in CSS pixels relative to the video element's own box. */
function contentRect(video: HTMLVideoElement) {
  const cw = video.clientWidth;
  const ch = video.clientHeight;
  const vw = video.videoWidth || cw;
  const vh = video.videoHeight || ch;
  if (!vw || !vh) return { x: 0, y: 0, w: cw, h: ch, sourceW: vw || 1 };

  const boxAspect = cw / ch;
  const vidAspect = vw / vh;
  let w = cw;
  let h = ch;
  if (boxAspect > vidAspect) {
    h = ch;
    w = ch * vidAspect;
  } else {
    w = cw;
    h = cw / vidAspect;
  }
  return {
    x: video.offsetLeft + (cw - w) / 2,
    y: video.offsetTop + (ch - h) / 2,
    w,
    h,
    sourceW: vw,
  };
}

export function VideoCanvas() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { src, error } = useVideoSrc();
  const meta = useStore((s) => s.meta);
  const lastFrameId = useStore((s) => s.lastFrameId);

  const [showTrails, setShowTrails] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showRoi, setShowRoi] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [curFrame, setCurFrame] = useState(0);
  const [traffic, setTraffic] = useState<TrafficInfo | null>(null);

  // Keep the video from running ahead of what the pipeline has processed,
  // so the overlay boxes always sit on the right objects.
  const [sync, setSync] = useState(true);
  const [waiting, setWaiting] = useState(false);
  const syncRef = useRef(true);
  const autoPausedRef = useRef(false);
  const userPausedRef = useRef(false);
  // Set right before a play()/pause() we issue ourselves, so the media event
  // handlers can tell a sync stall apart from the user hitting the button.
  const programmaticRef = useRef(false);
  syncRef.current = sync;

  const selectedIncident = useStore((s) =>
    s.incidents.find((i) => i.id === s.selectedIncidentId),
  );
  const highlight = useMemo(
    () => new Set(selectedIncident?.track_ids ?? []),
    [selectedIncident],
  );

  // Time-synced overlay render loop.
  useEffect(() => {
    let raf = 0;
    const dpr = window.devicePixelRatio || 1;

    const tick = () => {
      raf = requestAnimationFrame(tick);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const state = useStore.getState();
      const m = state.meta;
      if (!video || !canvas || !ctx || !m) return;

      // 1. keep the canvas exactly over the visible video content
      const rect = contentRect(video);
      canvas.style.left = `${rect.x}px`;
      canvas.style.top = `${rect.y}px`;
      canvas.style.width = `${rect.w}px`;
      canvas.style.height = `${rect.h}px`;
      const bw = Math.max(1, Math.round(rect.w * dpr));
      const bh = Math.max(1, Math.round(rect.h * dpr));
      if (canvas.width !== bw) canvas.width = bw;
      if (canvas.height !== bh) canvas.height = bh;

      // 2. pace the video to the inference frontier
      const frontierT = state.lastFrameId / m.fps;
      const SAFE = 0.25;
      const done = state.status === "done" || state.status === "error";

      if (syncRef.current && !done && state.lastFrameId > 0) {
        if (
          !video.paused &&
          !autoPausedRef.current &&
          video.currentTime >= frontierT - SAFE
        ) {
          programmaticRef.current = true;
          video.pause();
          autoPausedRef.current = true;
          setWaiting(true);
        } else if (
          autoPausedRef.current &&
          !userPausedRef.current &&
          video.currentTime < frontierT - SAFE - 0.4
        ) {
          programmaticRef.current = true;
          void video.play();
          autoPausedRef.current = false;
          setWaiting(false);
        }
      } else if (autoPausedRef.current) {
        autoPausedRef.current = false;
        setWaiting(false);
        if (!userPausedRef.current) {
          programmaticRef.current = true;
          void video.play();
        }
      }

      // 3. draw the result for the frame currently shown
      const fid = Math.round(video.currentTime * m.fps);
      setCurFrame(fid);
      const frame = state.frameAt(fid);
      const scale = canvas.width / (rect.sourceW || m.width);

      const selId = state.selectedIncidentId;
      const grace = Math.round(2 * m.fps); // 2 s de gracia
      const lead = Math.round(0.3 * m.fps);
      const markers: IncidentMarker[] = state.incidents
        .filter((inc) => {
          if (!inc.bbox) return false;
          // < 90 % -> nunca se dibuja el marcador
          if (inc.confidence < MARKER_MIN_CONFIDENCE) return false;
          if (fid < inc.frame_id - lead) return false;
          // >= 95 % -> fijo; entre 90 y 95 % -> caduca 2 s tras perder los objetos
          if (inc.confidence >= MARKER_STICKY_CONFIDENCE) return true;
          const last = state.incidentActivity.get(inc.id) ?? inc.frame_id;
          return fid <= last + grace;
        })
        .map((inc) => ({
          id: inc.id,
          bbox: inc.bbox!,
          label: incidentType(inc.incident_type).label,
          color: severity(inc.confidence).color,
          hot: inc.id === selId,
        }));

      drawOverlay(ctx, frame, {
        scale,
        showTrails,
        showLabels,
        highlight,
        incidents: markers,
        roadRoi: showRoi ? m.road_roi : null,
      });

      // Occupancy drifts every frame; only re-render when something the
      // badge actually prints changes.
      const tinfo = frame?.traffic ?? null;
      setTraffic((prev) =>
        prev?.level === tinfo?.level &&
        prev?.vehicles === tinfo?.vehicles &&
        Math.round((prev?.occupancy ?? 0) * 100) ===
          Math.round((tinfo?.occupancy ?? 0) * 100)
          ? prev
          : tinfo,
      );
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showTrails, showLabels, showRoi, highlight]);

  // Seek when an incident is selected.
  useEffect(() => {
    const video = videoRef.current;
    if (video && selectedIncident?.t != null) {
      video.currentTime = selectedIncident.t;
    }
  }, [selectedIncident]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      userPausedRef.current = false;
      autoPausedRef.current = false;
      setWaiting(false);
      void v.play();
    } else {
      userPausedRef.current = true;
      v.pause();
    }
  };

  const processedT = meta ? lastFrameId / meta.fps : 0;

  return (
    <div className="video-inner">
      <div className="video-wrap">
        {src ? (
          <video
            ref={videoRef}
            className="video-el"
            src={src}
            controls
            playsInline
            onPlay={(e) => {
              setPlaying(true);
              if (!autoPausedRef.current) userPausedRef.current = false;
              if (programmaticRef.current) programmaticRef.current = false;
              else
                log({
                  kind: "video",
                  level: "ok",
                  t: e.currentTarget.currentTime,
                  text: "Reproducción iniciada",
                });
            }}
            onPause={(e) => {
              setPlaying(false);
              if (!autoPausedRef.current) userPausedRef.current = true;
              if (programmaticRef.current) programmaticRef.current = false;
              else if (!e.currentTarget.ended)
                log({
                  kind: "video",
                  level: "info",
                  t: e.currentTarget.currentTime,
                  text: "Video pausado",
                });
            }}
            onEnded={(e) => {
              log({
                kind: "video",
                level: "info",
                t: e.currentTarget.currentTime,
                text: "Video finalizado",
              });
            }}
          />
        ) : (
          <div className="video-placeholder">
            {error ? `Error cargando video: ${error}` : "Cargando video…"}
          </div>
        )}
        <canvas ref={canvasRef} className="overlay-canvas" />
        <TrafficBadge traffic={traffic} />
        {waiting && (
          <div className="sync-wait">
            <span className="sync-spin" /> esperando inferencia…
          </div>
        )}
      </div>

      <div className="video-controls">
        <button onClick={togglePlay}>
          {playing ? (
            <IconPause width={13} height={13} />
          ) : (
            <IconPlay width={13} height={13} />
          )}
          {playing ? "Pausa" : "Reproducir"}
        </button>
        <label>
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
          />
          Etiquetas
        </label>
        <label>
          <input
            type="checkbox"
            checked={showTrails}
            onChange={(e) => setShowTrails(e.target.checked)}
          />
          Trayectorias
        </label>
        <label title="Área de calzada sobre la que se mide la ocupación (VISION_ROAD_ROI)">
          <input
            type="checkbox"
            checked={showRoi}
            onChange={(e) => setShowRoi(e.target.checked)}
            disabled={!meta?.road_roi}
          />
          Vía
        </label>
        <label title="El video no adelanta a la inferencia (cajas siempre sincronizadas)">
          <input
            type="checkbox"
            checked={sync}
            onChange={(e) => setSync(e.target.checked)}
          />
          Sincronizar
        </label>
        <span className="spacer" />
        <span className="frame-count">
          frame {curFrame}
          {meta ? ` / ${meta.frame_count}` : ""} · inferencia hasta{" "}
          {processedT.toFixed(1)}s
        </span>
      </div>
    </div>
  );
}
