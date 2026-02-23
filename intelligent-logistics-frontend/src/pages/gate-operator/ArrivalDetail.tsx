import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  User,
  Building2,
  Truck,
  Package,
  ShieldAlert,
  FileText,
} from "lucide-react";
import { getArrival } from "@/services/arrivals";
import type { Appointment } from "@/types/types";
import "./ArrivalDetail.css";

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    in_transit:  "In Transit",
    in_process:  "In Process",
    delayed:     "Delayed",
    completed:   "Completed",
    canceled:    "Canceled",
  };
  return map[s] ?? s;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="ad-row">
      <span className="ad-row-label">{label}</span>
      <span className="ad-row-value">{value}</span>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="ad-section">
      <div className="ad-section-header">
        {icon}
        <h3 className="ad-section-title">{title}</h3>
      </div>
      <div className="ad-section-body">{children}</div>
    </div>
  );
}

export default function ArrivalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getArrival(Number(id))
      .then(setAppointment)
      .catch(() => setError("Failed to load arrival details."))
      .finally(() => setIsLoading(false));
  }, [id]);

  return (
    <div className="ad-page">
      {/* ── Header ── */}
      <div className="ad-header">
        <button className="btn-secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Back
        </button>
        <h1 className="panel-title">Arrival Details</h1>
        <div />
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="ad-state">
          <Loader2 size={28} className="spin" />
          <span>Loading...</span>
        </div>
      )}

      {/* ── Error ── */}
      {error && !isLoading && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Content ── */}
      {appointment && !isLoading && (
        <div className="ad-content">

          {/* ── Highway Infraction Banner ── */}
          {appointment.highway_infraction && (
            <div className="ad-infraction-banner">
              <ShieldAlert size={22} />
              <div>
                <strong>Highway Infraction</strong>
                {appointment.notes && (
                  <p className="ad-infraction-notes">{appointment.notes}</p>
                )}
              </div>
            </div>
          )}

          {/* ── Appointment ── */}
          <Section icon={<FileText size={18} />} title="Appointment">
            <Row label="Arrival ID"     value={appointment.arrival_id} />
            <Row label="Reference"      value={appointment.booking_reference} />
            <Row
              label="Status"
              value={statusLabel(appointment.status)}
            />
            <Row
              label="Scheduled"
              value={
                appointment.scheduled_start_time
                  ? new Date(appointment.scheduled_start_time).toLocaleString("en-GB")
                  : undefined
              }
            />
            <Row
              label="Entry Gate"
              value={appointment.gate_in?.label}
            />
            {!appointment.highway_infraction && appointment.notes && (
              <Row label="Notes" value={appointment.notes} />
            )}
          </Section>

          {/* ── Driver ── */}
          {appointment.driver && (
            <Section icon={<User size={18} />} title="Driver">
              <Row label="Name"            value={appointment.driver.name} />
              <Row label="License"         value={appointment.driver.drivers_license} />
              <Row label="Phone"           value={appointment.driver.mobile_device_token ?? undefined} />
            </Section>
          )}

          {/* ── Company ── */}
          {(appointment.driver?.company ?? appointment.truck?.company) && (
            <Section icon={<Building2 size={18} />} title="Company">
              {(() => {
                const co = appointment.driver?.company ?? appointment.truck?.company;
                return (
                  <>
                    <Row label="Name"    value={co?.name} />
                    <Row label="NIF"     value={co?.nif} />
                    <Row label="Contact" value={co?.contact ?? undefined} />
                  </>
                );
              })()}
            </Section>
          )}

          {/* ── Truck ── */}
          {appointment.truck && (
            <Section icon={<Truck size={18} />} title="Truck">
              <Row label="License Plate" value={appointment.truck.license_plate} />
              <Row label="Brand"         value={appointment.truck.brand ?? undefined} />
            </Section>
          )}

          {/* ── Cargo ── */}
          {appointment.booking?.cargos && appointment.booking.cargos.length > 0 && (
            <Section icon={<Package size={18} />} title="Cargo">
              {appointment.booking.cargos.map((cargo, i) => (
                <div key={i} className="ad-cargo-item">
                  <Row label="Description" value={cargo.description ?? undefined} />
                  <Row label="Quantity"    value={cargo.quantity != null ? String(cargo.quantity) : undefined} />
                  <Row label="State"       value={cargo.state ?? undefined} />
                  {i < appointment.booking!.cargos!.length - 1 && <hr className="ad-cargo-divider" />}
                </div>
              ))}
            </Section>
          )}

        </div>
      )}
    </div>
  );
}
