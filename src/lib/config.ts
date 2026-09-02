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

export const VIDEO_URL = `${API_BASE}/api/video`;
export const VIDEO_META_URL = `${API_BASE}/api/video/meta`;
export const INFERENCE_WS_URL = `${WS_BASE}/ws/inference?stride=${STRIDE}`;

export const CAMERA = {
  lat: Number(import.meta.env.VITE_CAMERA_LAT ?? "4.60971"),
  lng: Number(import.meta.env.VITE_CAMERA_LNG ?? "-74.08175"),
  name: import.meta.env.VITE_CAMERA_NAME ?? "Cámara 1",
};
