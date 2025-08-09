import * as React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
// import 'leaflet/dist/leaflet.css'; // moved to _app.tsx
import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

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

const ParisPosition: [number, number] = [48.8584, 2.2945];

const LeafletMap: React.FC = () => (
  <MapContainer center={ParisPosition} zoom={13} scrollWheelZoom={false} style={{ height: '250px', width: '100%' }}>
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
    <Marker position={ParisPosition}>
      <Popup>
        Eiffel Tower
        <br />
        Paris
      </Popup>
    </Marker>
  </MapContainer>
);

export default LeafletMap;
