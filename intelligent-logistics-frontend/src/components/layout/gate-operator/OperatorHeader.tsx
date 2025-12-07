import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import {
    Bell,
    Sun,
    Moon,
    User,
    LogOut,
    Clock,
    ChevronDown
} from "lucide-react";

// Notification type definition
interface Notification {
    id: string;
    type: "warning" | "info" | "danger";
    title: string;
    message: string;
    time: string;
    read: boolean;
}

// Mock notifications data
const mockNotifications: Notification[] = [
    {
        id: "1",
        type: "warning",
        title: "Chegada Atrasada",
        message: "Camião ABC-1234 está 30 minutos atrasado",
        time: "10 min",
        read: false,
    },
    {
        id: "2",
        type: "info",
        title: "Nova Chegada Registada",
        message: "Veículo XYZ-5678 registado para 14:00",
        time: "25 min",
        read: false,
    },
    {
        id: "3",
        type: "danger",
        title: "Documento em Falta",
        message: "Veículo DEF-9012 sem documentação válida",
        time: "1 hora",
        read: true,
    },
];

export default function OperatorHeader() {
    const { isDarkMode, toggleTheme } = useTheme();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("auth_token");
        navigate("/login");
    };

    // Get current shift based on time
    const getShiftInfo = () => {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 14) return "Turno da Manhã (06:00 - 14:00)";
        if (hour >= 14 && hour < 22) return "Turno da Tarde (14:00 - 22:00)";
        return "Turno da Noite (22:00 - 06:00)";
    };

    const unreadCount = mockNotifications.filter((n) => !n.read).length;

    return (
        <header className="operator-header">
            <div className="header-left">
                <div className="logo-section">
                    <img src="/logo.png" alt="Porto de Aveiro" className="logo-icon" />
                    <span className="logo-text">Porto de Aveiro</span>
                </div>
                <span className="header-subtitle">
                    Painel de Gestão de Chegadas Diárias
                </span>
            </div>

            <div className="header-right">
                {/* Theme Toggle */}
                <button
                    className="header-icon-btn"
                    onClick={toggleTheme}
                    aria-label="Alternar Tema"
                >
                    {isDarkMode ? (
                        <Moon size={20} />
                    ) : (
                        <Sun size={20} />
                    )}
                </button>

                {/* Notification Bell */}
                <div className="notifications-section" ref={notificationsRef}>
                    <button
                        className="header-icon-btn"
                        aria-label="Notificações"
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="notification-badge">{unreadCount}</span>
                        )}
                    </button>

                    {isNotificationsOpen && (
                        <div className="notifications-popup">
                            <div className="notifications-header">
                                <span className="notifications-title">Notificações</span>
                                <button className="mark-read-btn">Marcar como lidas</button>
                            </div>
                            <div className="notifications-list">
                                {mockNotifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`notification-item ${notification.type} ${notification.read ? "read" : ""
                                            }`}
                                    >
                                        <div className="notification-indicator" />
                                        <div className="notification-content">
                                            <span className="notification-title">{notification.title}</span>
                                            <span className="notification-message">{notification.message}</span>
                                            <span className="notification-time">{notification.time}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="notifications-footer">
                                <button className="view-all-btn">Ver Todas</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* User Dropdown */}
                <div className="user-section" ref={dropdownRef}>
                    <button
                        className="user-trigger"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        aria-expanded={isDropdownOpen}
                    >
                        <img
                            src="/avatar-placeholder.png"
                            alt="User"
                            className="user-avatar-img"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                            }}
                        />
                        <div className="user-avatar-fallback">MV</div>
                        <span className="user-name">Maria Vicente</span>
                        <ChevronDown size={16} className={`dropdown-arrow ${isDropdownOpen ? "open" : ""}`} />
                    </button>

                    {isDropdownOpen && (
                        <div className="user-dropdown">
                            <div className="dropdown-header">
                                <span className="dropdown-name">Maria Vicente</span>
                                <span className="dropdown-role">Gate Operator</span>
                            </div>
                            <div className="dropdown-divider" />
                            <div className="dropdown-shift">
                                <Clock size={16} />
                                <span>{getShiftInfo()}</span>
                            </div>
                            <div className="dropdown-divider" />
                            <button className="dropdown-item" onClick={handleLogout}>
                                <LogOut size={16} />
                                <span>Terminar Sessão</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
