import { MapPin } from 'lucide-react';

interface LocationCardProps {
    destination?: string;
    sublabel?: string;
}

const LocationCard = ({ destination = 'N/A', sublabel }: LocationCardProps) => {
    return (
        <div className="driver-card flex items-start space-x-4">
            <div className="flex-shrink-0 bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                <MapPin className="text-blue-500" size={32} />
            </div>
            <div>
                <h2 className="text-slate-400 font-medium text-sm uppercase tracking-wide">Destino</h2>
                <p className="text-white text-3xl font-bold mt-1">{destination}</p>
                {sublabel && (
                    <p className="text-slate-400 text-sm mt-1">{sublabel}</p>
                )}
            </div>
        </div>
    );
};

export default LocationCard;
