import React, { useEffect, useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getGateWebSocket, DecisionUpdatePayload } from '@/lib/websocket';

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
        // Initialize with some base data
        const initialData: DataPoint[] = [];
        const now = new Date();
        for (let i = 60; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 10000);
            initialData.push({
                time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                value: 1.26 + Math.random() * 0.02, // ~1.26-1.28 kW
            });
        }
        setData(initialData);

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
