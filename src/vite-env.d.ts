/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_WS_BASE?: string;
  readonly VITE_STRIDE?: string;
  readonly VITE_CAMERA_LAT?: string;
  readonly VITE_CAMERA_LNG?: string;
  readonly VITE_CAMERA_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
