import { useState, useRef } from "react";
import { X, Upload, Download, CheckCircle, AlertCircle, RefreshCw, FileText } from "lucide-react";
import { importShiftsCSV, type BulkShiftResult } from "@/services/workers";

interface Props {
    onClose: () => void;
    onImported: () => void;
}

const CSV_TEMPLATE = [
    "gate_id,shift_type,date,operator_num_worker,manager_num_worker",
    "1,MORNING,2026-06-01,OP001,MG001",
    "1,AFTERNOON,2026-06-01,OP002,MG001",
    "2,MORNING,2026-06-01,OP003,",
].join("\n");

function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shifts_template.csv";
    a.click();
    URL.revokeObjectURL(url);
}

type Stage = "idle" | "preview" | "uploading" | "done";

export default function ImportShiftsModal({ onClose, onImported }: Props) {
    const [stage, setStage] = useState<Stage>("idle");
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<BulkShiftResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = (f: File) => {
        if (!f.name.endsWith(".csv")) {
            setError("Please select a .csv file");
            return;
        }
        setFile(f);
        setError(null);
        setStage("preview");
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    };

    const handleUpload = async () => {
        if (!file) return;
        setStage("uploading");
        setError(null);
        try {
            const res = await importShiftsCSV(file);
            setResult(res);
            setStage("done");
            if (res.created > 0) onImported();
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
                ?? "Import failed";
            setError(msg);
            setStage("preview");
        }
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-container" style={{ maxWidth: 520 }}>
                <div className="modal-header">
                    <h2 className="modal-title">Import Shifts from CSV</h2>
                    <button className="modal-close-btn" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                    {/* Template download */}
                    <div className="import-template-row">
                        <div>
                            <p className="import-hint-title">Required columns</p>
                            <p className="import-hint-sub">
                                <code>gate_id</code>, <code>shift_type</code> (MORNING / AFTERNOON / NIGHT), <code>date</code> (YYYY-MM-DD)
                            </p>
                            <p className="import-hint-sub" style={{ marginTop: "0.2rem" }}>
                                Optional: <code>operator_num_worker</code>, <code>manager_num_worker</code>
                            </p>
                        </div>
                        <button className="action-btn" onClick={downloadTemplate} title="Download CSV template">
                            <Download size={14} />
                            Template
                        </button>
                    </div>

                    {/* Drop zone */}
                    {stage === "idle" || stage === "preview" ? (
                        <div
                            className={`import-dropzone${dragOver ? " import-dropzone--over" : ""}${file ? " import-dropzone--has-file" : ""}`}
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => inputRef.current?.click()}
                        >
                            <input
                                ref={inputRef}
                                type="file"
                                accept=".csv"
                                style={{ display: "none" }}
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                            />
                            {file ? (
                                <>
                                    <FileText size={22} style={{ color: "var(--accent-color)" }} />
                                    <span className="import-filename">{file.name}</span>
                                    <span className="import-filesize">{(file.size / 1024).toFixed(1)} KB — click to change</span>
                                </>
                            ) : (
                                <>
                                    <Upload size={22} style={{ opacity: 0.5 }} />
                                    <span className="import-drop-label">Drag & drop CSV or click to browse</span>
                                </>
                            )}
                        </div>
                    ) : null}

                    {error && (
                        <div className="modal-error">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    {/* Result summary */}
                    {stage === "done" && result && (
                        <div className="import-result">
                            <div className="import-result-row import-result-created">
                                <CheckCircle size={16} />
                                <span><strong>{result.created}</strong> shifts created</span>
                            </div>
                            {result.skipped > 0 && (
                                <div className="import-result-row import-result-skipped">
                                    <AlertCircle size={16} />
                                    <span><strong>{result.skipped}</strong> skipped (already exist)</span>
                                </div>
                            )}
                            {result.errors.length > 0 && (
                                <div className="import-errors">
                                    <p className="import-errors-title">
                                        <AlertCircle size={13} /> {result.errors.length} row{result.errors.length !== 1 ? "s" : ""} with errors
                                    </p>
                                    <ul className="import-errors-list">
                                        {result.errors.map((e, i) => (
                                            <li key={i}>Row {e.row}: {e.reason}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button type="button" className="action-btn" onClick={onClose}>
                        {stage === "done" ? "Close" : "Cancel"}
                    </button>
                    {stage !== "done" && (
                        <button
                            className="action-btn primary"
                            onClick={handleUpload}
                            disabled={!file || stage === "uploading"}
                        >
                            {stage === "uploading"
                                ? <><RefreshCw size={14} className="spinning" /> Importing…</>
                                : <><Upload size={14} /> Import</>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
