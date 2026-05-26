/**
 * Port Performance Page
 * Analytics and carrier statistics with internal tab navigation.
 * Tabs: Overview (charts + KPIs) | Carriers (per-company metrics)
 */
import { useState } from "react";
import { BarChart2, Truck } from "lucide-react";
import AnalyticsPage from "./AnalyticsPage";
import TransportPage from "./TransportPage";

type PerformanceTab = "overview" | "carriers";

const tabs: { id: PerformanceTab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <BarChart2 size={15} /> },
    { id: "carriers", label: "Carriers", icon: <Truck size={15} /> },
];

export default function PortPerformancePage() {
    const [activeTab, setActiveTab] = useState<PerformanceTab>("overview");

    return (
        <div className="port-performance-page">
            <div className="performance-tab-bar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`performance-tab-btn ${activeTab === tab.id ? "active" : ""}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="performance-tab-content">
                {activeTab === "overview" && <AnalyticsPage />}
                {activeTab === "carriers" && <TransportPage />}
            </div>
        </div>
    );
}
