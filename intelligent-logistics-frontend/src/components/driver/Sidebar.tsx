import { X, LogOut, Settings, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    driverName?: string;
}

const Sidebar = ({ isOpen, onClose, driverName = 'Motorista' }: SidebarProps) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        navigate('/login');
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`fixed top-0 left-0 bottom-0 w-[280px] z-[1000] shadow-2xl transform transition-transform duration-300 ease-out flex flex-col font-sans ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
                style={{
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    borderRight: '1px solid var(--border-color)'
                }}
            >
                {/* Header */}
                <div style={{ background: 'var(--accent-gradient)', paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }} className="p-6 text-white flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <UserCircle size={40} className="text-white" />
                        <div>
                            <h3 className="font-bold text-lg leading-tight">{driverName}</h3>
                            <p className="text-xs text-white opacity-80">Online</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                        <X size={24} color="white" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 py-4 px-3 space-y-1">
                    <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors hover:bg-[var(--bg-card-hover)]">
                        <Settings size={20} color="var(--icon-color)" />
                        <span className="font-medium">Settings</span>
                    </button>
                </div>

                {/* Footer */}
                <div className="p-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Log Out</span>
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
