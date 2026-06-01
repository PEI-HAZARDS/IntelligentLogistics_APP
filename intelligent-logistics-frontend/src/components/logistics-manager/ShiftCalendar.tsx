/**
 * Month calendar showing the distribution of shifts.
 * Each day cell shows colored dots per shift (by type) and a count; clicking a
 * day selects it (the page filters the table to that date).
 */
import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ShiftListItem } from "@/services/workers";

interface Props {
    month: Date;                       // any day within the displayed month
    shifts: ShiftListItem[];           // shifts covering (at least) the month
    selectedDate: string | null;       // ISO yyyy-mm-dd
    onSelectDate: (iso: string) => void;
    onMonthChange: (delta: number) => void;
}

const SHIFT_COLOR: Record<string, string> = {
    MORNING: "#f59e0b",
    AFTERNOON: "#0277BD",
    NIGHT: "#38bdf8",
};
const SHIFT_SHORT: Record<string, string> = { MORNING: "M", AFTERNOON: "A", NIGHT: "N" };
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toISO(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ShiftCalendar({ month, shifts, selectedDate, onSelectDate, onMonthChange }: Props) {
    const todayISO = toISO(new Date());

    // Group shifts by ISO date.
    const byDate = useMemo(() => {
        const m = new Map<string, ShiftListItem[]>();
        for (const s of shifts) {
            const arr = m.get(s.date) ?? [];
            arr.push(s);
            m.set(s.date, arr);
        }
        return m;
    }, [shifts]);

    // Build the 6-week grid (Monday-first), padded with adjacent-month days.
    const cells = useMemo(() => {
        const first = new Date(month.getFullYear(), month.getMonth(), 1);
        const lead = (first.getDay() + 6) % 7; // Mon=0
        const start = new Date(first);
        start.setDate(first.getDate() - lead);
        return Array.from({ length: 42 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });
    }, [month]);

    const monthLabel = month.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    const totalThisMonth = useMemo(
        () => shifts.filter(s => {
            const d = new Date(s.date);
            return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
        }).length,
        [shifts, month],
    );

    return (
        <div className="shift-calendar" style={{
            background: "var(--bg-card)", border: "1px solid var(--border-color)",
            borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.5rem",
        }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--text-primary)" }}>{monthLabel}</h3>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>· {totalThisMonth} shifts</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ display: "flex", gap: "0.75rem", marginRight: "0.5rem" }}>
                        {(["MORNING", "AFTERNOON", "NIGHT"] as const).map(t => (
                            <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: SHIFT_COLOR[t] }} />
                                {t[0] + t.slice(1).toLowerCase()}
                            </span>
                        ))}
                    </div>
                    <button className="action-btn" style={{ padding: "0.3rem 0.5rem" }} onClick={() => onMonthChange(-1)} title="Previous month">
                        <ChevronLeft size={16} />
                    </button>
                    <button className="action-btn" style={{ padding: "0.3rem 0.5rem" }} onClick={() => onMonthChange(1)} title="Next month">
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Weekday header */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
                {WEEKDAYS.map(w => (
                    <div key={w} style={{ textAlign: "center", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)" }}>{w}</div>
                ))}
            </div>

            {/* Day grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                {cells.map((d, i) => {
                    const iso = toISO(d);
                    const inMonth = d.getMonth() === month.getMonth();
                    const dayShifts = byDate.get(iso) ?? [];
                    const isToday = iso === todayISO;
                    const isSelected = iso === selectedDate;
                    return (
                        <button
                            key={i}
                            onClick={() => onSelectDate(iso)}
                            title={dayShifts.length ? `${dayShifts.length} shift(s)` : "No shifts"}
                            style={{
                                minHeight: 64, textAlign: "left", cursor: "pointer",
                                padding: "0.35rem 0.4rem", borderRadius: 8,
                                background: isSelected ? "var(--accent-bg, rgba(2,119,189,0.12))" : "transparent",
                                border: `1px solid ${isSelected ? "var(--accent-color, #0277BD)" : isToday ? "var(--border-hover, rgba(148,163,184,0.4))" : "var(--border-color)"}`,
                                opacity: inMonth ? 1 : 0.4,
                                display: "flex", flexDirection: "column", gap: 4,
                            }}
                        >
                            <span style={{
                                fontSize: "0.78rem", fontWeight: isToday ? 700 : 500,
                                color: isToday ? "var(--accent-color, #0277BD)" : "var(--text-primary)",
                            }}>{d.getDate()}</span>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                                {dayShifts.slice(0, 4).map(s => (
                                    <span
                                        key={s.id}
                                        title={`${s.shiftType} · ${s.gateName}${s.operatorName ? " · " + s.operatorName : " · unstaffed"}`}
                                        style={{
                                            width: 16, height: 16, borderRadius: 4,
                                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 9, fontWeight: 700, color: "#fff",
                                            background: SHIFT_COLOR[s.shiftType] ?? "#64748b",
                                            opacity: s.status === "inactive" ? 0.4 : 1,
                                        }}
                                    >{SHIFT_SHORT[s.shiftType] ?? "?"}</span>
                                ))}
                                {dayShifts.length > 4 && (
                                    <span style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: "16px" }}>+{dayShifts.length - 4}</span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
