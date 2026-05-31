/**
 * Export / Email reviewed infractions — carrier picker.
 *
 * Opens a popup where the manager selects a single company (or all) and then
 * downloads a CSV or opens an email draft containing only that carrier's
 * reviewed highway infractions. Reuses the shared export/mailto helpers.
 */
import { useEffect, useMemo, useState } from "react";
import { X, ShieldAlert, Download, Mail, RefreshCw, Building2, AlertCircle, CheckCircle } from "lucide-react";
import {
    exportReviewedInfractionsCSV, mailtoReviewedInfractions, onlyReviewed,
    type ReviewedInfraction,
} from "@/lib/infractionExport";

interface Props {
    /** Loads every infraction already filtered to the reviewed ones. */
    fetchReviewed: () => Promise<ReviewedInfraction[]>;
    onClose: () => void;
}

const ALL_KEY = "__all__";

interface CarrierGroup {
    key: string;
    name: string;
    nif: string;
    items: ReviewedInfraction[];
}

function carrierName(item: ReviewedInfraction): string {
    return item.truck?.company?.name ?? item.truck?.company_nif ?? "Unknown carrier";
}
function carrierNif(item: ReviewedInfraction): string {
    return item.truck?.company?.nif ?? item.truck?.company_nif ?? "";
}

export default function ExportInfractionsModal({ fetchReviewed, onClose }: Props) {
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);
    const [reviewed, setReviewed] = useState<ReviewedInfraction[]>([]);
    const [selected, setSelected] = useState<string>(ALL_KEY);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await fetchReviewed();
                if (!cancelled) setReviewed(onlyReviewed(data));
            } catch {
                if (!cancelled) setError("Failed to load reviewed infractions.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [fetchReviewed]);

    const groups = useMemo<CarrierGroup[]>(() => {
        const map = new Map<string, CarrierGroup>();
        for (const item of reviewed) {
            const nif = carrierNif(item);
            const key = nif || carrierName(item);
            const g = map.get(key) ?? { key, name: carrierName(item), nif, items: [] };
            g.items.push(item);
            map.set(key, g);
        }
        return [...map.values()].sort((a, b) => b.items.length - a.items.length);
    }, [reviewed]);

    const selectedItems = useMemo<ReviewedInfraction[]>(() => {
        if (selected === ALL_KEY) return reviewed;
        return groups.find(g => g.key === selected)?.items ?? [];
    }, [selected, groups, reviewed]);

    const canAct = selectedItems.length > 0;

    const handleCsv   = () => { exportReviewedInfractionsCSV(selectedItems); };
    const handleEmail = () => { mailtoReviewedInfractions(selectedItems); };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-container" style={{ maxWidth: 520 }}>
                <div className="modal-header">
                    <h2 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <ShieldAlert size={18} style={{ color: "var(--color-danger)" }} />
                        Export Reviewed Infractions
                    </h2>
                    <button className="modal-close-btn" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        Select a carrier to export or email only their reviewed highway infractions.
                    </p>

                    {loading ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", padding: "1.5rem 0", justifyContent: "center" }}>
                            <RefreshCw size={16} className="spinning" /> Loading reviewed infractions…
                        </div>
                    ) : error ? (
                        <div className="modal-error" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <AlertCircle size={15} /> {error}
                        </div>
                    ) : reviewed.length === 0 ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", padding: "1.5rem 0", justifyContent: "center" }}>
                            <CheckCircle size={16} /> No reviewed infractions yet.
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: 320, overflowY: "auto" }}>
                            {/* All carriers */}
                            <CarrierRow
                                label="All carriers"
                                sublabel={`${groups.length} carrier${groups.length === 1 ? "" : "s"}`}
                                count={reviewed.length}
                                active={selected === ALL_KEY}
                                onSelect={() => setSelected(ALL_KEY)}
                            />
                            <div style={{ height: 1, background: "var(--border-color)", margin: "0.2rem 0" }} />
                            {groups.map(g => (
                                <CarrierRow
                                    key={g.key}
                                    label={g.name}
                                    sublabel={g.nif || "—"}
                                    count={g.items.length}
                                    active={selected === g.key}
                                    onSelect={() => setSelected(g.key)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="modal-footer" style={{ justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {canAct ? `${selectedItems.length} infraction${selectedItems.length === 1 ? "" : "s"} selected` : "Nothing selected"}
                    </span>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button type="button" className="action-btn" onClick={handleEmail} disabled={!canAct} title="Open an email draft for the selected carrier">
                            <Mail size={14} /> Email
                        </button>
                        <button type="button" className="action-btn primary" onClick={handleCsv} disabled={!canAct} title="Download a CSV for the selected carrier">
                            <Download size={14} /> Export CSV
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CarrierRow({ label, sublabel, count, active, onSelect }: {
    label: string; sublabel: string; count: number; active: boolean; onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            style={{
                display: "flex", alignItems: "center", gap: "0.6rem", width: "100%",
                padding: "0.55rem 0.7rem", borderRadius: 8, cursor: "pointer", textAlign: "left",
                background: active ? "var(--accent-bg, rgba(2,119,189,0.08))" : "transparent",
                border: `1px solid ${active ? "var(--accent-color, #0277BD)" : "var(--border-color)"}`,
                color: "var(--text-primary)",
            }}
        >
            <span style={{
                width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                border: `2px solid ${active ? "var(--accent-color, #0277BD)" : "var(--text-muted)"}`,
                background: active ? "var(--accent-color, #0277BD)" : "transparent",
                boxShadow: active ? "inset 0 0 0 2px var(--bg-card, #1e293b)" : "none",
            }} />
            <Building2 size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: "0.88rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{sublabel}</span>
            </div>
            <span style={{
                marginLeft: "auto", flexShrink: 0, fontSize: "0.78rem", fontWeight: 700,
                color: "var(--color-danger, #ef4444)", background: "rgba(239,68,68,0.12)",
                borderRadius: 999, padding: "0.1rem 0.55rem",
            }}>{count}</span>
        </button>
    );
}
