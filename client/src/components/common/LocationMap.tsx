import { MapContainer, Marker, Popup, TileLayer, ZoomControl } from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";

const pin = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface LocationMapProps {
  lat: number;
  lng: number;
  label: string;
  zoom?: number;
  className?: string;
}

/**
 * Interactive OpenStreetMap (Leaflet) with zoom controls + marker —
 * the same look as the reference: +/- top-left, pin, OSM attribution.
 */
export function LocationMap({ lat, lng, label, zoom = 13, className }: LocationMapProps) {
  return (
    <div className={className ?? "h-80 w-full overflow-hidden rounded-sm border border-border"}>
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        zoomControl={false}
        scrollWheelZoom={false}
        className="h-full w-full"
        aria-label={`Map of ${label}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="topleft" />
        <Marker position={[lat, lng]} icon={pin}>
          <Popup>{label}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default LocationMap;
