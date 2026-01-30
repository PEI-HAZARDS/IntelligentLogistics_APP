/**
 * Shifts Management Page
 * Allows managers to view, filter, and manage operator shifts
 */
import { useState, useEffect, useCallback } from "react";
import { Search, Filter, RefreshCw, Plus, Check, Clock, User } from "lucide-react";

// Shift status type
type ShiftStatus = 'active' | 'pending' | 'completed' | 'inactive';

// Shift data interface
interface Shift {
    id: string;
    gateId: number;
    gateName: string;
    shiftType: 'MORNING' | 'AFTERNOON' | 'NIGHT';
    date: string;
    operatorId: string;
    operatorName: string;
    managerId?: string;
    managerName?: string;
    maxArrivals: number;
    currentArrivals: number;
    status: ShiftStatus;
}

// Mock data for development
const MOCK_SHIFTS: Shift[] = [
    { id: '1', gateId: 1, gateName: 'Gate A', shiftType: 'MORNING', date: '2026-01-30', operatorId: 'OP001', operatorName: 'João Silva', managerId: 'MG001', managerName: 'Maria Santos', maxArrivals: 20, currentArrivals: 15, status: 'active' },
    { id: '2', gateId: 1, gateName: 'Gate A', shiftType: 'AFTERNOON', date: '2026-01-30', operatorId: 'OP002', operatorName: 'Pedro Costa', managerId: 'MG001', managerName: 'Maria Santos', maxArrivals: 25, currentArrivals: 0, status: 'pending' },
    { id: '3', gateId: 2, gateName: 'Gate B', shiftType: 'MORNING', date: '2026-01-30', operatorId: 'OP003', operatorName: 'Ana Ferreira', maxArrivals: 18, currentArrivals: 18, status: 'completed' },
    { id: '4', gateId: 2, gateName: 'Gate B', shiftType: 'AFTERNOON', date: '2026-01-30', operatorId: '', operatorName: '', maxArrivals: 20, currentArrivals: 0, status: 'inactive' },
    { id: '5', gateId: 1, gateName: 'Gate A', shiftType: 'NIGHT', date: '2026-01-30', operatorId: 'OP004', operatorName: 'Rui Martins', maxArrivals: 15, currentArrivals: 3, status: 'pending' },
];

const SHIFT_TYPE_LABELS: Record<string, string> = {
    'MORNING': '06:00 - 14:00',
    'AFTERNOON': '14:00 - 22:00',
    'NIGHT': '22:00 - 06:00',
};

const STATUS_LABELS: Record<ShiftStatus, string> = {
    'active': 'Ativo',
    'pending': 'Pendente',
    'completed': 'Concluído',
    'inactive': 'Sem Operador',
};

