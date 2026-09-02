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

export type TrafficLevel = "bajo" | "medio" | "alto";

export interface TrafficInfo {
  level: TrafficLevel;
  vehicles: number;
  people: number;
  score: number;
}

export interface MetaMessage {
  type: "meta";
  fps: number;
  frame_count: number;
  width: number;
  height: number;
  stride: number;
  traffic_thresholds: { medium: number; high: number };
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
