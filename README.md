# Traffic Detector — Frontend

Interfaz web de **Traffic Detector**. Consume el servicio de visión
(`../traffic_detector` · FastAPI) y muestra, sobre un mapa a pantalla completa, la
inferencia en vivo del video de la cámara: seguimiento de objetos, nivel de
tráfico e incidentes.

- **Backend:** `../traffic_detector` (repo aparte, debe estar corriendo).
- **Versiones fijadas** (React 18.3.x, react-leaflet 4.x, Vite 5.x…): ver
  `../traffic_detector/STACK.md`. No subir majors sin actualizar ese documento.

---

## Requisitos

- **Node.js 20 LTS** (22 / 24 también funcionan). Gestor de paquetes: **npm**.
- El backend `vision_service` corriendo (por defecto en `http://localhost:8000`).

## Puesta en marcha

```bash
npm install
cp .env.example .env.local     # ajusta si hace falta
npm run dev                     # abre la URL que imprime Vite (normalmente :5173)
```

Otros scripts: `npm run build` (`tsc -b && vite build`) · `npm run preview`.

---

## Qué hace

### Mapa de fondo
Ocupa toda la pantalla. Teselas de **OpenStreetMap** recoloreadas a oscuro por CSS
(sin API key). Marcador de la cámara con halo pulsante en las coordenadas de
`.env.local`. Zoom abajo-derecha. Es interactivo en las zonas que no tapan los
paneles.

### Paneles flotantes de vidrio
Tres paneles sobre el mapa — **Cámara**, **Incidentes**, **Detalle** — semi
transparentes con desenfoque. Cada uno:

- se **arrastra** por su barra de título,
- se **minimiza** (colapsa a la barra),
- se **oculta** (✕),
- se **redimensiona** por la esquina inferior derecha,
- pasa **al frente** al hacer click.

**Dock** abajo-izquierda: muestra/guarda cada panel y **"Restablecer"** vuelve todo
a su posición por defecto. Las posiciones y tamaños se guardan en `localStorage`
(`td-panels`).

### Video + overlay en vivo
El `<video>` reproduce el mp4 servido por el backend y un `<canvas>` dibuja encima,
**sincronizado por tiempo** (`currentTime × fps → frame`):

- Cajas por clase con color propio + `track_id` + velocidad (px/frame).
- Trayectorias (polilínea del recorrido reciente).
- **Badge de nivel de tráfico** (🟢 bajo / 🟡 medio / 🔴 alto + nº de vehículos).
- **Marcadores de incidente**: caja + etiqueta "⚠ …" **fija en el lugar** donde
  ocurrió el incidente, coloreada por severidad (rojo confirmado / ámbar por
  confirmar). El seleccionado se resalta con brillo.

El canvas se ajusta al recinto real del video (considerando el letterbox de
`object-fit: contain` y el `devicePixelRatio`), así el overlay queda exacto.

### Modo "Sincronizar"
Activado por defecto. El video **no avanza más allá de lo ya procesado** por el
motor: si la inferencia va por detrás, el video se pausa solo (aviso
"⏳ esperando inferencia…") y reanuda cuando el motor lo alcanza. Así el overlay
siempre coincide con la imagen. Se puede desactivar con el checkbox.

### Incidentes
- **Lista** (panel Incidentes): tipo, **severidad** (Confirmado / Por confirmar),
  confianza, instante, nº de objetos e IDs. Barra de color por severidad.
- Click en un incidente → el video **salta a ese instante** y **resalta** los
  objetos involucrados en el overlay.
- **Detalle** (panel Detalle): tipo, estado, confianza, instante, objetos, frame y
  el análisis crudo del pipeline (JSON).
- Detecciones solapadas del mismo evento se **fusionan** (llegan con el mismo
  `incident_id` y el store hace *upsert* en lugar de duplicar).

### Barra superior
Marca, **estado de la conexión** (punto pulsante: en vivo / procesamiento
completo / error), resolución · fps · frames procesados, y botón **"Reiniciar"**
que reabre la conexión y reprocesa desde el inicio.

