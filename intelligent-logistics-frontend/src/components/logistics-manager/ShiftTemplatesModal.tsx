/**
 * Recurring shift templates — manager CRUD + on-demand generation.
 *
 * Lists active/inactive templates, lets the manager create a new recurring rule
 * (gate, shift type, weekday mask, optional staffing, validity), toggle/delete
 * existing ones, and run "Generate now" to materialise upcoming shifts. Mirrors
 * the AddShiftModal pattern (modal-overlay/container, gates/operators/managers).
 */
import { useState, useEffect, useCallback } from "react";
import { X, Plus, Loader, Trash2, Eye, EyeOff, CalendarClock, Zap } from "lucide-react";
import {
    getGates, getOperators, getManagers,
    getShiftTemplates, createShiftTemplate, updateShiftTemplate, deleteShiftTemplate, generateShifts,
    type GateItem, type ShiftTemplate, type ShiftTemplatePayload,
} from "@/services/workers";
import type { WorkerInfo } from "@/types/types";

interface Props {
    onClose: () => void;
    /** Called after any change that affects shifts (create/delete/toggle/generate). */
    onChanged: (msg?: string) => void;
}

const SHIFT_OPTIONS = [
    { value: "MORNING", label: "Morning — 06:00–14:00" },
    { value: "AFTERNOON", label: "Afternoon — 14:00–22:00" },
    { value: "NIGHT", label: "Night — 22:00–06:00" },
] as const;

// index 0 = Monday … 6 = Sunday (matches the backend mask).
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_MASK = "1111100"; // Mon–Fri

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function WeekdayChips({ mask }: { mask: string }) {
    return (
        <span style={{ display: "inline-flex", gap: 2 }}>
            {WEEKDAYS.map((w, i) => (
                <span key={w} title={w} style={{
                    width: 18, height: 18, borderRadius: 4, fontSize: 9, fontWeight: 700,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    color: mask[i] === "1" ? "#fff" : "var(--text-muted)",
                    background: mask[i] === "1" ? "var(--accent-color, #0277BD)" : "var(--bg-surface, rgba(148,163,184,0.12))",
                }}>{w[0]}</span>
            ))}
        </span>
    );
}

