import { MapContainer, Marker, Popup, TileLayer, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CAMERA } from "../lib/config";
import { useStore } from "../state/store";

const camIcon = L.divIcon({
  className: "",
  html: '<div class="cam-marker"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10],
});

/**
 * Full-bleed live map that sits BEHIND everything. The floating
 * panels are translucent, so the map colour tints them and shifts
 * as the user pans/zooms.
 */
export function MapBackground() {
  const incidentCount = useStore((s) => s.incidents.length);

  return (
    <div className="map-bg">
      <MapContainer
        center={[CAMERA.lat, CAMERA.lng]}
        zoom={15}
        zoomControl={false}
        attributionControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        {/* OSM tiles recoloured to a dark basemap via CSS (no API key). */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <ZoomControl position="bottomright" />
        <Marker position={[CAMERA.lat, CAMERA.lng]} icon={camIcon}>
          <Popup>
            <strong>{CAMERA.name}</strong>
            <br />
            {incidentCount} incidente(s)
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
