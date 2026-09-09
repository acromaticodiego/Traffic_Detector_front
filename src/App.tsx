import { useEffect } from "react";
import { useInferenceSocket } from "./hooks/useInferenceSocket";
import { useHeartbeat } from "./hooks/useHeartbeat";
import { StatusBar } from "./components/StatusBar";
import { VideoCanvas } from "./components/VideoCanvas";
import { IncidentList } from "./components/IncidentList";
import { IncidentDetails } from "./components/IncidentDetails";
import { ReviewPanel } from "./components/ReviewPanel";
import { MapBackground } from "./components/MapBackground";
import { FloatingPanel } from "./components/FloatingPanel";
import { Dock } from "./components/Dock";
import { LogDrawer } from "./components/LogDrawer";
import { Sidebar } from "./components/Sidebar";
import { DashboardView } from "./components/views/DashboardView";
import { AdminView } from "./components/views/AdminView";
import { IconCone, IconEye, IconReview, IconSiren } from "./components/icons";
import { useStore } from "./state/store";
import { useCameras } from "./state/cameras";
import { usePanels } from "./state/panels";
import { useAuth } from "./state/auth";
import { useView } from "./state/view";
import { resolveSection } from "./lib/sections";
import { LoginScreen } from "./components/LoginScreen";

/**
 * Decide qué se ve: la aplicación, el login, o nada mientras se comprueba.
 *
 * El armazón es un componente aparte a propósito. Si sus hooks —el socket de
 * inferencia, el store— vivieran aquí, quedarían DESPUÉS de un `return`
 * condicional, y React exige que todos los hooks se llamen en el mismo orden
 * en cada render. Al montarse y desmontarse el armazón entero, además, el
 * WebSocket se cierra solo al cerrar sesión.
 */
export default function App() {
  const user = useAuth((s) => s.user);
  const checking = useAuth((s) => s.checking);
  const restore = useAuth((s) => s.restore);

  useEffect(() => {
    void restore();
  }, [restore]);

  // Mientras se comprueba el token guardado no se decide nada: pintar el
  // login aquí lo haría parpadear en cada recarga con sesión válida.
  if (checking) return <div className="booting">Cargando…</div>;

  if (!user) return <LoginScreen />;

  return <Shell />;
}

/**
 * La aplicación con sesión: navegación a la izquierda y la sección activa a
 * la derecha.
 *
 * El socket de inferencia vive aquí y no dentro de la consola porque cambiar
 * de sección no debe cortarlo. La consola se OCULTA en vez de desmontarse por
 * lo mismo: desmontarla cerraría el WebSocket, y con el pipeline actual volver
 * a ella reprocesaría el video desde el primer frame.
 */
function Shell() {
  const can = useAuth((s) => s.can);
  const guardada = useView((s) => s.section);
  const go = useView((s) => s.go);

  const section = resolveSection(guardada, can);

  // Corrige el store cuando la sección guardada ya no está permitida, para
  // que la barra lateral no quede marcando una sección que no se está viendo.
  useEffect(() => {
    if (section !== guardada) go(section);
  }, [section, guardada, go]);

  // The socket stays idle until this resolves and picks a camera.
  const loadCameras = useCameras((s) => s.load);

  useEffect(() => {
    void loadCameras();
  }, [loadCameras]);

  // Reajusta los paneles cuando cambia el tamaño de la ventana. Sus
  // posiciones son absolutas y persistidas, así que sin esto un panel
  // colocado con la ventana ancha queda fuera de pantalla al reducirla —o al
  // cambiar de monitor— con su barra de título inalcanzable, que es la única
  // forma de arrastrarlo de vuelta.
  const reflow = usePanels((s) => s.reflow);

  useEffect(() => {
    reflow();

    window.addEventListener("resize", reflow);
    return () => window.removeEventListener("resize", reflow);
  }, [reflow]);

  const { connect } = useInferenceSocket();

  // El turno se cuenta con la sesión abierta, no con la consola a la vista:
  // quien pasa la mañana en el gestor de incidentes está trabajando igual.
  useHeartbeat(true);

  return (
    <div className="app">
      <MapBackground />

      <Sidebar />

      <div className="shell">
        <StatusBar onReconnect={connect} section={section} />

        <Console hidden={section !== "console"} />

        {section === "dashboard" && <DashboardView />}
        {section === "admin" && <AdminView />}
      </div>
    </div>
  );
}

function Console({ hidden }: { hidden: boolean }) {
  const incidentCount = useStore((s) => s.incidents.length);

  return (
    <div className="console" hidden={hidden}>
      <FloatingPanel
        id="incidents"
        title="Incidentes"
        icon={<IconSiren width={14} height={14} />}
        headerRight={
          incidentCount > 0 ? (
            <span className="count-chip">{incidentCount}</span>
          ) : null
        }
      >
        <IncidentList />
      </FloatingPanel>

      <FloatingPanel
        id="video"
        title="Cámara · inferencia en vivo"
        icon={<IconEye width={14} height={14} />}
        pad={false}
      >
        <VideoCanvas />
      </FloatingPanel>

      <FloatingPanel
        id="details"
        title="Detalle del incidente"
        icon={<IconCone width={14} height={14} />}
      >
        <IncidentDetails />
      </FloatingPanel>

      <FloatingPanel
        id="review"
        title="Gestor de incidentes"
        icon={<IconReview width={14} height={14} />}
      >
        <ReviewPanel />
      </FloatingPanel>

      <Dock />
      <LogDrawer />
    </div>
  );
}