export default function ShiftsPage() {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({
        workerId: '',
        status: '' as ShiftStatus | '',
        shiftType: '' as 'MORNING' | 'AFTERNOON' | 'NIGHT' | '',
    });

    // Fetch shifts data
    const fetchShifts = useCallback(async () => {
        setIsLoading(true);
        try {
            // TODO: Replace with actual API call
            // const response = await getShifts(filters);
            // setShifts(response);

            // Using mock data for now
            await new Promise(resolve => setTimeout(resolve, 500));
            let filtered = [...MOCK_SHIFTS];

            if (filters.workerId) {
                filtered = filtered.filter(s =>
                    s.operatorName.toLowerCase().includes(filters.workerId.toLowerCase()) ||
                    s.operatorId.toLowerCase().includes(filters.workerId.toLowerCase())
                );
            }
            if (filters.status) {
                filtered = filtered.filter(s => s.status === filters.status);
            }
            if (filters.shiftType) {
                filtered = filtered.filter(s => s.shiftType === filters.shiftType);
            }

            setShifts(filtered);
        } catch (error) {
            console.error("Failed to fetch shifts:", error);
            setShifts(MOCK_SHIFTS);
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchShifts();
    }, [fetchShifts]);

    const clearFilters = () => {
        setFilters({ workerId: '', status: '', shiftType: '' });
    };

    const handleAddShift = () => {
        // TODO: Open modal to add new shift
        alert('Funcionalidade de adicionar turno em desenvolvimento');
    };

    return (
        <div className="shifts-page">
            <div className="dashboard-header">
                <h1 className="dashboard-title">Gestão de Turnos</h1>
                <div className="dashboard-filters">
                    <button className="action-btn primary" onClick={handleAddShift}>
                        <Plus size={16} />
                        Novo Turno
                    </button>
                </div>
            </div>

            {/* Filters Panel */}
            <div className="shifts-filters">
                <h3 className="filters-title">
                    <Filter size={18} style={{ marginRight: '0.5rem', display: 'inline' }} />
                    Filtros
                </h3>
                <div className="filters-grid">
                    <div className="filter-group">
                        <label className="filter-label">Número Trabalhador / Nome</label>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="filter-input"
                                placeholder="Pesquisar operador..."
                                value={filters.workerId}
                                onChange={(e) => setFilters(f => ({ ...f, workerId: e.target.value }))}
                                style={{ paddingLeft: '2.25rem' }}
                            />
                        </div>
                    </div>
                    <div className="filter-group">
                        <label className="filter-label">Estado</label>
                        <select
                            className="filter-select"
                            value={filters.status}
                            onChange={(e) => setFilters(f => ({ ...f, status: e.target.value as ShiftStatus | '' }))}
                        >
                            <option value="">Todos</option>
                            <option value="active">Ativo</option>
                            <option value="pending">Pendente</option>
                            <option value="completed">Concluído</option>
                            <option value="inactive">Sem Operador</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label className="filter-label">Horário</label>
                        <select
                            className="filter-select"
                            value={filters.shiftType}
                            onChange={(e) => setFilters(f => ({ ...f, shiftType: e.target.value as 'MORNING' | 'AFTERNOON' | 'NIGHT' | '' }))}
                        >
                            <option value="">Todos</option>
                            <option value="MORNING">Manhã (06:00 - 14:00)</option>
                            <option value="AFTERNOON">Tarde (14:00 - 22:00)</option>
                            <option value="NIGHT">Noite (22:00 - 06:00)</option>
                        </select>
                    </div>
                </div>
                <div className="filters-actions">
                    <button className="action-btn primary" onClick={fetchShifts} disabled={isLoading}>
                        <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
                        Aplicar Filtros
                    </button>
                    <button className="action-btn" onClick={clearFilters}>
                        Limpar
                    </button>
                </div>
            </div>

            {/* Shifts Table */}
            <div className="data-table">
                <div className="data-table-header">
                    <h3 className="data-table-title">Lista de Turnos</h3>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {shifts.length} resultado{shifts.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Portaria</th>
                                <th>Horário</th>
                                <th>Data</th>
                                <th>Operador</th>
                                <th>Chegadas</th>
                                <th>Estado</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                                        <RefreshCw size={20} className="spinning" style={{ marginRight: '0.5rem' }} />
                                        A carregar...
                                    </td>
                                </tr>
                            ) : shifts.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                                        Nenhum turno encontrado
                                    </td>
                                </tr>
                            ) : (
                                shifts.map((shift) => (
                                    <tr key={shift.id}>
                                        <td>#{shift.id}</td>
                                        <td>{shift.gateName}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Clock size={14} />
                                                {SHIFT_TYPE_LABELS[shift.shiftType]}
                                            </div>
                                        </td>
                                        <td>{new Date(shift.date).toLocaleDateString('pt-PT')}</td>
                                        <td>
                                            {shift.operatorName ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <User size={14} />
                                                    {shift.operatorName}
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                                            )}
                                        </td>
                                        <td>
                                            {shift.currentArrivals} / {shift.maxArrivals}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${shift.status}`}>
                                                {STATUS_LABELS[shift.status]}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className="action-btn"
                                                style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                                                onClick={() => alert(`Ver detalhes do turno ${shift.id}`)}
                                            >
                                                <Check size={14} />
                                                Gerir
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
