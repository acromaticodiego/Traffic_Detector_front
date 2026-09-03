# Traffic Detector — Frontend

Panel React que reproduce el video quemado y dibuja encima, en vivo y
sincronizado, la inferencia del `vision_service` (cajas, IDs, trayectorias,
incidentes).

## Requisitos

- Node.js 20 LTS (22 LTS o 24 también funcionan)
- El backend `vision_service` corriendo (ver `../traffic_detector`)

📌 **Versiones fijadas** (React 18.3.x, react-leaflet 4.x, Vite 5.x, …): ver
`../traffic_detector/STACK.md`. No subir majors sin actualizar ese documento.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local     # ajusta si hace falta
npm run dev                     # http://localhost:5173
```

## Configuración (`.env.local`)

| Variable | Descripción |
|---|---|
| `VITE_API_BASE` | URL HTTP del backend (`http://localhost:8000` o el https de ngrok) |
| `VITE_WS_BASE`  | URL WebSocket del backend (`ws://localhost:8000` o `wss://…ngrok…`) |
| `VITE_STRIDE`   | Procesar 1 de cada N frames (2–3 recomendado para tiempo real) |
| `VITE_CAMERA_LAT/LNG/NAME` | Marcador de cámara en el mapa (stub) |

## Con ngrok (un túnel gratis)

En `../traffic_detector`:

```bash
ngrok http 8000
```

Copia la URL `https://XXXX.ngrok-free.app` a `.env.local`:

```
VITE_API_BASE=https://XXXX.ngrok-free.app
VITE_WS_BASE=wss://XXXX.ngrok-free.app
```

El frontend detecta el dominio ngrok y descarga el video con el header
`ngrok-skip-browser-warning` (se guarda como blob en memoria; ok para el clip de
demo). Recuerda fijar `VISION_CORS_ORIGINS` en el backend al origen del frontend.

## Interfaz

- **Mapa de fondo** a pantalla completa (`MapBackground`, Leaflet + OSM recoloreado).
- **Paneles flotantes de vidrio** encima (`FloatingPanel`): Cámara, Incidentes,
  Detalle. Cada uno se **arrastra** por su barra de título, se **minimiza** (−) y
  se **oculta** (×).
- **Dock abajo-izquierda** (`Dock`): mostrar/guardar cada panel y "Restablecer"
  posiciones. Las posiciones se guardan en `localStorage`.

### Badge de tráfico

El nivel lo calcula el backend por **ocupación de la calzada + velocidad**, no
contando vehículos (ver `../traffic_detector/services/vision_service/README.md`).
El badge muestra el porcentaje de vía ocupada y por qué salió ese nivel
("denso, pero fluye" ≠ "vía llena y detenida").

La casilla **Vía** del panel de cámara dibuja el polígono `VISION_ROAD_ROI`
sobre el video; sirve para ver si la ROI quedó bien recortada. Aparece
deshabilitada cuando el backend no tiene ROI configurada (mide el frame
completo).

## Estructura

```
src/
  App.tsx                  monta MapBackground + StatusBar + FloatingPanels + Dock
  hooks/
    useInferenceSocket.ts  WS -> store
    useVideoSrc.ts         resuelve el src del <video> (directo o blob ngrok)
  components/
    MapBackground.tsx      mapa a pantalla completa detrás de todo
    FloatingPanel.tsx      ventana flotante (drag / minimizar / ocultar / resize)
    Dock.tsx               menú inferior-izquierdo
    VideoCanvas.tsx        <video> + <canvas>, loop rAF de sincronía
    TrafficBadge / IncidentList / IncidentDetails / StatusBar
    icons.tsx              re-export de lucide-react (IconXxx)
  lib/
    overlay.ts             dibujo del canvas
    types.ts               tipos (espejo de serializers.py)
    config.ts              lectura de env
  state/
    store.ts               zustand: datos de visión (meta, frames, incidents)
    panels.ts              zustand + persist: posición/estado de los paneles
```
