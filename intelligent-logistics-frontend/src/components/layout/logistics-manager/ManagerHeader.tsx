/**
 * Manager Header Component
 * Simplified header for logistics manager role
 * Uses configurable branding from appConfig
 */
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { logout as authLogout } from "@/services/auth";
import config from "@/config/appConfig";
import {
    Sun,
    Moon,
    LogOut,
    ChevronDown,
    User,
    FileText,
    Download,
    Clock,
    File,
} from "lucide-react";

const HISTORY_KEY = "report_download_history_v1";

interface HistoryEntry {
    id: string;
    name: string;
    format: "PDF" | "CSV";
    date: string; // ISO string for localStorage serialization
}

function timeAgo(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

export default function ManagerHeader() {
    const { isDarkMode, toggleTheme } = useTheme();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isReportsOpen, setIsReportsOpen] = useState(false);
    const [recentReports, setRecentReports] = useState<HistoryEntry[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const reportsDropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const userInfo = JSON.parse(localStorage.getItem("user_info") || "{}");
    const userName = userInfo.name || userInfo.email || "Manager";
    const userRole = userInfo.role || "Logistics Manager";

    // Load report history from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(HISTORY_KEY);
            if (stored) setRecentReports(JSON.parse(stored).slice(0, 5));
        } catch {}
    }, [isReportsOpen]); // refresh when dropdown opens

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (reportsDropdownRef.current && !reportsDropdownRef.current.contains(event.target as Node)) {
                setIsReportsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await authLogout();
        navigate("/login");
    };

    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date: Date) =>
        date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

    const formatDate = (date: Date) =>
        date.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
        });

    return (
        <header className="manager-header">
            <div className="header-left">
                <div className="logo-section">
                    <img src={config.logoPath} alt={config.portName} className="logo-icon" />
                    <span className="logo-text">{config.portName}</span>
                </div>
                <span className="header-subtitle">
                    {config.subtitle} - Logistics Manager
                </span>
            </div>

            <div className="header-center">
                <div className="time-display">
                    <span className="current-time">{formatTime(currentTime)}</span>
                    <span className="time-separator">&nbsp;—&nbsp;</span>
                    <span className="current-date">{formatDate(currentTime)}</span>
                </div>
            </div>

            <div className="header-right">
                {/* Quick Export / Recent Reports Dropdown */}
                <div className="reports-btn-wrap" ref={reportsDropdownRef}>
                    <button
                        className={`header-icon-btn${isReportsOpen ? " active" : ""}`}
                        aria-label="Recent Reports"
                        onClick={() => setIsReportsOpen(p => !p)}
                    >
                        <Download size={20} />
                        {recentReports.length > 0 && (
                            <span className="reports-badge">{recentReports.length}</span>
                        )}
                    </button>

                    {isReportsOpen && (
                        <div className="reports-dropdown">
                            <div className="reports-dropdown-header">
                                <span>Recent Exports</span>
                            </div>
                            {recentReports.length === 0 ? (
                                <div className="reports-dropdown-empty">
                                    <Clock size={16} />
                                    <span>No exports yet</span>
                                </div>
                            ) : (
                                <ul className="reports-dropdown-list">
                                    {recentReports.map(entry => (
                                        <li key={entry.id} className="reports-dropdown-item">
                                            <span className={`reports-fmt-badge reports-fmt-${entry.format.toLowerCase()}`}>
                                                <File size={11} />
                                                {entry.format}
                                            </span>
                                            <span className="reports-item-name">{entry.name}</span>
                                            <span className="reports-item-time">{timeAgo(entry.date)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <button
                                className="reports-dropdown-footer"
                                onClick={() => { setIsReportsOpen(false); navigate("/manager/reports"); }}
                            >
                                <FileText size={13} />
                                View all reports
                            </button>
                        </div>
                    )}
                </div>

                {/* Theme Toggle */}
                <button
                    className="header-icon-btn"
                    onClick={toggleTheme}
                    aria-label="Toggle Theme"
                >
                    {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                </button>

                {/* User Dropdown */}
                <div className="user-section" ref={dropdownRef}>
                    <button
                        className="user-trigger"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        aria-expanded={isDropdownOpen}
                    >
                        <div className="user-avatar-fallback">
                            <User size={18} />
                        </div>
                        <span className="user-name">{userName}</span>
                        <ChevronDown size={16} className={`dropdown-arrow ${isDropdownOpen ? "open" : ""}`} />
                    </button>

                    {isDropdownOpen && (
                        <div className="user-dropdown">
                            <div className="dropdown-header">
                                <span className="dropdown-name">{userName}</span>
                                <span className="dropdown-role">{userRole}</span>
                            </div>
                            <div className="dropdown-divider" />
                            <button className="dropdown-item" onClick={() => navigate("/manager/reports")}>
                                <FileText size={16} />
                                <span>Reports</span>
                            </button>
                            <div className="dropdown-divider" />
                            <button className="dropdown-item" onClick={handleLogout}>
                                <LogOut size={16} />
                                <span>Log Out</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
