import React from 'react';

export default function EnergyMetrics() {
    return (
        <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-4 xl:p-8 overflow-y-scroll">
            <div className="w-full max-w-6xl flex flex-col gap-6">
                <div className="flex flex-col">
                    <h1 className="text-4xl xl:text-5xl font-extrabold text-white mb-2 tracking-tight">
                        Energy Consumption Metrics
                    </h1>
                    <p className="text-neutral-400 text-lg">
                        Real-time energy consumption metrics from the edge devices.
                    </p>
                </div>

                <div className="w-full rounded-xl overflow-hidden shadow-2xl bg-black border border-neutral-800 flex justify-center p-6">
                    <iframe
                        src="http://10.255.35.63:3000/d-solo/0e78ffb4-0792-4868-9c22-f528182f5eeb/energy?orgId=1&timezone=browser&refresh=5s&panelId=11&__feature.dashboardSceneSolo"
                        width="100%"
                        height="600"
                        frameBorder="0"
                        className="rounded-xl w-full"
                    ></iframe>
                </div>
            </div>
        </div>
    );
}