export default function ShiftTemplatesModal({ onClose, onChanged }: Props) {
    const [gates, setGates] = useState<GateItem[]>([]);
    const [operators, setOperators] = useState<WorkerInfo[]>([]);
    const [managers, setManagers] = useState<WorkerInfo[]>([]);
    const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);

    const [form, setForm] = useState({
        gate_id: "",
        shift_type: "MORNING" as "MORNING" | "AFTERNOON" | "NIGHT",
        weekdays: DEFAULT_MASK,
        operator_num_worker: "",
        manager_num_worker: "",
        valid_from: todayISO(),
        valid_until: "",
    });

    const reloadTemplates = useCallback(async () => {
        setTemplates(await getShiftTemplates(true));
    }, []);

    useEffect(() => {
        Promise.all([getGates(), getOperators(), getManagers(), getShiftTemplates(true)])
            .then(([g, o, m, t]) => { setGates(g); setOperators(o); setManagers(m); setTemplates(t); })
            .catch(() => setError("Failed to load templates / reference data"))
            .finally(() => setLoading(false));
    }, []);

    const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

    const toggleWeekday = (i: number) => {
        setForm(f => {
            const arr = f.weekdays.split("");
            arr[i] = arr[i] === "1" ? "0" : "1";
            return { ...f, weekdays: arr.join("") };
        });
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.gate_id) { setError("Please select a gate"); return; }
        if (!form.weekdays.includes("1")) { setError("Pick at least one weekday"); return; }
        setError(null); setStatus(null); setSubmitting(true);
        try {
            const payload: ShiftTemplatePayload = {
                gate_id: Number(form.gate_id),
                shift_type: form.shift_type,
                weekdays: form.weekdays,
                operator_num_worker: form.operator_num_worker || undefined,
                manager_num_worker: form.manager_num_worker || undefined,
                valid_from: form.valid_from || undefined,
                valid_until: form.valid_until || undefined,
            };
            await createShiftTemplate(payload);
            await reloadTemplates();
            setStatus("Template created.");
            onChanged();
        } catch (err: unknown) {
            setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to create template");
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleActive = async (t: ShiftTemplate) => {
        try {
            await updateShiftTemplate(t.id, { active: !t.active });
            await reloadTemplates();
            onChanged();
        } catch {
            setError("Failed to update template");
        }
    };

    const handleDelete = async (t: ShiftTemplate) => {
        if (!confirm(`Delete template ${t.gate_name} · ${t.shift_type}?`)) return;
        try {
            await deleteShiftTemplate(t.id);
            await reloadTemplates();
            onChanged();
        } catch {
            setError("Failed to delete template");
        }
    };

    const handleGenerate = async () => {
        setGenerating(true); setError(null); setStatus(null);
        try {
            const res = await generateShifts(14);
            setStatus(`Generated ${res.created} shift(s), skipped ${res.skipped} (next 14 days).`);
            onChanged(`Generated ${res.created} shifts from templates.`);
        } catch (err: unknown) {
            setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to generate shifts");
        } finally {
            setGenerating(false);
        }
    };

    const workerName = (list: WorkerInfo[], num: string) =>
        list.find(w => w.num_worker === num)?.name ?? num;

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-container" style={{ maxWidth: 640 }}>
                <div className="modal-header">
                    <h2 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <CalendarClock size={18} /> Recurring Shift Templates
                    </h2>
                    <button className="modal-close-btn" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                        <Loader size={20} className="spinning" />
                    </div>
                ) : (
                    <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {error && <div className="modal-error">{error}</div>}
                        {status && <div style={{ color: "var(--color-success)", fontSize: "0.85rem" }}>{status}</div>}

                        {/* Existing templates */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: 220, overflowY: "auto" }}>
                            {templates.length === 0 ? (
                                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No templates yet.</span>
                            ) : templates.map(t => (
                                <div key={t.id} style={{
                                    display: "flex", alignItems: "center", gap: "0.6rem",
                                    padding: "0.5rem 0.6rem", borderRadius: 8,
                                    border: "1px solid var(--border-color)", opacity: t.active ? 1 : 0.55,
                                }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>
                                            {t.gate_name} · {t.shift_type[0] + t.shift_type.slice(1).toLowerCase()}
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: 3 }}>
                                            <WeekdayChips mask={t.weekdays} />
                                            <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                                                {t.operator_num_worker ? workerName(operators, t.operator_num_worker) : "unstaffed"}
                                            </span>
                                        </div>
                                    </div>
                                    <button className="action-btn" style={{ padding: "0.3rem 0.5rem" }}
                                        title={t.active ? "Disable" : "Enable"} onClick={() => handleToggleActive(t)}>
                                        {t.active ? <Eye size={14} /> : <EyeOff size={14} />}
                                    </button>
                                    <button className="action-btn danger" style={{ padding: "0.3rem 0.5rem" }}
                                        title="Delete" onClick={() => handleDelete(t)}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* New template form */}
                        <form onSubmit={handleCreate} style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.85rem" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className="form-group">
                                    <label className="form-label">Gate</label>
                                    <select className="filter-select" value={form.gate_id} onChange={e => set("gate_id", e.target.value)} required>
                                        <option value="">Select gate…</option>
                                        {gates.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Schedule</label>
                                    <select className="filter-select" value={form.shift_type} onChange={e => set("shift_type", e.target.value)}>
                                        {SHIFT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group" style={{ marginTop: "0.75rem" }}>
                                <label className="form-label">Repeat on</label>
                                <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                                    {WEEKDAYS.map((w, i) => (
                                        <button type="button" key={w} onClick={() => toggleWeekday(i)} style={{
                                            padding: "0.3rem 0.55rem", borderRadius: 6, fontSize: "0.78rem", cursor: "pointer",
                                            border: `1px solid ${form.weekdays[i] === "1" ? "var(--accent-color, #0277BD)" : "var(--border-color)"}`,
                                            background: form.weekdays[i] === "1" ? "var(--accent-bg, rgba(2,119,189,0.12))" : "transparent",
                                            color: form.weekdays[i] === "1" ? "var(--accent-color, #0277BD)" : "var(--text-secondary)",
                                        }}>{w}</button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.75rem" }}>
                                <div className="form-group">
                                    <label className="form-label">Operator <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span></label>
                                    <select className="filter-select" value={form.operator_num_worker} onChange={e => set("operator_num_worker", e.target.value)}>
                                        <option value="">— unstaffed —</option>
                                        {operators.map(o => <option key={o.num_worker} value={o.num_worker}>{o.name} ({o.num_worker})</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Manager <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span></label>
                                    <select className="filter-select" value={form.manager_num_worker} onChange={e => set("manager_num_worker", e.target.value)}>
                                        <option value="">— none —</option>
                                        {managers.map(m => <option key={m.num_worker} value={m.num_worker}>{m.name} ({m.num_worker})</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.75rem" }}>
                                <div className="form-group">
                                    <label className="form-label">Valid from</label>
                                    <input type="date" className="filter-input" value={form.valid_from} onChange={e => set("valid_from", e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Valid until <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span></label>
                                    <input type="date" className="filter-input" value={form.valid_until} onChange={e => set("valid_until", e.target.value)} />
                                </div>
                            </div>

                            <button type="submit" className="action-btn primary" style={{ marginTop: "0.85rem" }} disabled={submitting}>
                                {submitting ? <Loader size={14} className="spinning" /> : <Plus size={14} />}
                                New Template
                            </button>
                        </form>
                    </div>
                )}

                <div className="modal-footer" style={{ justifyContent: "space-between" }}>
                    <button type="button" className="action-btn" onClick={handleGenerate} disabled={generating || loading}
                        title="Materialise shifts from active templates for the next 14 days">
                        {generating ? <Loader size={14} className="spinning" /> : <Zap size={14} />}
                        Generate now (14d)
                    </button>
                    <button type="button" className="action-btn primary" onClick={onClose}>Done</button>
                </div>
            </div>
        </div>
    );
}
