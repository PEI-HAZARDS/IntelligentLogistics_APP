/**
 * Manager Layout Component
 * Wrapper layout with sidebar navigation for logistics manager interface
 */
import { NavLink, Outlet } from "react-router-dom";
import ManagerHeader from "./ManagerHeader";
import "./manager-layout.css";
import {
    LayoutDashboard,
    Calendar,
    TrendingUp,
    Truck,
    FileText,
    Settings,
} from "lucide-react";

interface NavItem {
    path: string;
    label: string;
    icon: React.ReactNode;
}

const navigationItems: NavItem[] = [
    { path: "/manager", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { path: "/manager/shifts", label: "Turnos", icon: <Calendar size={18} /> },
    { path: "/manager/analytics", label: "Análises", icon: <TrendingUp size={18} /> },
    { path: "/manager/transport", label: "Transportadoras", icon: <Truck size={18} /> },
];

const secondaryItems: NavItem[] = [
    { path: "/manager/reports", label: "Relatórios", icon: <FileText size={18} /> },
    { path: "/manager/settings", label: "Configurações", icon: <Settings size={18} /> },
];

export default function ManagerLayout() {
    return (
        <div className="manager-layout">
            <ManagerHeader />
            <div className="manager-content">
                <aside className="manager-sidebar">
                    <nav className="sidebar-nav">
                        <span className="sidebar-section-title">Principal</span>
                        {navigationItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === "/manager"}
                                className={({ isActive }) =>
                                    `sidebar-nav-item ${isActive ? "active" : ""}`
                                }
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </NavLink>
                        ))}

                        <span className="sidebar-section-title">Sistema</span>
                        {secondaryItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `sidebar-nav-item ${isActive ? "active" : ""}`
                                }
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>
                </aside>
                <main className="manager-main">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
