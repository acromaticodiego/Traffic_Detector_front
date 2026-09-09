# Traffic Detector — Frontend

Interfaz web de **Traffic Detector**. Consume el servicio de visión
(`../traffic_detector` · FastAPI) y presenta, sobre un mapa a pantalla completa,
la inferencia en vivo de la cámara seleccionada: seguimiento de objetos, nivel
de tráfico e incidentes.

Ya no es una sola pantalla. La aplicación entra por un **inicio de sesión** y se
organiza en tres secciones —consola, dashboard y administración— que un menú
lateral abre y que cada rol ve o no según sus permisos.

- **Backend:** `../traffic_detector` (repo aparte, debe estar corriendo).
- **Versiones fijadas** (React 18.3.x, react-leaflet 4.x, Vite 5.x…): ver
  `../traffic_detector/STACK.md`. No subir majors sin actualizar ese documento.

---

## Requisitos

- **Node.js 20 LTS** (22 / 24 también funcionan). Gestor de paquetes: **npm**.
- El backend `vision_service` corriendo (por defecto en `http://localhost:8000`),
  con su base de datos migrada y al menos una cuenta creada.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local     # ajusta si hace falta
npm run dev                     # abre la URL que imprime Vite (normalmente :5173)
```

Sin una cuenta en el backend no se pasa del login. La primera se crea desde el
servicio, con `scripts/create_user.py`; a partir de ahí las demás se crean desde
la sección de Administración.

Otros scripts: `npm run build` (`tsc -b && vite build`) · `npm run preview`.

## Calidad (lint y tests)

```bash
npm run lint        # ESLint (TypeScript + reglas de hooks de React)
npm run typecheck   # tsc -b
npm test            # Vitest, una pasada
npm run test:watch  # Vitest en modo watch mientras desarrollas
```

Los tests cubren la lógica que se rompe en silencio, no los componentes:

| Archivo | Qué protege |
|---|---|
| `lib/incidents` | Umbrales de severidad de un incidente |
| `lib/incidentData` | Los hechos del detalle, incluidos los métricos |
| `lib/review` | Estados de revisión y acciones disponibles en cada uno |
| `lib/session` | Cabeceras de sesión y el token en la URL del WebSocket |
| `lib/sections` | Qué secciones ve cada rol y a cuál caer si la guardada ya no vale |
| `lib/analytics` | Formato de duraciones y la tasa de validez |
| `state/store` | Búsqueda del frame sincronizado y *upsert* de incidentes |
| `state/panels` | Recorte de posición y tamaño de los paneles flotantes |

`.github/workflows/ci.yml` corre esos cuatro pasos —lint, tipos, tests y
build— en cada push a `main` y en cada pull request.

---

## Sesión y roles

El backend exige autenticación en todas sus rutas, así que la aplicación arranca
comprobando el token guardado antes de decidir qué pintar: mientras comprueba no
enseña nada, porque pintar el login ahí lo haría parpadear en cada recarga con
sesión válida.

El token vive en `localStorage` y viaja en la cabecera `Authorization` de cada
petición. La única excepción es el WebSocket de inferencia, que lo lleva en la
query: la API de WebSocket del navegador no permite mandar cabeceras propias al
abrir la conexión. Es una concesión conocida y acotada a esa sola ruta.

**Los permisos que trae la sesión solo sirven para dibujar la interfaz** —
esconder lo que ese rol no puede usar. Quien decide de verdad es el backend, que
los vuelve a comprobar en cada petición: esconder un botón no impide llamar a la
API con `curl`.

Tres roles, definidos en el backend:

| Rol | Qué puede |
|---|---|
| `admin` | Todo, incluidas las cuentas y la analítica del equipo |
| `analista` | Ver el vivo y emitir veredictos sobre incidentes |
| `operario` | Ver el vivo y consultar el histórico, sin decidir |

La barra superior muestra siempre con qué cuenta y con qué rol estás trabajando:
si alguien no encuentra un botón, lo primero que tiene que poder comprobar es con
qué rol entró.

## Navegación

Menú lateral izquierdo, en cajón: un tirador lo abre, un velo lo cierra al tocar
fuera y `Escape` también. Es un cajón y no una columna fija porque 208 px
permanentes se los quitaba a una consola cuyos paneles ya llenan la pantalla.

Las secciones salen de un registro único (`lib/sections.tsx`). **Añadir una es
añadir una entrada ahí**: la barra la dibuja y el armazón la enruta sin tocar
ninguno de los dos. Cada entrada declara el permiso que necesita su contenido, y
si el rol actual ya no puede abrir la sección guardada se cae a la primera
disponible en vez de dejar la pantalla en blanco.

Cambiar de sección **no desmonta la consola, la oculta**. Desmontarla cerraría el
WebSocket de inferencia y volver a ella reprocesaría el vídeo desde el primer
frame.

---

## Sección «Interfaz» — la consola

### Selector de cámara
En la barra superior. Se alimenta de `GET /api/cameras`, así que la lista y las
coordenadas las define el backend, no el frontend. Al cambiar de cámara se
reconecta el WebSocket, se cambia la fuente del `<video>` y el mapa vuela a la
nueva posición.

La elección se recuerda en `localStorage` (`td-camera`); si esa cámara ya no
existe en el registro, se cae a la primera disponible. Una cámara sin ROI de
calzada se marca con una etiqueta **«sin calibrar»**, y las que el backend no
puede alcanzar aparecen deshabilitadas.

### Mapa de fondo
Ocupa toda la pantalla. Teselas de **OpenStreetMap** recoloreadas a oscuro por
CSS (sin API key). Marcador de la cámara con halo pulsante en las coordenadas que
reporta el backend para la cámara activa. Zoom abajo-derecha. Es interactivo en
las zonas que no tapan los paneles.

### Paneles flotantes de vidrio
Cuatro paneles sobre el mapa — **Cámara**, **Incidentes**, **Detalle** y
**Gestor de incidentes** — semitransparentes con desenfoque. Cada uno:

- se **arrastra** por su barra de título,
- se **minimiza** (colapsa a la barra),
- se **oculta** (✕),
- se **redimensiona** por dos esquinas,
- pasa **al frente** al hacer clic.

Los dos tiradores de redimensión no hacen lo mismo. El de la **esquina inferior
derecha** crece hacia abajo y a la derecha. El de la **esquina superior derecha**
(flecha diagonal) mantiene fijo el borde inferior, de modo que el panel crece
hacia arriba — útil para el de vídeo, que tiene otro panel justo debajo.

**Dock** abajo-izquierda: muestra o guarda cada panel y **«Restablecer»** vuelve
todo a su posición por defecto. Se **pliega a su cabecera** para devolverle mapa
a la pantalla, y plegado sigue diciendo cuántos paneles hay abiertos: un cajón
cerrado que no informa de nada obliga a abrirlo solo para saber si hacía falta.
Posiciones, tamaños y el estado del dock se guardan en `localStorage`.

### Vídeo + overlay en vivo
El `<video>` reproduce el mp4 servido por el backend y un `<canvas>` dibuja
encima, **sincronizado por tiempo** (`currentTime × fps → frame`):

- Cajas por clase con color propio + `track_id` + velocidad (px/frame).
- Trayectorias (polilínea del recorrido reciente).
- **Badge de nivel de tráfico** (ver abajo).
- **Marcadores de incidente**: caja + etiqueta «⚠ …» **fija en el lugar** donde
  ocurrió, coloreada por severidad (rojo confirmado / ámbar por confirmar). El
  seleccionado se resalta con brillo.
- **Polígono de la calzada** con la casilla **Vía**: dibuja la ROI sobre la que
  el backend mide la ocupación, para comprobar que quedó bien recortada. Se
  deshabilita cuando la cámara activa no tiene ROI (mide el frame completo).

El canvas se ajusta al recinto real del vídeo (considerando el letterbox de
`object-fit: contain` y el `devicePixelRatio`), así el overlay queda exacto.

El clip **no se apunta directamente desde `<video src>`**: se pide con `fetch`,
con las cabeceras de sesión, y se entrega como blob. Un elemento `<video>` lanza
su propia petición y no puede poner la cabecera `Authorization`, así que
apuntarlo a una ruta protegida devuelve 401 y deja el reproductor vacío y sin
mensaje. El coste es que el clip se descarga entero antes de reproducirse; con
una grabación larga habría que pasar a un token corto en la URL, como ya hace el
socket.

### Badge de tráfico
El nivel lo calcula el backend por **ocupación de la calzada + velocidad**, no
contando vehículos. El badge muestra el porcentaje de vía ocupada, el número de
vehículos y por qué salió ese nivel: *«vía despejada»*, *«circulación lenta»*,
*«vía congestionada»*. La explicación va al lado del número a propósito — un
porcentaje sin motivo no le dice a un agente si tiene que actuar.

### Gestor de incidentes
La bandeja de revisión: filtra por confianza mínima y por estado, y sobre cada
caso permite **confirmar**, **descartar** o **archivar**. Descartar nunca borra la
fila — ese registro es la única medida de cuánto se equivoca el detector.

Quien revisa se toma de la sesión, no de lo que mande el cliente: si el cliente
elige el nombre, la traza de quién revisó no vale nada. A los roles sin el
permiso se les ocultan las acciones y se les explica por qué, en vez de
ofrecerles un botón que va a responder 403.

### Detalle del incidente
Los hechos del caso, ordenados por lo que más rápido resuelve la duda. Con la
cámara calibrada por homografía aparecen además los datos métricos que el
backend solo puede dar entonces:

- **Desenlace** — si un vehículo quedó inmovilizado o los dos siguieron
  circulando. Va primero a propósito: dos cajas que se tocan en la imagen son
  ambiguas (la cámara aplasta la escena contra un plano), pero «siguieron
  circulando» le dice a un agente en un segundo que es casi seguro un falso
  positivo, sin mirar la foto.
- **Separación real** en metros y **tiempo hasta la colisión** en segundos, con
  el mismo umbral de conflicto que usa el motor.

Sin homografía esos campos no vienen y la lista simplemente no los incluye: los
incidentes viejos y las cámaras sin calibrar se ven igual que antes.

También ofrece el **resumen con IA** del caso, para los roles que lo tengan
permitido, con su aviso de que es material para la decisión y no la decisión.

---

## Sección «Dashboard»

La analítica de quien está en turno. Cada cual ve la suya; un administrador puede
elegir a otra persona y ver además la tabla del equipo con quién está en turno
ahora mismo.

- **Tiempo activo hoy**, con el contador corriendo si el turno está abierto.
- **Revisados hoy**, con el desglose de confirmados y descartados.
- **Tasa de validez**: qué fracción de lo revisado resultó ser un incidente real.
  Sale en blanco, no en cero, mientras no haya ningún veredicto — un cero se
  leería como «se equivoca siempre» en vez de «aún no ha revisado nada».
- **Cortes de conexión**, con su número y su duración.
- Dos gráficas de los últimos 14 días: tiempo activo y revisiones.
- Los últimos 25 registros con su veredicto y su nota.

### Cómo se mide el turno
La consola manda un latido periódico y el hueco entre dos latidos decide la
cuenta:

- Un hueco **por debajo de la tolerancia** (10 min por defecto) se acredita
  entero. Es lo que dura un corte de internet o una pestaña que el navegador
  congeló, y descontarle ese tiempo a alguien que estaba trabajando sería
  castigarlo por su conexión.
- Un hueco mayor acredita la tolerancia y **anota el resto como corte visible**.
  No se descuenta en silencio: el supervisor lee «seis horas, con un corte de
  media hora» en vez de un número más bajo sin explicación.
- Pasado el límite (60 min por defecto) el turno se da por terminado y el
  siguiente latido abre uno nuevo, para que una pestaña olvidada abierta el
  viernes no facture el fin de semana.

El latido vive en el armazón y no en la consola: quien pasa la mañana en el
gestor de incidentes está trabajando igual. Cerrar sesión cierra el turno antes
de soltar el token.

---

## Sección «Administración»

Solo para roles con `users:manage`. Lista las cuentas, crea nuevas, cambia el rol
y activa o desactiva. Sustituye a tener que entrar al servidor a correr
`scripts/create_user.py`.

Una persona es más que un correo: se guardan también **cédula** y **teléfono**.
En la base viven como dígitos pelados —es lo que hace que la unicidad funcione,
porque `1.234.567.890` y `1234567890` son dos filas distintas para la base y la
misma persona para todo el mundo— y aquí se muestran con el formato con el que se
escriben.

Las cuentas que la migración rellenó con un valor de relleno se **marcan como
tales** en vez de enseñar `0000000001` como si fuera el documento de alguien: un
relleno que parece un dato es peor que un hueco visible, porque nadie corrige lo
que no sabe que está mal.

La sección incluye además **qué permite cada rol**, tal como lo reporta el
backend, para no tener que adivinarlo.

---

## Diseño

La paleta —marino, terracota y mostaza— vive en `styles.css` y en
`lib/palette.ts`, que es la que usa el canvas del overlay. **Si cambia una,
cambia la otra.**

Cada familia significa algo y por eso no se usa para decorar: la **terracota es
alarma** y la **mostaza es precaución**, y si se usaran de adorno dejarían de
leerse como urgencia. Para tener con qué jugar sin romper eso, la interfaz tiene
un **acento violeta puramente decorativo** (degradados, halos, el indicador de
sección activa). No sirve como color de dato junto al acero: en deuteranopía se
separan ΔE 5.6, o sea que en una gráfica serían la misma barra para mucha gente.

Los colores de las gráficas se eligen con un validador de contraste y visión
cromática, no a ojo. Por eso el desglose de veredictos muestra solo confirmados
frente a descartados y deja archivados como cifra aparte: el par acero/gris no
llega al mínimo ni con visión normal.

El movimiento sale de un único juego de duraciones y curvas —mezclar tiempos hace
que una pantalla parezca ensamblada de piezas sueltas— y **todo se apaga con
`prefers-reduced-motion`**. No es un detalle de cortesía: para algunas personas el
movimiento provoca mareo, y esta es una pantalla de turno completo.

---

## Estado que se guarda en el navegador

| Clave | Qué guarda |
|---|---|
| `td-token` | El token de sesión |
| `td-camera` | La última cámara elegida |
| `td-panels` | Posición, tamaño y visibilidad de los paneles |
| `td-view` | Sección activa y si el dock y el menú están abiertos |

## Variables de entorno

Se copian de `.env.example` a `.env.local`.

| Variable | Para qué |
|---|---|
| `VITE_API_BASE` | Base HTTP del servicio de visión |
| `VITE_WS_BASE` | Base WebSocket del mismo servicio |
| `VITE_STRIDE` | 1 = procesar todos los frames. Subirlo solo si la máquina no da abasto |
| `VITE_CAMERA_LAT` / `_LNG` / `_NAME` | Respaldo del marcador si el backend no reporta coordenadas |

Detrás de un túnel de ngrok hay que usar las URL `https`/`wss`; la aplicación lo
detecta y añade sola la cabecera que salta la página de advertencia.

## Contrato con el backend

`PROTOCOL_VERSION = 3`, declarado en `lib/config.ts`. El servicio anuncia el suyo
en el mensaje `meta` y una discrepancia significa que uno de los dos está viejo
— algo que si no se comprueba es invisible, porque los dos lados siguen hablando
y lo único que pasa es que faltan campos.

Una fuente en vivo llega con `frame_count: null`, que no es lo mismo que `0`:
`null` significa que no hay final contra el que medir, y la interfaz deja de
mostrar el total en vez de enseñar un cero.

Rutas que consume: `/api/auth/login` · `/api/auth/me` · `/api/cameras` ·
`/api/video` · `/api/incidents` (con revisión, resumen y evidencia) ·
`/api/shifts/heartbeat` y `/close` · `/api/analytics/me` y `/users` ·
`/api/users` · y el socket `/ws/inference`.
