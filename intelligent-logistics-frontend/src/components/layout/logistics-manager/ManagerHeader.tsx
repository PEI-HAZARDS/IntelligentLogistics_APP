/**
 * Manager Header Component
 * Simplified header for logistics manager role
 * Uses configurable branding from appConfig
 */
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import config from "@/config/appConfig";
import {
    Sun,
    Moon,
    LogOut,
    ChevronDown,
    User,
    FileText,
    Download,
} from "lucide-react";

export default function ManagerHeader() {
    const { isDarkMode, toggleTheme } = useTheme();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Get user info from localStorage
    const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
    const userName = userInfo.name || userInfo.email || 'Manager';
    const userRole = userInfo.role || 'Logistics Manager';

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_info");
        navigate("/login");
    };

    // Get current time for display
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('pt-PT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

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
                    <span className="current-date">{formatDate(currentTime)}</span>
                </div>
            </div>

            <div className="header-right">
                {/* Quick Export Button */}
                <button className="header-icon-btn" aria-label="Export Report">
                    <Download size={20} />
                </button>

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
                            <button className="dropdown-item" onClick={() => navigate('/manager/reports')}>
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
