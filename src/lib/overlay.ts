import type { FrameResult, Point, Track } from "./types";

/** Class colors mirror scripts/test_vision_engine.py (BGR -> CSS RGB). */
const CLASS_COLORS: Record<string, string> = {
  car: "rgb(0, 120, 255)",
  motorcycle: "rgb(255, 165, 0)",
  truck: "rgb(255, 0, 255)",
  bus: "rgb(255, 210, 0)",
  pedestrian: "rgb(255, 60, 60)",
  ciclist: "rgb(0, 220, 220)",
  monopatin: "rgb(167, 139, 250)",
};
const DEFAULT_COLOR = "rgb(0, 220, 120)";
const INCIDENT_COLOR = "rgb(255, 40, 40)";

function colorFor(className: string): string {
  return CLASS_COLORS[className] ?? DEFAULT_COLOR;
}

/** A registered incident, drawn as a fixed marker on every frame. */
export interface IncidentMarker {
  id: string;
  bbox: { x1: number; y1: number; x2: number; y2: number };
  label: string;
  color: string;
  hot: boolean;
}

export interface DrawOptions {
  /** canvas pixels per source pixel */
  scale: number;
  showTrails: boolean;
  showLabels: boolean;
  highlight?: Set<number>;
  /** persistent incident markers (shown regardless of the current frame) */
  incidents?: IncidentMarker[];
  /** road polygon in normalized 0..1 coords — the area traffic level measures */
  roadRoi?: Point[] | null;
}

export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  frame: FrameResult | null,
  opts: DrawOptions,
): void {
  const { canvas } = ctx;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const s = opts.scale;

  // under everything else: it's context, not a detection
  if (opts.roadRoi?.length) drawRoadRoi(ctx, opts.roadRoi);

  if (frame) {
    if (opts.showTrails) {
      for (const track of frame.tracks) drawTrail(ctx, track, s);
    }
    for (const track of frame.tracks) {
      drawTrack(ctx, track, s, opts);
    }
  }

  // incident markers stay put where the incident was registered
  if (opts.incidents) {
    for (const marker of opts.incidents) drawIncidentMarker(ctx, marker, s);
  }
}

/** The ROI is normalized (0..1), so it maps onto the canvas box directly —
 *  no source-pixel scaling needed. */
function drawRoadRoi(ctx: CanvasRenderingContext2D, roi: Point[]): void {
  const { width, height } = ctx.canvas;

  ctx.save();
  ctx.beginPath();
  roi.forEach(([x, y], i) => {
    const px = x * width;
    const py = y * height;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();

  ctx.fillStyle = "rgba(56, 189, 248, 0.10)";
  ctx.fill();

  ctx.strokeStyle = "rgba(56, 189, 248, 0.75)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.stroke();
  ctx.restore();
}

function drawIncidentMarker(
  ctx: CanvasRenderingContext2D,
  marker: IncidentMarker,
  s: number,
): void {
  const { x1, y1, x2, y2 } = marker.bbox;
  const x = x1 * s;
  const y = y1 * s;
  const w = (x2 - x1) * s;
  const h = (y2 - y1) * s;
  const color = marker.color || INCIDENT_COLOR;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = marker.hot ? 3 : 2;
  ctx.setLineDash(marker.hot ? [] : [7, 5]);
  if (marker.hot) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
  }
  ctx.strokeRect(x, y, w, h);
  ctx.restore();

  const text = `⚠ ${marker.label}`;
  ctx.font = "600 12px system-ui, sans-serif";
  const tw = ctx.measureText(text).width + 12;
  const th = 18;
  const ty = Math.max(0, y - th);
  ctx.fillStyle = color;
  ctx.fillRect(x, ty, tw, th);
  ctx.fillStyle = "#fff";
  ctx.fillText(text, x + 6, ty + 13);
}

function drawTrack(
  ctx: CanvasRenderingContext2D,
  track: Track,
  s: number,
  opts: DrawOptions,
): void {
  const [x1, y1, x2, y2] = track.bbox;
  const color = colorFor(track.class_name);
  const isHot = opts.highlight?.has(track.track_id) ?? false;

  ctx.lineWidth = isHot ? 4 : 2;
  ctx.strokeStyle = isHot ? INCIDENT_COLOR : color;
  ctx.strokeRect(x1 * s, y1 * s, (x2 - x1) * s, (y2 - y1) * s);

  if (opts.showLabels) {
    const speed =
      track.speed != null ? `  ${track.speed.toFixed(1)} px/f` : "";
    label(
      ctx,
      `${track.class_name} #${track.track_id}${speed}`,
      x1 * s,
      y1 * s,
      isHot ? INCIDENT_COLOR : color,
    );
  }
}

function drawTrail(
  ctx: CanvasRenderingContext2D,
  track: Track,
  s: number,
): void {
  if (track.trail.length < 2) return;
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = colorFor(track.class_name);
  ctx.globalAlpha = 0.5;
  track.trail.forEach(([x, y], i) => {
    const px = x * s;
    const py = y * s;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  bg: string,
): void {
  ctx.font = "12px system-ui, sans-serif";
  const w = ctx.measureText(text).width + 8;
  const h = 16;
  const top = Math.max(0, y - h);
  ctx.fillStyle = bg;
  ctx.fillRect(x, top, w, h);
  ctx.fillStyle = "#fff";
  ctx.fillText(text, x + 4, top + 12);
}
