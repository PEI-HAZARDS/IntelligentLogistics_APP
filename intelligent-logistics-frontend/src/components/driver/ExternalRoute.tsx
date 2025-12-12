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
            <div className="driver-card flex items-center justify-between gap-3 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <Truck className="text-blue-500" size={24} />
                    <div>
                        <h3 className="font-bold text-lg">Destino: {destination}</h3>
                        <p className="text-sm opacity-70">
                            {loading ? "A localizar..." : error ? "Siga a navegação externa" : "Siga a navegação externa"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={getLocation}
                        className="p-2 bg-blue-500/10 text-blue-400 rounded-full hover:bg-blue-500/20 transition-colors"
                        title="Atualizar Localização"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={openNavigation}
                        className="p-2 bg-green-500/10 text-green-400 rounded-full hover:bg-green-500/20 transition-colors"
                        title="Abrir Navegação GPS"
                    >
                        <Navigation size={20} />
                    </button>
                </div>
            </div>

            <div className="driver-card flex-1 p-0 overflow-hidden relative min-h-[400px]">
                {loading ? (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
                        <div className="animate-pulse text-blue-400">A localizar...</div>
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
