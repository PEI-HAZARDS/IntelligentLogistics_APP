import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function EnergyMetrics() {
    const { isDarkMode, toggleTheme } = useTheme();
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-start p-4 md:p-6 xl:p-8 overflow-x-hidden overflow-y-auto ${
          isDarkMode
            ? "bg-neutral-900 text-white"
            : "bg-slate-50 text-slate-900"
        }`}
      >
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`absolute top-6 right-6 p-3 rounded-lg border transition-all ${
            isDarkMode
              ? "bg-neutral-800 border-neutral-700 text-yellow-400 hover:bg-neutral-700"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
          }`}
          title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
        </button>
        <div className="w-full max-w-6xl flex flex-col gap-6 pt-20 md:pt-16">
          <div className="flex flex-col">
            <h1
              className={`text-2xl md:text-3xl xl:text-4xl font-extrabold mb-2 tracking-tight ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              Energy Consumption Metrics
            </h1>
            <p
              className={`text-sm md:text-base ${
                isDarkMode ? "text-neutral-400" : "text-slate-600"
              }`}
            >
              Real-time energy consumption metrics from the 5G RAN
            </p>
          </div>

          <div
            className={`w-full rounded-xl overflow-hidden shadow-2xl border ${
              isDarkMode
                ? "bg-black border-neutral-800"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="w-full h-32 sm:h-52 md:h-64 lg:h-80">
            <iframe
              src="http://10.255.32.141:3000/d-solo/adcptvw/new-dashboard?orgId=1&timezone=browser&refresh=5s&panelId=panel-1&__feature.dashboardScene=true"
              className="w-full h-full border-0"
              frameBorder="0"
              title="Energy consumption panel"
            ></iframe>
            </div>
          </div>
        </div>
      </div>
    );
}
