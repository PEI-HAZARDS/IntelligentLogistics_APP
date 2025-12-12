import { Plus, Minus } from 'lucide-react';

const MapWidget = () => {
    return (
        <div className="mb-6 w-full">
            <h3 className="text-lg font-bold text-slate-100 mb-3">Mapa do Porto</h3>
            <div className="relative w-full h-64 bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-inner">
                {/* Map Placeholder / Mockup */}
                <div className="absolute inset-0 bg-[url('https://c.tile.openstreetmap.org/15/15745/12966.png')] bg-cover bg-center opacity-60 grayscale hover:grayscale-0 transition-all duration-500" />

                {/* Mock User Location Pin */}
                <div className="absolute top-1/2 left-1/3 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-8 h-8 rounded-full bg-blue-500/30 animate-ping absolute" />
                    <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md relative z-10" />
                </div>

                {/* Map Controls */}
                <div className="absolute top-4 left-4 flex flex-col bg-slate-800 rounded-md shadow-md border border-slate-700 divide-y divide-slate-700">
                    <button className="p-2 hover:bg-slate-700 text-slate-300">
                        <Plus size={20} />
                    </button>
                    <button className="p-2 hover:bg-slate-700 text-slate-300">
                        <Minus size={20} />
                    </button>
                </div>

                {/* Attribution */}
                <div className="absolute bottom-1 right-1 bg-slate-900/80 px-1 py-0.5 text-[10px] text-slate-400 rounded pointer-events-none">
                    © OpenStreetMap contributors
                </div>
            </div>
        </div>
    );
};

export default MapWidget;
