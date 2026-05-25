import { useState } from "react";
import { X, ShieldAlert, CheckCircle, RefreshCw, Building2, Calendar, DoorOpen } from "lucide-react";
import { reviewInfraction } from "@/services/arrivals";
import type { Appointment } from "@/types/types";

interface Props {
    appointment: Appointment;
    onClose: () => void;
    onReviewed: () => void;
}

function getCurrentManagerId(): string {
    try {
        const info = JSON.parse(localStorage.getItem("user_info") ?? "{}");
        return info.num_worker ?? "MANAGER";
    } catch {
        return "MANAGER";
    }
}

export default function InfractionReviewModal({ appointment, onClose, onReviewed }: Props) {
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const alreadyReviewed = !!(appointment as unknown as { reviewed_at?: string }).reviewed_at;

    const dateTime = appointment.scheduled_start_time
        ? new Date(appointment.scheduled_start_time).toLocaleString("en-GB", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        })
        : "—";

    const company = appointment.truck?.company?.name ?? appointment.truck?.company_nif ?? "—";
    const gate    = (appointment as unknown as { gate_in?: { label?: string } }).gate_in?.label ?? "—";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            await reviewInfraction(appointment.id, {
                reviewed_by: getCurrentManagerId(),
                note: note.trim() || undefined,
            });
            onReviewed();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
                ?? "Failed to submit review";
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-container" style={{ maxWidth: 480 }}>
                <div className="modal-header">
                    <h2 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <ShieldAlert size={18} style={{ color: "var(--color-danger)" }} />
                        Infraction Review
                    </h2>
                    <button className="modal-close-btn" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    {/* Infraction details */}
                    <div className="infr-review-card">
                        <div className="infr-review-plate">{appointment.truck_license_plate}</div>
                        <div className="infr-review-meta">
                            <span><Building2 size={13} /> {company}</span>
                            <span><Calendar size={13} /> {dateTime}</span>
                            <span><DoorOpen size={13} /> {gate}</span>
                        </div>
                        <div className="infr-review-badge">
                            <ShieldAlert size={12} />
                            Highway infraction — hazmat on restricted route
                        </div>
                    </div>

                    {alreadyReviewed && (
                        <div className="infr-review-already">
                            <CheckCircle size={14} />
                            Already reviewed — submitting will overwrite the previous record.
                        </div>
                    )}

                    {/* Note field */}
                    <form onSubmit={handleSubmit} id="review-form">
                        <div className="form-group">
                            <label className="form-label">
                                Note <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span>
                            </label>
                            <textarea
                                className="filter-input"
                                rows={3}
                                placeholder="e.g. Contacted carrier — warned about restricted route through N109. Reference: INC-2026-047"
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                style={{ resize: "vertical", fontFamily: "inherit" }}
                            />
                        </div>
                        {error && <div className="modal-error" style={{ marginTop: "0.5rem" }}>{error}</div>}
                    </form>
                </div>

                <div className="modal-footer">
                    <button type="button" className="action-btn" onClick={onClose}>Cancel</button>
                    <button
                        type="submit"
                        form="review-form"
                        className="action-btn primary"
                        disabled={submitting}
                    >
                        {submitting
                            ? <><RefreshCw size={14} className="spinning" /> Submitting…</>
                            : <><CheckCircle size={14} /> Mark as Reviewed</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
