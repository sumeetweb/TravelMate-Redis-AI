import * as React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const redPinUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png';
const itineraryIcon = new L.Icon({
  iconUrl: redPinUrl,
  iconRetinaUrl: redPinUrl,
  shadowUrl: (shadowUrl as any).src || shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

if (typeof window !== 'undefined') {
  // Fix default icon path so markers show correctly
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
  });
}

export type ItineraryPoint = {
  lat: number;
  lng: number;
  label: string;
};

export type ItineraryMapProps = {
  points: ItineraryPoint[];
};

const ItineraryMap: React.FC<ItineraryMapProps> = ({ points }) => {
  const center = points.length > 0 ? [points[0].lat, points[0].lng] : [48.8584, 2.2945];
  const polylinePositions: [number, number][] = points.map(p => [p.lat, p.lng] as [number, number]);

  return (
    <MapContainer center={center as [number, number]} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((point, idx) => (
        <Marker position={[point.lat, point.lng]} key={idx} icon={itineraryIcon}>
          <Popup>{point.label}</Popup>
        </Marker>
      ))}
      <Polyline positions={polylinePositions} color="#FF2D00" />
    </MapContainer>
  );
};

export default ItineraryMap;
