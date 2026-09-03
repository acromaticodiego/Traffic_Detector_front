import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CAMERA_FALLBACK } from "../lib/config";
import { useCameras } from "../state/cameras";
import { useStore } from "../state/store";

const camIcon = L.divIcon({
  className: "",
  html: '<div class="cam-marker"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10],
});

/** `center` on MapContainer only applies on mount, so switching camera needs
 *  an explicit move. */
function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), { duration: 0.8 });
  }, [map, lat, lng]);

  return null;
}

/**
 * Full-bleed live map that sits BEHIND everything. The floating
 * panels are translucent, so the map colour tints them and shifts
 * as the user pans/zooms.
 */
export function MapBackground() {
  const incidentCount = useStore((s) => s.incidents.length);
  const camera = useCameras((s) =>
    s.list.find((c) => c.id === s.selectedId) ?? null,
  );

  // A camera without coordinates still has to render somewhere.
  const lat = camera?.lat ?? CAMERA_FALLBACK.lat;
  const lng = camera?.lng ?? CAMERA_FALLBACK.lng;
  const name = camera?.name ?? CAMERA_FALLBACK.name;

  return (
    <div className="map-bg">
      <MapContainer
        center={[lat, lng]}
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
        <Recenter lat={lat} lng={lng} />
        <Marker position={[lat, lng]} icon={camIcon}>
          <Popup>
            <strong>{name}</strong>
            <br />
            {incidentCount} incidente(s)
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
