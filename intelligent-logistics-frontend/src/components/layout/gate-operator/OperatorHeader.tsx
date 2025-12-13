import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import ShiftHandoverModal from "@/components/gate-operator/ShiftHandoverModal";
import { getActiveAlerts } from "@/services/alerts";
// Note: WebSocket removed - Dashboard handles real-time updates, Header uses API polling
import type { Alert } from "@/types/types";
import {
    Bell,
    Sun,
    Moon,
    LogOut,
    Clock,
    ChevronDown,
    User,
    ArrowRightCircle,
    Loader2
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

// Map API alert to notification format
function mapAlertToNotification(alert: Alert): Notification {
    const typeMap: Record<string, "warning" | "info" | "danger"> = {
        safety: "danger",
        problem: "danger",
        operational: "warning",
        generic: "info",
    };

    const timeDiff = Date.now() - new Date(alert.timestamp).getTime();
    const minutes = Math.floor(timeDiff / 60000);
    const hours = Math.floor(minutes / 60);
    const timeStr = hours > 0 ? `${hours}h ago` : minutes > 0 ? `${minutes}m ago` : "Just now";

    return {
        id: String(alert.id),
        type: typeMap[alert.type] || "info",
        title: alert.type.charAt(0).toUpperCase() + alert.type.slice(1) + " Alert",
        message: alert.description || "No description",
        time: timeStr,
        read: false,
    };
}

export default function OperatorHeader() {
    const { isDarkMode, toggleTheme } = useTheme();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isHandoverOpen, setIsHandoverOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const dropdownRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Get user info from localStorage
    const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
    const userName = userInfo.name || userInfo.email || 'Operator';
    const userRole = userInfo.role || 'Gate Operator';

    // Fetch notifications from API
    const fetchNotifications = useCallback(async () => {
        setIsLoadingNotifications(true);
        try {
            const alerts = await getActiveAlerts(10);
            const mappedNotifications = alerts.map(mapAlertToNotification);
            // Mark previously read ones
            setNotifications(mappedNotifications.map(n => ({
                ...n,
                read: readIds.has(n.id)
            })));
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        } finally {
            setIsLoadingNotifications(false);
        }
    }, [readIds]);

    // Initial fetch and periodic refresh (no WebSocket - Dashboard handles that)
    useEffect(() => {
        fetchNotifications();

        // Refresh notifications every 60 seconds via API
        const refreshInterval = setInterval(fetchNotifications, 60000);

        return () => {
            clearInterval(refreshInterval);
        };
    }, [fetchNotifications]);

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
        if (hour >= 6 && hour < 14) return { name: "Morning Shift", startTime: "06:00", endTime: "14:00", startHour: 6, endHour: 14 };
        if (hour >= 14 && hour < 22) return { name: "Afternoon Shift", startTime: "14:00", endTime: "22:00", startHour: 14, endHour: 22 };
        return { name: "Night Shift", startTime: "22:00", endTime: "06:00", startHour: 22, endHour: 6 };
    };

    const shiftInfo = getShiftInfo();

    // Auto-trigger handover modal when shift ends
    useEffect(() => {
        const checkShiftEnd = () => {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();

            // Trigger modal at exact shift end time
            if (currentHour === shiftInfo.endHour && currentMinute === 0) {
                setIsHandoverOpen(true);
            }
        };

        // Check every minute
        const interval = setInterval(checkShiftEnd, 60000);
        return () => clearInterval(interval);
    }, [shiftInfo.endHour]);

    const handleEndShift = () => {
        setIsDropdownOpen(false);
        setIsHandoverOpen(true);
    };

    const handleMarkAllRead = () => {
        const allIds = new Set(notifications.map(n => n.id));
        setReadIds(allIds);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <header className="operator-header">
            <div className="header-left">
                <div className="logo-section">
                    <img src="/logo.png" alt="Porto de Aveiro" className="logo-icon" />
                    <span className="logo-text">Porto de Aveiro</span>
                </div>
                <span className="header-subtitle">
                    Daily Arrivals Management Panel
                </span>
            </div>

            <div className="header-right">
                {/* Theme Toggle */}
                <button
                    className="header-icon-btn"
                    onClick={toggleTheme}
                    aria-label="Toggle Theme"
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
                        aria-label="Notifications"
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
                                <span className="notifications-title">Notifications</span>
                                <button className="mark-read-btn" onClick={handleMarkAllRead}>
                                    Mark as read
                                </button>
                            </div>
                            <div className="notifications-list">
                                {isLoadingNotifications ? (
                                    <div className="notification-loading">
                                        <Loader2 size={20} className="spin" />
                                        <span>Loading...</span>
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="notification-empty">
                                        <span>No notifications</span>
                                    </div>
                                ) : (
                                    notifications.map((notification) => (
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
                                    ))
                                )}
                            </div>
                            <div className="notifications-footer">
                                <button className="view-all-btn" onClick={() => navigate('/gate/alerts')}>
                                    View All
                                </button>
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
                            <div className="dropdown-shift">
                                <Clock size={16} />
                                <span>{shiftInfo.name} ({shiftInfo.startTime} - {shiftInfo.endTime})</span>
                            </div>
                            <div className="dropdown-divider" />
                            <button className="dropdown-item end-shift" onClick={handleEndShift}>
                                <ArrowRightCircle size={16} />
                                <span>End Shift</span>
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

            {/* Shift Handover Modal */}
            <ShiftHandoverModal
                isOpen={isHandoverOpen}
                onClose={() => setIsHandoverOpen(false)}
                onConfirmLogout={handleLogout}
                shiftName={shiftInfo.name}
                shiftEndTime={shiftInfo.endTime}
            />
        </header>
    );
}
