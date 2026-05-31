import React, { useEffect, useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getGateWebSocket, DecisionUpdatePayload } from '@/lib/websocket';
import api from '@/lib/api';

interface EnergySpike {
    gate_id: number;
    value: number;
    mode: string;
    timestamp: string;
}

interface DataPoint {
    time: string;
    value: number;
}

interface SimulatedEnergyGraphProps {
    isDarkMode: boolean;
}

export default function SimulatedEnergyGraph({ isDarkMode }: SimulatedEnergyGraphProps) {
    const [data, setData] = useState<DataPoint[]>([]);
    const isHighPowerRef = useRef(false);

    useEffect(() => {
        let cancelled = false;

        // Build the rolling base window, then overlay persisted spikes from the
        // backend so spikes survive a page refresh (the read side of the
        // WebSocket → Mongo flow: scale_up events are stored by the gateway).
        const now = new Date();
        const fmt = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const points = Array.from({ length: 61 }, (_, idx) => {
            const i = 60 - idx;
            return { t: new Date(now.getTime() - i * 10000), value: 1.26 + Math.random() * 0.02 };
        });

        (async () => {
            try {
                const res = await api.get<EnergySpike[]>('/energy/spikes', { params: { gate_id: 1, limit: 200 } });
                if (Array.isArray(res.data)) {
                    for (const spike of res.data) {
                        const st = new Date(spike.timestamp).getTime();
                        // snap each spike to the nearest window point (within 6 s)
                        let best = -1;
                        let bestDiff = 6000;
                        points.forEach((p, j) => {
                            const d = Math.abs(p.t.getTime() - st);
                            if (d < bestDiff) { bestDiff = d; best = j; }
                        });
                        if (best >= 0) points[best].value = Math.max(points[best].value, spike.value || 1.83);
                    }
                }
            } catch {
                // ignore — fall back to the plain base window
            }
            if (!cancelled) {
                setData(points.map(p => ({ time: fmt(p.t), value: Number(p.value.toFixed(2)) })));
            }
        })();

        // Connect to WebSocket to listen for scale messages
        const ws = getGateWebSocket(1); // Default to gate 1
        ws.connect();

        const unsubscribe = ws.onMessage((payload: DecisionUpdatePayload) => {
            if (payload.message_type === "scale_network") {
                const mode = payload.mode as string | undefined;
                if (mode === "scale_up") {
                    isHighPowerRef.current = true;
                } else if (mode === "scale_down") {
                    isHighPowerRef.current = false;
                }
            }
        });

        // Add a new point every 10 seconds
        const interval = setInterval(() => {
            setData((prevData) => {
                const newTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                
                const lastVal = prevData[prevData.length - 1]?.value || 1.27;
                let target = 1.27;
                
                if (isHighPowerRef.current) {
                    target = 1.83;
                }

                // Calculate next value with some ease-in logic and random noise
                let spike = 0;
                // Add a small spike if transitioning up
                if (isHighPowerRef.current && lastVal < 1.4) {
                     spike = 0.15; 
                }

                // Move closer to target faster because 10s have elapsed
                let nextValue = lastVal + (target - lastVal) * 0.75 + (Math.random() * 0.04 - 0.02) + spike;
                
                // Keep values within realistic bounds based on the user screenshot
                if (nextValue < 1.25) nextValue = 1.25 + Math.random() * 0.02;
                if (nextValue > 1.88) nextValue = 1.85 + Math.random() * 0.03;

                const newData = [...prevData.slice(1), { time: newTime, value: Number(nextValue.toFixed(2)) }];
                return newData;
            });
        }, 10000);

        return () => {
            cancelled = true;
            unsubscribe();
            clearInterval(interval);
        };
    }, []);

    const textColor = isDarkMode ? "#9ca3af" : "#64748b";
    const gridColor = isDarkMode ? "#333333" : "#e2e8f0";

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis 
                    dataKey="time" 
                    stroke={textColor} 
                    fontSize={11} 
                    tickMargin={10} 
                    minTickGap={40}
                    tick={{ fill: textColor }}
                />
                <YAxis 
                    stroke={textColor} 
                    fontSize={11} 
                    domain={[1.20, 1.95]} 
                    tickCount={8}
                    tickFormatter={(val) => `${val.toFixed(2)} kW`}
                    tick={{ fill: textColor }}
                />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', 
                        borderColor: isDarkMode ? '#374151' : '#e2e8f0',
                        borderRadius: '8px', 
                        color: isDarkMode ? '#ffffff' : '#0f172a',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    itemStyle={{ color: '#3b82f6' }}
                    labelStyle={{ color: textColor, marginBottom: '4px' }}
                    formatter={(value: number) => [`${value.toFixed(2)} kW`, 'RAN']}
                />
                <ReferenceLine 
                    y={1.84} 
                    stroke="#eab308" 
                    strokeDasharray="5 5" 
                />
                <Line 
                    type="monotone" 
                    name="RAN"
                    dataKey="value" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#60a5fa', stroke: '#2563eb', strokeWidth: 2 }}
                    isAnimationActive={false}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
