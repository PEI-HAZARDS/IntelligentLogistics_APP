import { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, RefreshCw, Locate, Loader2 } from 'lucide-react';
import axios from 'axios';

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

    const getLocation = () => {
        setLoading(true);
        setError(null);
        if (!navigator.geolocation) {
            setError("Geolocalização não suportada pelo browser");
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setPosition({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                });
                setLoading(false);
            },
            (err) => {
                console.error("Error getting location:", err);
                setError("Não foi possível obter localização. A usar fallback.");
                // Default fallback near Aveiro center for demo
                setPosition({ lat: 40.6405, lng: -8.6538 });
                setLoading(false);
            },
            { enableHighAccuracy: true }
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

    // Fetch Route from OSRM
    useEffect(() => {
        const fetchRoute = async () => {
            if (!position) return;

            // Reset path before fetching
            // setRoutePath([]); 

            try {
                // Log coordinates for debugging
                console.log(`[Route Debug] Current Location: ${position.lat}, ${position.lng} | Terminal Location: ${destinationLat}, ${destinationLng}`);

                // OSRM expects: longitude,latitude
                const start = `${position.lng},${position.lat}`;
                const end = `${destinationLng},${destinationLat}`;
                // Use proxy to avoid CORS
                const url = `/osrm/route/v1/driving/${start};${end}?overview=full&geometries=geojson`;

                const response = await axios.get(url);

                if (response.data.code === 'Ok' && response.data.routes.length > 0) {
                    const route = response.data.routes[0];
                    // OSRM returns [lng, lat], Leaflet needs [lat, lng]
                    const coords = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);

                    setRoutePath(coords);
                    setRouteInfo({
                        distance: route.distance, // meters
                        duration: route.duration // seconds
                    });
                } else {
                    throw new Error("No route found");
                }
            } catch (e) {
                console.error("Failed to fetch route, using fallback:", e);
                // Fallback: Straight line
                setRoutePath([[position.lat, position.lng], [destinationLat, destinationLng]]);
                setRouteInfo({
                    distance: 0, // Unknown
                    duration: 0 // Unknown
                });
            }
        };

        fetchRoute();
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
        <div className="flex flex-col gap-4 w-full h-full relative">
            {/* Control Buttons */}
            <div className="absolute top-4 right-4 flex gap-2 z-[400]">
                <button
                    onClick={getLocation}
                    className="p-3 bg-slate-800 text-blue-400 rounded-full hover:bg-slate-700 shadow-lg border border-slate-700 transition-all active:scale-95 flex items-center justify-center"
                    title="Update Location"
                >
                    {loading ? <Loader2 size={24} className="animate-spin" /> : <Locate size={24} />}
                </button>
                <button
                    onClick={openNavigation}
                    className="p-3 bg-green-600 text-white rounded-full hover:bg-green-500 shadow-lg transition-all active:scale-95"
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
