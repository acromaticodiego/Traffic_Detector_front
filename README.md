# Traffic Detector — Frontend

Interfaz web de **Traffic Detector**. Consume el servicio de visión
(`../traffic_detector` · FastAPI) y muestra, sobre un mapa a pantalla completa, la
inferencia en vivo de la cámara seleccionada: seguimiento de objetos, nivel de
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

### Selector de cámara
En la barra superior. Se alimenta de `GET /api/cameras`, así que la lista y las
coordenadas las define el backend, no el frontend. Al cambiar de cámara se
reconecta el WebSocket, se cambia la fuente del `<video>` y el mapa vuela a la
nueva posición.

La elección se recuerda en `localStorage` (`td-camera`); si esa cámara ya no
existe en el registro, se cae a la primera disponible. Una cámara sin ROI de
calzada se marca con una etiqueta **"sin calibrar"**, y las que el backend no
puede alcanzar aparecen deshabilitadas.

### Mapa de fondo
Ocupa toda la pantalla. Teselas de **OpenStreetMap** recoloreadas a oscuro por CSS
(sin API key). Marcador de la cámara con halo pulsante en las coordenadas que
reporta el backend para la cámara activa. Zoom abajo-derecha. Es interactivo en
las zonas que no tapan los paneles.

### Paneles flotantes de vidrio
Tres paneles sobre el mapa — **Cámara**, **Incidentes**, **Detalle** — semi
transparentes con desenfoque. Cada uno:

- se **arrastra** por su barra de título,
- se **minimiza** (colapsa a la barra),
- se **oculta** (✕),
- se **redimensiona** por dos esquinas,
- pasa **al frente** al hacer click.

Los dos tiradores de redimensión no hacen lo mismo. El de la **esquina inferior
derecha** crece hacia abajo y a la derecha. El de la **esquina superior derecha**
(flecha diagonal) mantiene fijo el borde inferior, de modo que el panel crece
hacia arriba — útil para el de vídeo, que tiene otro panel justo debajo.

**Dock** abajo-izquierda: muestra/guarda cada panel y **"Restablecer"** vuelve todo
a su posición por defecto. Las posiciones y tamaños se guardan en `localStorage`
(`td-panels`).

### Video + overlay en vivo
El `<video>` reproduce el mp4 servido por el backend y un `<canvas>` dibuja encima,
**sincronizado por tiempo** (`currentTime × fps → frame`):

- Cajas por clase con color propio + `track_id` + velocidad (px/frame).
- Trayectorias (polilínea del recorrido reciente).
- **Badge de nivel de tráfico** (ver abajo).
- **Marcadores de incidente**: caja + etiqueta "⚠ …" **fija en el lugar** donde
  ocurrió el incidente, coloreada por severidad (rojo confirmado / ámbar por
  confirmar). El seleccionado se resalta con brillo.
- **Polígono de la calzada** con la casilla **Vía**: dibuja la ROI sobre la que el
  backend mide la ocupación, para comprobar que quedó bien recortada. Se
  deshabilita cuando la cámara activa no tiene ROI (mide el frame completo).

El canvas se ajusta al recinto real del video (considerando el letterbox de
`object-fit: contain` y el `devicePixelRatio`), así el overlay queda exacto.

### Badge de tráfico
El nivel lo calcula el backend por **ocupación de la calzada + velocidad**, no
contando vehículos. El badge muestra el porcentaje de vía ocupada, el número de
vehículos y por qué salió ese nivel: *"vía despejada"*, *"denso, pero fluye"*,
*"vía llena, avance lento"* o *"vía llena y detenida"*.
