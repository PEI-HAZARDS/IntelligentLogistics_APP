import { Navigation, MapPin, Package } from 'lucide-react';
import ConfirmButton from './ConfirmButton';
import type { Appointment } from '@/types/types';

interface InternalRouteProps {
    appointment: Appointment | null;
    onConfirmDelivery: () => void;
    isConfirming?: boolean;
}

const InternalRoute = ({ appointment, onConfirmDelivery, isConfirming }: InternalRouteProps) => {
    if (!appointment) {
        return (
            <div className="flex flex-col gap-4 w-full h-full items-center justify-center">
                <div className="driver-card text-center p-8">
                    <Package size={48} className="text-gray-400 mx-auto mb-4" />
                    <h3 className="font-bold text-lg mb-2">A aguardar entrada</h3>
                    <p className="text-sm opacity-70">
                        Dirija-se ao gate para validação automática.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 w-full h-full">
            <div className="driver-card flex items-center gap-3 flex-shrink-0">
                <Navigation className="text-green-500" size={24} />
                <div>
                    <h3 className="font-bold text-lg">Navegação Interna</h3>
                    <p className="text-sm opacity-70">
                        Autorizado. Dirija-se ao local de descarga.
                    </p>
                </div>
            </div>

            {/* Dock Information Card */}
            <div className="driver-card flex-1 flex flex-col gap-4">
                <div className="flex items-start space-x-4 pb-4 border-b border-white/10">
                    <div className="flex-shrink-0 bg-green-500/10 p-3 rounded-xl border border-green-500/20">
                        <MapPin className="text-green-500" size={32} />
                    </div>
                    <div>
                        <h2 className="text-slate-400 font-medium text-sm uppercase tracking-wide">Destino</h2>
                        <p className="text-white text-3xl font-bold mt-1">
                            {appointment.terminal?.name || 'Terminal'}
                        </p>
                        {appointment.gate_in && (
                            <p className="text-slate-400 text-sm mt-1">
                                Gate: {appointment.gate_in.label}
                            </p>
                        )}
                    </div>
                </div>

                {/* Additional Info */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Matrícula</span>
                        <span className="font-semibold">{appointment.truck_license_plate}</span>
                    </div>
                    {appointment.booking?.cargos?.[0] && (
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Carga</span>
                            <span className="font-medium">{appointment.booking.cargos[0].description}</span>
                        </div>
                    )}
                </div>

                {/* Port Map Placeholder */}
                <div className="flex-1 bg-slate-800/50 rounded-xl overflow-hidden flex items-center justify-center relative min-h-[200px] border border-slate-700">
                    <div className="absolute inset-0 bg-[url('https://c.tile.openstreetmap.org/15/15745/12966.png')] bg-cover bg-center opacity-30 grayscale" />
                    <div className="relative z-10 bg-black/60 px-6 py-3 rounded-lg backdrop-blur-md border border-white/10 text-center">
                        <Navigation className="text-green-400 mx-auto mb-2" size={24} />
                        <span className="text-sm">Navegação Interna Ativa</span>
                    </div>
                </div>
            </div>

            {/* Confirm Delivery */}
            <div className="flex-shrink-0 pb-4">
                <ConfirmButton
                    onClick={onConfirmDelivery}
                    isLoading={isConfirming}
                />
            </div>
        </div>
    );
};

export default InternalRoute;
