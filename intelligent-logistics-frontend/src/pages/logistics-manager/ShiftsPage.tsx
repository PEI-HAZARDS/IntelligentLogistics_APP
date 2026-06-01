/**
 * Shifts Management Page
 * Allows managers to view, filter, and manage operator shifts
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Filter, RefreshCw, Plus, Clock, User, Trash2, Upload, CalendarClock } from "lucide-react";
import { getShifts, deleteShift, type ShiftListItem } from "@/services/workers";
import ShiftCalendar from "@/components/logistics-manager/ShiftCalendar";
import ShiftTemplatesModal from "@/components/logistics-manager/ShiftTemplatesModal";
import AddShiftModal from "@/components/logistics-manager/AddShiftModal";
import ImportShiftsModal from "@/components/logistics-manager/ImportShiftsModal";
import ImportAppointmentsModal from "@/components/logistics-manager/ImportAppointmentsModal";
import { useQueryClient } from "@tanstack/react-query";
import { ToastNotifications, useToasts } from "@/components/common/ToastNotifications";

// Shift status type
type ShiftStatus = 'active' | 'pending' | 'completed' | 'inactive';

// Use the API type directly
type Shift = ShiftListItem;

const SHIFT_TYPE_LABELS: Record<string, string> = {
    'MORNING': '06:00 - 14:00',
    'AFTERNOON': '14:00 - 22:00',
    'NIGHT': '22:00 - 06:00',
};

const STATUS_LABELS: Record<ShiftStatus, string> = {
    'active': 'Active',
    'pending': 'Pending',
    'completed': 'Completed',
    'inactive': 'No Operator',
};

const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function ShiftsPage() {
    const queryClient = useQueryClient();
    const { toasts, addToast, dismissToast } = useToasts();
    // `monthShifts` holds the whole visible month (feeds the calendar); the
    // table shows the shifts of the selected day.
    const [monthShifts, setMonthShifts] = useState<Shift[]>([]);
    const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
    const [selectedDate, setSelectedDate] = useState<string>(() => toISO(new Date()));
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showTemplatesModal, setShowTemplatesModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showImportAppointmentsModal, setShowImportAppointmentsModal] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        workerId: '',
        status: '' as ShiftStatus | '',
        shiftType: '' as 'MORNING' | 'AFTERNOON' | 'NIGHT' | '',
    });

    const monthRange = useMemo(() => {
        const start = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
        const end = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
        return { from: toISO(start), to: toISO(end) };
    }, [calendarMonth]);

    // Fetch the whole visible month (one call powers both calendar and table).
    const fetchShifts = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getShifts({
                dateFrom: monthRange.from,
                dateTo: monthRange.to,
                shiftType: filters.shiftType || undefined,
            });
            setMonthShifts(data);
        } catch (error) {
            console.error("Failed to fetch shifts:", error);
            setMonthShifts([]);
        } finally {
            setIsLoading(false);
        }
    }, [monthRange, filters.shiftType]);

    useEffect(() => {
        fetchShifts();
    }, [fetchShifts]);

    // Table rows = selected day's shifts, with the text/status filters applied.
    const shifts = useMemo(() => {
        let filtered = monthShifts.filter(s => s.date === selectedDate);
        if (filters.workerId) {
            const q = filters.workerId.toLowerCase();
            filtered = filtered.filter(s =>
                s.operatorName.toLowerCase().includes(q) || s.operatorId.toLowerCase().includes(q));
        }
        if (filters.status) {
            filtered = filtered.filter(s => s.status === filters.status);
        }
        return filtered;
    }, [monthShifts, selectedDate, filters.workerId, filters.status]);

    const handleMonthChange = (delta: number) => {
        const next = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + delta, 1);
        setCalendarMonth(next);
        // Keep the selection meaningful: today if it falls in the new month, else day 1.
        const now = new Date();
        setSelectedDate(
            now.getMonth() === next.getMonth() && now.getFullYear() === next.getFullYear()
                ? toISO(now) : toISO(next),
        );
    };

    const clearFilters = () => {
        setFilters({ workerId: '', status: '', shiftType: '' });
    };

    const handleDeleteShift = async (shift: Shift) => {
        if (!confirm(`Delete shift ${shift.gateName} / ${SHIFT_TYPE_LABELS[shift.shiftType]} on ${shift.date}?`)) return;
        setDeletingId(shift.id);
        try {
            await deleteShift(shift.gateId, shift.shiftType, shift.date);
            await fetchShifts();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to delete shift";
            alert(msg);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="shifts-page">
            <ToastNotifications toasts={toasts} onDismiss={dismissToast} />
            {showAddModal && (
                <AddShiftModal
                    onClose={() => setShowAddModal(false)}
                    onCreated={() => {
                        setShowAddModal(false);
                        fetchShifts();
                        addToast({ type: 'success', title: 'Shift Created', message: 'The shift was created successfully.' });
                    }}
                />
            )}
            {showTemplatesModal && (
                <ShiftTemplatesModal
                    onClose={() => setShowTemplatesModal(false)}
                    onChanged={(msg) => {
                        fetchShifts();
                        if (msg) addToast({ type: 'success', title: 'Templates', message: msg });
                    }}
                />
            )}
            {showImportModal && (
                <ImportShiftsModal
                    onClose={() => setShowImportModal(false)}
                    onImported={(res) => {
                        if (res.created > 0) {
                            fetchShifts();
                            addToast({
                                type: res.errors.length > 0 || res.skipped > 0 ? 'warning' : 'success',
                                title: res.errors.length > 0 || res.skipped > 0 ? 'Import Completed with Warnings' : 'Import Successful',
                                message: `Successfully imported ${res.created} shifts.`
                            });
                        }
                        if (res.errors.length === 0 && res.skipped === 0) {
                            setShowImportModal(false);
                        }
                    }}
                />
            )}
            {showImportAppointmentsModal && (
                <ImportAppointmentsModal
                    onClose={() => setShowImportAppointmentsModal(false)}
                    onImported={(res) => {
                        if (res.created > 0) {
                            queryClient.invalidateQueries({ queryKey: ["arrivals"] });
                            addToast({
                                type: res.errors.length > 0 || res.skipped > 0 ? 'warning' : 'success',
                                title: res.errors.length > 0 || res.skipped > 0 ? 'Import Completed with Warnings' : 'Import Successful',
                                message: `Successfully imported ${res.created} appointments.`
                            });
                        }
                        if (res.errors.length === 0 && res.skipped === 0) {
                            setShowImportAppointmentsModal(false);
                        }
                    }}
                />
            )}

            <div className="dashboard-header">
                <h1 className="dashboard-title">Shifts & Appointments</h1>
                <div className="dashboard-filters">
                    <button className="action-btn" onClick={() => setShowImportAppointmentsModal(true)}>
                        <Upload size={16} />
                        Import Appointments
                    </button>
                    <button className="action-btn" onClick={() => setShowImportModal(true)}>
                        <Upload size={16} />
                        Import Shifts
                    </button>
                    <button className="action-btn" onClick={() => setShowTemplatesModal(true)}>
                        <CalendarClock size={16} />
                        Recurring Templates
                    </button>
                    <button className="action-btn primary" onClick={() => setShowAddModal(true)}>
                        <Plus size={16} />
                        New Shift
                    </button>
                </div>
            </div>

            {/* Calendar — monthly shift distribution */}
            <ShiftCalendar
                month={calendarMonth}
                shifts={monthShifts}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onMonthChange={handleMonthChange}
            />

            {/* Filters Panel */}
            <div className="shifts-filters">
                <h3 className="filters-title">
                    <Filter size={18} style={{ marginRight: '0.5rem', display: 'inline' }} />
                    Filters
                </h3>
                <div className="filters-grid">
                    <div className="filter-group">
                        <label className="filter-label">Worker ID / Name</label>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="filter-input"
                                placeholder="Search operator..."
                                value={filters.workerId}
                                onChange={(e) => setFilters(f => ({ ...f, workerId: e.target.value }))}
                                style={{ paddingLeft: '2.25rem' }}
                            />
                        </div>
                    </div>
                    <div className="filter-group">
                        <label className="filter-label">Status</label>
                        <select
                            className="filter-select"
                            value={filters.status}
                            onChange={(e) => setFilters(f => ({ ...f, status: e.target.value as ShiftStatus | '' }))}
                        >
                            <option value="">All</option>
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="inactive">No Operator</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label className="filter-label">Schedule</label>
                        <select
                            className="filter-select"
                            value={filters.shiftType}
                            onChange={(e) => setFilters(f => ({ ...f, shiftType: e.target.value as 'MORNING' | 'AFTERNOON' | 'NIGHT' | '' }))}
                        >
                            <option value="">All</option>
                            <option value="MORNING">Morning (06:00 - 14:00)</option>
                            <option value="AFTERNOON">Afternoon (14:00 - 22:00)</option>
                            <option value="NIGHT">Night (22:00 - 06:00)</option>
                        </select>
                    </div>
                </div>
                <div className="filters-actions">
                    <button className="action-btn primary" onClick={fetchShifts} disabled={isLoading}>
                        <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
                        Apply Filters
                    </button>
                    <button className="action-btn" onClick={clearFilters}>
                        Clear
                    </button>
                </div>
            </div>

            {/* Shifts Table */}
            <div className="data-table">
                <div className="data-table-header">
                    <h3 className="data-table-title">
                        Shifts · {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                    </h3>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {shifts.length} result{shifts.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Gate</th>
                                <th>Schedule</th>
                                <th>Date</th>
                                <th>Operator</th>
                                <th>Arrivals</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                                        <RefreshCw size={20} className="spinning" style={{ marginRight: '0.5rem' }} />
                                        Loading...
                                    </td>
                                </tr>
                            ) : shifts.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                                        No shifts found
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
                                        <td>{new Date(shift.date).toLocaleDateString('en-GB')}</td>
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
                                                className="action-btn danger"
                                                style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                                                disabled={shift.status === 'active' || deletingId === shift.id}
                                                title={shift.status === 'active' ? 'Cannot delete an active shift' : 'Delete shift'}
                                                onClick={() => handleDeleteShift(shift)}
                                            >
                                                <Trash2 size={14} />
                                                Delete
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
