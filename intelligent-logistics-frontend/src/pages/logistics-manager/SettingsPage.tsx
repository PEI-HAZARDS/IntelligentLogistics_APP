/**
 * Settings Page
 * Streamlined: profile info, theme toggle, port info, and support contact.
 * Removed unnecessary technical details (API/WS/Grafana URLs, version, language).
 */
import { useTheme } from "@/contexts/ThemeContext";
import config from "@/config/appConfig";
import {
    User,
    Sun,
    Moon,
    Monitor,
    Anchor,
    Mail,
} from "lucide-react";

export default function SettingsPage() {
    const { isDarkMode, toggleTheme } = useTheme();

    // Get user info from localStorage
    const userInfo = JSON.parse(localStorage.getItem("user_info") || "{}");
    const userName = userInfo.name || userInfo.email || "Manager";
    const userEmail = userInfo.email || "—";
    const userRole = userInfo.role || "Logistics Manager";

    return (
        <div className="settings-page">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Settings</h1>
                    <span className="dashboard-subtitle">
                        Profile and system preferences
                    </span>
                </div>
            </div>

            {/* Profile Section */}
            <div className="settings-section">
                <div className="settings-section-header">
                    <User size={20} />
                    <h2 className="settings-section-title">Profile</h2>
                </div>
                <div className="settings-card">
                    <div className="settings-row">
                        <span className="settings-label">Name</span>
                        <span className="settings-value">{userName}</span>
                    </div>
                    <div className="settings-divider" />
                    <div className="settings-row">
                        <span className="settings-label">Email</span>
                        <span className="settings-value">{userEmail}</span>
                    </div>
                    <div className="settings-divider" />
                    <div className="settings-row">
                        <span className="settings-label">Role</span>
                        <span className="settings-value">
                            <span className="status-badge active">{userRole}</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Appearance Section */}
            <div className="settings-section">
                <div className="settings-section-header">
                    <Monitor size={20} />
                    <h2 className="settings-section-title">Appearance</h2>
                </div>
                <div className="settings-card">
                    <div className="settings-row">
                        <div className="settings-label-group">
                            <span className="settings-label">Theme</span>
                            <span className="settings-hint">
                                Toggle between light and dark mode
                            </span>
                        </div>
                        <button className="theme-toggle-btn" onClick={toggleTheme}>
                            {isDarkMode ? (
                                <><Moon size={16} /><span>Dark</span></>
                            ) : (
                                <><Sun size={16} /><span>Light</span></>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Port Info Section */}
            <div className="settings-section">
                <div className="settings-section-header">
                    <Anchor size={20} />
                    <h2 className="settings-section-title">Port</h2>
                </div>
                <div className="settings-card">
                    <div className="settings-row">
                        <span className="settings-label">Port Name</span>
                        <span className="settings-value">{config.portName}</span>
                    </div>
                    <div className="settings-divider" />
                    <div className="settings-row">
                        <span className="settings-label">
                            <Mail size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "0.5rem" }} />
                            Support
                        </span>
                        <span className="settings-value">
                            <a href={`mailto:${config.supportEmail}`} className="settings-link">
                                {config.supportEmail}
                            </a>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
