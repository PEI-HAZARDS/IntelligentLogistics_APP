import { useEffect, useState } from 'react';
import { Truck, Navigation, RefreshCw } from 'lucide-react';

interface ExternalRouteProps {
    destination?: string;
    destinationLat?: number;
    destinationLng?: number;
}

const ExternalRoute = ({
    destination = 'Porto de Aveiro',
    destinationLat = 40.6443,
    destinationLng = -8.7290
}: ExternalRouteProps) => {
    const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                setError("Não foi possível obter localização. A usar padrão.");
                // Default to Port of Aveiro if location fails
                setPosition({ lat: destinationLat, lng: destinationLng });
                setLoading(false);
            },
            { enableHighAccuracy: true }
        );
    };

    useEffect(() => {
        getLocation();
    }, []);

    // Calculate bounding box for OSM
    const getMapSrc = () => {
        if (!position) return "";
        const offset = 0.01; // Zoom level
        const { lat, lng } = position;
        const bbox = `${lng - offset},${lat - offset},${lng + offset},${lat + offset}`;
        return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
    };

    // Open Google Maps for navigation
    const openNavigation = () => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${destinationLat},${destinationLng}`;
        window.open(url, '_blank');
    };

    return (
        <div className="flex flex-col gap-4 w-full h-full">
            <div className="absolute top-4 right-4 flex gap-2 z-10">
                <button
                    onClick={getLocation}
                    className="p-3 bg-slate-800 text-blue-400 rounded-full hover:bg-slate-700 shadow-lg border border-slate-700 transition-all active:scale-95"
                    title="Update Location"
                >
                    <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
                </button>
                <button
                    onClick={openNavigation}
                    className="p-3 bg-green-600 text-white rounded-full hover:bg-green-500 shadow-lg transition-all active:scale-95"
                    title="Open GPS Navigation"
                >
                    <Navigation size={24} />
                </button>
            </div>

            <div className="driver-card flex-1 p-0 overflow-hidden relative min-h-[400px]">
                {loading ? (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
                        <div className="animate-pulse text-blue-400">Locating...</div>
                    </div>
                ) : (
                    <iframe
                        width="100%"
                        height="100%"
                        src={getMapSrc()}
                        style={{ border: 0 }}
                        title="Mapa de Navegação"
                        allow="geolocation"
                    />
                )}
            </div>
        </div>
    );
};

export default ExternalRoute;
