import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to auto-zoom to bounds
const FitBounds = ({ route, visits }) => {
    const map = useMap();
    useEffect(() => {
        if (!map) return;
        const points = [];
        if (route.length > 0) route.forEach(p => points.push([p.lat, p.lng]));
        if (visits.length > 0) visits.forEach(v => points.push([v.latitude, v.longitude]));

        if (points.length > 0) {
            const bounds = L.latLngBounds(points);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [route, visits, map]);
    return null;
};

const RouteTimeline = ({ routePoints = [], visits = [] }) => {
    // Default center (India)
    const defaultCenter = [20.5937, 78.9629];

    // Convert route points to [lat, lng] array
    const polylinePositions = routePoints.map(p => [p.lat, p.lng]);

    return (
        <div style={{ height: '500px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #ddd' }}>
            <MapContainer center={defaultCenter} zoom={5} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />

                {/* Draw the Route Path */}
                {polylinePositions.length > 1 && (
                    <Polyline positions={polylinePositions} color="blue" weight={4} opacity={0.7} />
                )}

                {/* Markers for GPS Pings (Start/End or intervals) */}
                {routePoints.length > 0 && (
                    <>
                        <Marker position={[routePoints[0].lat, routePoints[0].lng]}>
                            <Popup>Start Point<br />{new Date(routePoints[0].timestamp).toLocaleTimeString()}</Popup>
                        </Marker>
                        <Marker position={[routePoints[routePoints.length - 1].lat, routePoints[routePoints.length - 1].lng]}>
                            <Popup>Last Known<br />{new Date(routePoints[routePoints.length - 1].timestamp).toLocaleTimeString()}</Popup>
                        </Marker>
                    </>
                )}

                {/* Markers for Visits (Client Meetings) */}
                {visits.map((visit, idx) => (
                    visit.latitude && visit.longitude ? (
                        <Marker key={visit.id || idx} position={[visit.latitude, visit.longitude]}>
                            <Popup>
                                <strong>{visit.clientName}</strong><br />
                                <small className="text-muted">{new Date(visit.timestamp).toLocaleTimeString()}</small><br />
                                {visit.notes}<br />
                                {visit.image && (
                                    <img
                                        src={visit.image}
                                        alt="Selfie"
                                        style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', marginTop: '5px' }}
                                    />
                                )}<br />
                                {visit.address && <div style={{ marginTop: '5px', color: '#007bff' }}>📍 {visit.address}</div>}
                            </Popup>
                        </Marker>
                    ) : null
                ))}

                <FitBounds route={routePoints} visits={visits} />
            </MapContainer>
        </div>
    );
};

export default RouteTimeline;
