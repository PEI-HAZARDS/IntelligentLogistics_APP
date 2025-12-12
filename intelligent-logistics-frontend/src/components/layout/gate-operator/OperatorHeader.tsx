import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import ShiftHandoverModal from "@/components/gate-operator/ShiftHandoverModal";
import {
    Bell,
    Sun,
    Moon,
    LogOut,
    Clock,
    ChevronDown,
    User,
    ArrowRightCircle
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
        title: "Delayed Arrival",
        message: "Truck ABC-1234 is 30 minutes late",
        time: "10 min",
        read: false,
    },
    {
        id: "2",
        type: "info",
        title: "New Arrival Registered",
        message: "Vehicle XYZ-5678 scheduled for 14:00",
        time: "25 min",
        read: false,
    },
    {
        id: "3",
        type: "danger",
        title: "Missing Document",
        message: "Vehicle DEF-9012 without valid documentation",
        time: "1 hour",
        read: true,
    },
];

export default function OperatorHeader() {
    const { isDarkMode, toggleTheme } = useTheme();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isHandoverOpen, setIsHandoverOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Get user info from localStorage
    const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
    const userName = userInfo.name || userInfo.email || 'Operator';
    const userRole = userInfo.role || 'Gate Operator';

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
        if (hour >= 6 && hour < 14) return { name: "Morning Shift", endTime: "14:00", endHour: 14 };
        if (hour >= 14 && hour < 22) return { name: "Afternoon Shift", endTime: "22:00", endHour: 22 };
        return { name: "Night Shift", endTime: "06:00", endHour: 6 };
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

    const unreadCount = mockNotifications.filter((n) => !n.read).length;

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
                                <button className="mark-read-btn">Mark as read</button>
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
                                <button className="view-all-btn">View All</button>
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
                                <span>{shiftInfo.name} (ends {shiftInfo.endTime})</span>
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
