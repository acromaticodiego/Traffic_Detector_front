const rawApi = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
const rawWs = import.meta.env.VITE_WS_BASE ?? "ws://localhost:8000";

export const API_BASE = rawApi.replace(/\/$/, "");
export const WS_BASE = rawWs.replace(/\/$/, "");

// stride > 1 skips frames -> faster but weaker tracking / incident detection.
// Keep 1 unless the machine can't keep up (then "Sincronizar" paces the video).
export const STRIDE = Number(import.meta.env.VITE_STRIDE ?? "1") || 1;

/** ngrok's free tier shows an interstitial page for browser GETs. */
export const IS_NGROK = /ngrok/i.test(API_BASE);

/** Header that skips the ngrok browser-warning page. */
export const NGROK_HEADERS: Record<string, string> = IS_NGROK
  ? { "ngrok-skip-browser-warning": "true" }
  : {};

/**
 * Wire format this build expects. The service reports its own in the `meta`
 * message; a mismatch means one of the two is stale, which is otherwise
 * invisible — both sides keep talking and the payload just misses fields.
 * Keep in sync with services/vision_service/app/api/protocol.py.
 */
export const PROTOCOL_VERSION = 2;

export const CAMERAS_URL = `${API_BASE}/api/cameras`;

/** Every stream URL is camera-scoped; omitting the id lets the service pick
 *  the first camera in its registry. */
function withCamera(base: string, camera?: string | null): string {
  return camera ? `${base}${base.includes("?") ? "&" : "?"}camera=${encodeURIComponent(camera)}` : base;
}

export const videoUrl = (camera?: string | null) =>
  withCamera(`${API_BASE}/api/video`, camera);

export const videoMetaUrl = (camera?: string | null) =>
  withCamera(`${API_BASE}/api/video/meta`, camera);

export const inferenceWsUrl = (camera?: string | null) =>
  withCamera(`${WS_BASE}/ws/inference?stride=${STRIDE}`, camera);

/** Map fallback for when the service reports no coordinates for a camera.
 *  Real positions now come from cameras.yaml, not from the frontend env. */
export const CAMERA_FALLBACK = {
  lat: Number(import.meta.env.VITE_CAMERA_LAT ?? "4.60971"),
  lng: Number(import.meta.env.VITE_CAMERA_LNG ?? "-74.08175"),
  name: import.meta.env.VITE_CAMERA_NAME ?? "Cámara",
};
