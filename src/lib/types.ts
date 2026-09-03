/** Mirrors services/vision_service/app/api/serializers.py */

export type BBox = [number, number, number, number]; // x1, y1, x2, y2
export type Point = [number, number];

export interface Track {
  track_id: number;
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: BBox;
  center: Point;
  trail: Point[];
  speed?: number;
  direction?: number;
  moving?: boolean;
  abrupt_change?: boolean;
  acceleration?: number | null;
}

export interface Incident {
  incident_id?: string | null;
  incident_type: string;
  track_ids: number[];
  confidence: number;
  bbox: { x1: number; y1: number; x2: number; y2: number } | null;
  data: Record<string, unknown>;
  t: number | null;
}

export interface VisionEvent {
  event_type: string;
  timestamp: string;
  confidence: number;
  track_ids: number[];
  data: Record<string, unknown>;
}

export interface CameraInfo {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  /** false = no road polygon drawn yet, occupancy covers the whole frame */
  calibrated: boolean;
  /** false = the service cannot reach the source right now */
  available: boolean;
  thresholds: { medium: number; high: number };
  notes: string;
}

export type TrafficLevel = "bajo" | "medio" | "alto";

export interface TrafficInfo {
  level: TrafficLevel;
  /** vehicles standing on the road ROI this frame */
  vehicles: number;
  people: number;
  /** 0..1 fraction of the road area covered by vehicles (smoothed).
   *  Optional: a vision service older than the occupancy rework omits it. */
  occupancy?: number;
  /** px/frame, corrected for perspective and stride */
  mean_speed?: number;
  /** 0..1 speed relative to free flow */
  speed_ratio?: number;
  /** 0..1 fraction of vehicles below the "stopped" speed */
  stopped?: number;
  /** occupancy as a percentage, for quick reading */
  score: number;
}

export interface MetaMessage {
  type: "meta";
  /** wire format the service speaks; compared against PROTOCOL_VERSION */
  protocol?: number;
  /** the camera this stream belongs to */
  camera?: CameraInfo;
  fps: number;
  frame_count: number;
  width: number;
  height: number;
  stride: number;
  /** occupancy thresholds (0..1) the backend uses for medio / alto */
  traffic_thresholds: { medium: number; high: number };
  /** road polygon in normalized 0..1 coords; null = whole frame.
   *  Optional for the same reason as the traffic fields above. */
  road_roi?: Point[] | null;
}

export interface FrameMessage {
  type: "frame";
  frame_id: number;
  t: number;
  tracks: Track[];
  incidents: Incident[];
  events: VisionEvent[];
  traffic: TrafficInfo;
}

export interface IncidentMessage extends Incident {
  type: "incident";
}

export interface DoneMessage {
  type: "done";
  frames: number;
  processed: number;
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

export type StreamMessage =
  | MetaMessage
  | FrameMessage
  | IncidentMessage
  | DoneMessage
  | ErrorMessage;

export interface FrameResult {
  frame_id: number;
  t: number;
  tracks: Track[];
  incidents: Incident[];
  traffic: TrafficInfo | null;
}

export type SocketStatus =
  | "idle"
  | "connecting"
  | "streaming"
  | "done"
  | "error"
  | "closed";
