import { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Locate, Loader2 } from 'lucide-react';

// Fix Leaflet default icon issue in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface ExternalRouteProps {
    destination?: string;
    destinationLat?: number;
    destinationLng?: number;
}

// Component to handle map adjustments (centering)
const MapAdjuster = ({
    position,
    destination
}: {
    position: { lat: number, lng: number } | null,
    destination: { lat: number, lng: number }
}) => {
    const map = useMap();
    const hasAdjusted = useRef(false);

    useEffect(() => {
        if (position && !hasAdjusted.current) {
            const bounds = L.latLngBounds([
                [position.lat, position.lng],
                [destination.lat, destination.lng]
            ]);
            map.fitBounds(bounds, { padding: [50, 50] });
            hasAdjusted.current = true;
        }
    }, [position, destination, map]);

    return null;
};

const ExternalRoute = ({
    destination = 'Porto de Aveiro',
    destinationLat = 40.6443,
    destinationLng = -8.7290
}: ExternalRouteProps) => {
    const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [routePath, setRoutePath] = useState<[number, number][]>([]);
    const [routeInfo, setRouteInfo] = useState<{ distance: number, duration: number } | null>(null);
    const [usingFallback, setUsingFallback] = useState(false);

    const getLocation = () => {
        setLoading(true);
        setError(null);
        setUsingFallback(false);

        if (!navigator.geolocation) {
            setError("Geolocalização não suportada pelo browser");
            // Fallback: Centro de Aveiro (UA campus area)
            setPosition({ lat: 40.6306, lng: -8.6571 });
            setUsingFallback(true);
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                console.log('[GPS] Got real location:', pos.coords.latitude, pos.coords.longitude);
                setPosition({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                });
                setUsingFallback(false);
                setLoading(false);
            },
            (err) => {
                console.error("[GPS] Error getting location:", err.code, err.message);
                let errorMsg = "Localização indisponível";
                if (err.code === 1) {
                    errorMsg = "Permissão de localização negada";
                } else if (err.code === 2) {
                    errorMsg = "GPS não disponível";
                } else if (err.code === 3) {
                    errorMsg = "Timeout ao obter GPS";
                }
                setError(errorMsg + " - A usar posição demo");
                // Fallback: Centro de Aveiro (near Universidade de Aveiro)
                setPosition({ lat: 40.6306, lng: -8.6571 });
                setUsingFallback(true);
                setLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    };

    useEffect(() => {
        getLocation();
    }, []);

    // Draggable Marker Handler
    const eventHandlers = useMemo(
        () => ({
            dragend(e: L.DragEndEvent) {
                const marker = e.target;
                if (marker != null) {
                    const { lat, lng } = marker.getLatLng();
                    setPosition({ lat, lng });
                    // Reset route info when moved manually to trigger re-calc or clear old info
                    setRouteInfo(null);
                }
            },
        }),
        [],
    );

    // Calculate route using Haversine formula (no external API)
    useEffect(() => {
        if (!position) return;

        console.log(`[Route] Calculating: ${position.lat}, ${position.lng} → ${destinationLat}, ${destinationLng}`);

        // Set straight line path
        setRoutePath([[position.lat, position.lng], [destinationLat, destinationLng]]);

        // Calculate distance using Haversine formula
        const R = 6371000; // Earth radius in meters
        const lat1 = position.lat * Math.PI / 180;
        const lat2 = destinationLat * Math.PI / 180;
        const deltaLat = (destinationLat - position.lat) * Math.PI / 180;
        const deltaLng = (destinationLng - position.lng) * Math.PI / 180;

        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const straightLineDistance = R * c;

        // Road distance is typically 1.3x straight line, average speed 50km/h
        const estimatedRoadDistance = straightLineDistance * 1.3;
        const estimatedDuration = (estimatedRoadDistance / 1000) / 50 * 3600; // seconds

        setRouteInfo({
            distance: Math.round(estimatedRoadDistance),
            duration: Math.round(estimatedDuration)
        });
    }, [position, destinationLat, destinationLng]);

    // Open Google Maps for true navigation
    const openNavigation = () => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${destinationLat},${destinationLng}`;
        window.open(url, '_blank');
    };

    const formatDistance = (meters: number) => {
        if (meters > 1000) return `${(meters / 1000).toFixed(1)} km`;
        return `${Math.round(meters)} m`;
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.round(seconds / 60);
        if (mins > 60) {
            const hours = Math.floor(mins / 60);
            const remainingMins = mins % 60;
            return `${hours}h ${remainingMins}m`;
        }
        return `${mins} min`;
    };

    return (
        <div className="w-full h-full relative flex flex-col">
            {/* Map Controls - Moved down to allow space for header info */}
            <div className="absolute top-28 right-4 flex flex-col gap-2 z-[400]">
                <button
                    onClick={getLocation}
                    className="p-3 bg-slate-800 text-blue-400 rounded-full hover:bg-slate-700 shadow-lg border border-slate-700 transition-all active:scale-95 flex items-center justify-center"
                    title="Update Location"
                >
                    {loading ? <Loader2 size={24} className="animate-spin" /> : <Locate size={24} />}
                </button>
                <button
                    onClick={openNavigation}
                    className="p-3 bg-green-600 text-white rounded-full hover:bg-green-500 shadow-lg transition-all active:scale-95 flex items-center justify-center"
                    title="Open GPS Navigation"
                >
                    <Navigation size={24} />
                </button>
            </div>

            {/* Route Info Card */}
            {routeInfo && (
                <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-xl z-[400] max-w-[200px]">
                    <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Estimated Trip</div>
                    <div className="text-xl font-bold text-white flex items-end gap-1">
                        {formatDuration(routeInfo.duration)}
                    </div>
                    <div className="text-sm text-slate-300">
                        {formatDistance(routeInfo.distance)}
                    </div>
                </div>
            )}

            <div className="driver-card flex-1 p-0 overflow-hidden relative min-h-[400px] z-0">
                {(!position && loading) ? (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 size={32} className="animate-spin text-blue-500" />
                            <div className="text-blue-400 font-medium">Acquiring GPS Signal...</div>
                        </div>
                    </div>
                ) : position ? (
                    <MapContainer
                        center={[position.lat, position.lng]}
                        zoom={13}
                        style={{ width: '100%', height: '100%' }}
                        className="w-full h-full"
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <MapAdjuster position={position} destination={{ lat: destinationLat, lng: destinationLng }} />

                        {/* Current Position Marker - DRAGGABLE */}
                        <Marker
                            position={[position.lat, position.lng]}
                            draggable={true}
                            eventHandlers={eventHandlers}
                        >
                            <Popup>
                                <div className="text-center">
                                    <div className="font-bold">Your Truck</div>
                                    <div className="text-xs text-blue-500">Drag to move</div>
                                </div>
                            </Popup>
                        </Marker>

                        {/* Destination Marker */}
                        <Marker position={[destinationLat, destinationLng]}>
                            <Popup>
                                <div className="font-bold">{destination}</div>
                                <div className="text-xs">Destination</div>
                            </Popup>
                        </Marker>

                        {/* Route Path */}
                        {routePath.length > 0 && (
                            <Polyline
                                positions={routePath}
                                pathOptions={{
                                    color: routeInfo && routeInfo.distance > 0 ? '#3b82f6' : '#ef4444', // Blue if real, Red if fallback
                                    weight: 6,
                                    opacity: 0.8,
                                    dashArray: routeInfo && routeInfo.distance > 0 ? undefined : '20, 20' // Larger dashes for visibility
                                }}
                            />
                        )}
                    </MapContainer>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
                        <div className="text-red-400">Location unavailable</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExternalRoute;
