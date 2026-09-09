import { useEffect } from "react";
import { useInferenceSocket } from "./hooks/useInferenceSocket";
import { StatusBar } from "./components/StatusBar";
import { VideoCanvas } from "./components/VideoCanvas";
import { IncidentList } from "./components/IncidentList";
import { IncidentDetails } from "./components/IncidentDetails";
import { ReviewPanel } from "./components/ReviewPanel";
import { MapBackground } from "./components/MapBackground";
import { FloatingPanel } from "./components/FloatingPanel";
import { Dock } from "./components/Dock";
import { LogDrawer } from "./components/LogDrawer";
import { IconCone, IconEye, IconReview, IconSiren } from "./components/icons";
import { useStore } from "./state/store";
import { useCameras } from "./state/cameras";
import { useAuth } from "./state/auth";
import { LoginScreen } from "./components/LoginScreen";

/**
 * Decide qué se ve: la consola, el login, o nada mientras se comprueba.
 *
 * La consola es un componente aparte a propósito. Si sus hooks —el socket de
 * inferencia, el store— vivieran aquí, quedarían DESPUÉS de un `return`
 * condicional, y React exige que todos los hooks se llamen en el mismo orden
 * en cada render. Al montarse y desmontarse la consola entera, además, el
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

  return <Console />;
}

function Console() {
  // The socket stays idle until this resolves and picks a camera.
  const loadCameras = useCameras((s) => s.load);

  useEffect(() => {
    void loadCameras();
  }, [loadCameras]);

  const { connect } = useInferenceSocket();
  const incidentCount = useStore((s) => s.incidents.length);

  return (
    <div className="app">
      <MapBackground />

      <StatusBar onReconnect={connect} />

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