### Soporte ngrok
Si `VITE_API_BASE` apunta a un dominio `ngrok`, el video se descarga como blob con
el header que salta el aviso interstitial (el `<video src>` directo no funcionaría
ahí). En local se usa la URL directa (con soporte Range para el seek).

---

## Configuración (`.env.local`)

| Variable | Ejemplo | Descripción |
|---|---|---|
| `VITE_API_BASE` | `http://localhost:8000` | URL HTTP del backend (o el `https://…ngrok-free.app`) |
| `VITE_WS_BASE`  | `ws://localhost:8000` | URL WebSocket del backend (o `wss://…`) |
| `VITE_STRIDE`   | `1` | Procesar 1 de cada N frames. **1 = mejor tracking y detección de incidentes**; subir solo si la máquina no alcanza |
| `VITE_CAMERA_LAT` / `VITE_CAMERA_LNG` | `4.60971` / `-74.08175` | Posición del marcador de cámara en el mapa |
| `VITE_CAMERA_NAME` | `Cámara 1` | Nombre del marcador |

Vite solo lee `.env.local` **al arrancar** → si lo cambias, reinicia `npm run dev`.

---

## Con ngrok

En `../traffic_detector`:

```bash
ngrok http 8000
```

Copia `https://XXXX.ngrok-free.app` a `.env.local`:

```
VITE_API_BASE=https://XXXX.ngrok-free.app
VITE_WS_BASE=wss://XXXX.ngrok-free.app
```

Reinicia `npm run dev`. Fija `VISION_CORS_ORIGINS` en el backend al origen del
frontend. La URL de ngrok cambia en cada reinicio (plan gratis).

---

## Estructura

```
src/
├── main.tsx                 punto de entrada
├── App.tsx                  monta MapBackground + StatusBar + FloatingPanels + Dock
├── styles.css               tema oscuro (tokens CSS, glass, layout)
├── lib/
│   ├── config.ts            lee las VITE_* (API/WS/stride/cámara, detección de ngrok)
│   ├── types.ts             tipos del contrato WS (Track, Incident, mensajes…)
│   ├── overlay.ts           dibujo del canvas (cajas, trayectorias, marcadores de incidente)
│   └── incidents.ts         etiqueta/color por tipo, niveles de severidad
├── state/
│   ├── store.ts             zustand: datos de visión (meta, frames, incidents, selección)
│   └── panels.ts            zustand + persist: posición/tamaño/estado de los paneles
├── hooks/
│   ├── useInferenceSocket.ts  abre el WS y vuelca meta/frame/incident/done al store
│   └── useVideoSrc.ts       resuelve el src del <video> (directo o blob para ngrok)
└── components/
    ├── MapBackground.tsx    mapa Leaflet a pantalla completa
    ├── FloatingPanel.tsx    ventana flotante (arrastrar / minimizar / ocultar / redimensionar)
    ├── Dock.tsx             menú inferior-izquierdo
    ├── StatusBar.tsx        barra superior
    ├── VideoCanvas.tsx      <video> + <canvas>, loop de sincronía, controles, modo Sincronizar
    ├── TrafficBadge.tsx     píldora de nivel de tráfico
    ├── IncidentList.tsx     lista de incidentes
    ├── IncidentDetails.tsx  detalle del incidente seleccionado
    └── icons.tsx            re-export de lucide-react (IconXxx)
```

---

## Stack

React 18 · Vite 5 · TypeScript 5 · **zustand** 4 (estado, con `persist` para los
paneles) · **react-leaflet** 4 + Leaflet 1.9 (mapa) · **lucide-react** (iconos,
importados siempre desde `src/components/icons.tsx`). CSS plano, sin framework de
UI. Detalle de versiones en `../traffic_detector/STACK.md`.

> Nota: en desarrollo, `window.__store` y `window.__panels` quedan expuestos para
> depurar desde la consola.
