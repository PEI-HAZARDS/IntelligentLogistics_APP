import { useState, useEffect } from "react";
import { X, Plus, Loader } from "lucide-react";
import { getGates, getOperators, createShift, type GateItem, type ShiftCreatePayload } from "@/services/workers";
import type { WorkerInfo } from "@/types/types";

interface Props {
    onClose: () => void;
    onCreated: () => void;
}

const SHIFT_OPTIONS = [
    { value: "MORNING", label: "Morning — 06:00–14:00" },
    { value: "AFTERNOON", label: "Afternoon — 14:00–22:00" },
    { value: "NIGHT", label: "Night — 22:00–06:00" },
] as const;

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

export default function AddShiftModal({ onClose, onCreated }: Props) {
    const [gates, setGates] = useState<GateItem[]>([]);
    const [operators, setOperators] = useState<WorkerInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState<{
        gate_id: string;
        shift_type: "MORNING" | "AFTERNOON" | "NIGHT";
        date: string;
        operator_num_worker: string;
    }>({
        gate_id: "",
        shift_type: "MORNING",
        date: todayISO(),
        operator_num_worker: "",
    });

    useEffect(() => {
        Promise.all([getGates(), getOperators()])
            .then(([g, o]) => { setGates(g); setOperators(o); })
            .catch(() => setError("Failed to load gates/operators"))
            .finally(() => setLoading(false));
    }, []);

    const set = (k: keyof typeof form, v: string) =>
        setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.gate_id) { setError("Please select a gate"); return; }
        setError(null);
        setSubmitting(true);
        try {
            const payload: ShiftCreatePayload = {
                gate_id: Number(form.gate_id),
                shift_type: form.shift_type,
                date: form.date,
                operator_num_worker: form.operator_num_worker || undefined,
            };
            await createShift(payload);
            onCreated();
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
                ?? "Failed to create shift";
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-container" style={{ maxWidth: 460 }}>
                <div className="modal-header">
                    <h2 className="modal-title">New Shift</h2>
                    <button className="modal-close-btn" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                        <Loader size={20} className="spinning" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {error && (
                                <div className="modal-error">{error}</div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Gate</label>
                                <select
                                    className="filter-select"
                                    value={form.gate_id}
                                    onChange={e => set("gate_id", e.target.value)}
                                    required
                                >
                                    <option value="">Select gate…</option>
                                    {gates.map(g => (
                                        <option key={g.id} value={g.id}>{g.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Schedule</label>
                                <select
                                    className="filter-select"
                                    value={form.shift_type}
                                    onChange={e => set("shift_type", e.target.value as typeof form.shift_type)}
                                >
                                    {SHIFT_OPTIONS.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Date</label>
                                <input
                                    type="date"
                                    className="filter-input"
                                    value={form.date}
                                    onChange={e => set("date", e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Operator <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span></label>
                                <select
                                    className="filter-select"
                                    value={form.operator_num_worker}
                                    onChange={e => set("operator_num_worker", e.target.value)}
                                >
                                    <option value="">— unassigned —</option>
                                    {operators.map(o => (
                                        <option key={o.num_worker} value={o.num_worker}>
                                            {o.name} ({o.num_worker})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="action-btn" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className="action-btn primary" disabled={submitting}>
                                {submitting ? <Loader size={14} className="spinning" /> : <Plus size={14} />}
                                Create Shift
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
