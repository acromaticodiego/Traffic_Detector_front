import { useInferenceSocket } from "./hooks/useInferenceSocket";
import { StatusBar } from "./components/StatusBar";
import { VideoCanvas } from "./components/VideoCanvas";
import { IncidentList } from "./components/IncidentList";
import { IncidentDetails } from "./components/IncidentDetails";
import { MapBackground } from "./components/MapBackground";
import { FloatingPanel } from "./components/FloatingPanel";
import { Dock } from "./components/Dock";
import { IconAlert, IconEye, IconListTree } from "./components/icons";
import { useStore } from "./state/store";

export default function App() {
  const { connect } = useInferenceSocket();
  const incidentCount = useStore((s) => s.incidents.length);

  return (
    <div className="app">
      <MapBackground />

      <StatusBar onReconnect={connect} />

      <FloatingPanel
        id="incidents"
        title="Incidentes"
        icon={<IconListTree width={14} height={14} />}
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
        icon={<IconAlert width={14} height={14} />}
      >
        <IncidentDetails />
      </FloatingPanel>

      <Dock />
    </div>
  );
}
