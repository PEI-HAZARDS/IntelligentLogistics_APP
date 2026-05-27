import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Loader2,
  AlertTriangle,
  Truck,
  User,
  Building2,
  Package,
  MapPin,
  Clock,
  ShieldAlert,
  Container,
  Navigation,
} from 'lucide-react';
import { getArrivalDetail } from '@/services/arrivals';
import { labelForStatus, getSubBadges, getVisitLabel, statusClass } from '@/lib/statusLabel';
import type { AppointmentStatusEnum } from '@/types/types';
import './AppointmentDetailModal.css';

interface Props {
  appointmentId: number | null;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="adm-row">
      <span className="adm-label">{label}</span>
      <span className="adm-value">{value}</span>
    </div>
  );
}

const VISIT_STATE_ORDER = ['in_port', 'unloading', 'done'] as const;

function VisitTimeline({ state }: { state: string }) {
  return (
    <div className="adm-visit-timeline">
      {VISIT_STATE_ORDER.map((s, i) => {
        const idx = VISIT_STATE_ORDER.indexOf(state as typeof VISIT_STATE_ORDER[number]);
        const done = i < idx;
        const active = s === state;
        return (
          <div key={s} className={`adm-timeline-step ${active ? 'active' : done ? 'done' : ''}`}>
            <div className="adm-timeline-dot" />
            <span className="adm-timeline-label">{getVisitLabel(s)}</span>
            {i < VISIT_STATE_ORDER.length - 1 && <div className="adm-timeline-line" />}
          </div>
        );
      })}
    </div>
  );
}

export default function AppointmentDetailModal({ appointmentId, onClose }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['appointment-detail', appointmentId],
    queryFn: () => getArrivalDetail(appointmentId!),
    enabled: appointmentId !== null,
    staleTime: 30_000,
  });

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (appointmentId === null) return null;

  const primaryStatus = (data as any)?.primary_status ?? data?.status;
  const subBadges = data ? getSubBadges(data as any) : [];

  return createPortal(
    <div className="adm-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="adm-header">
          <div className="adm-header-left">
            <span className="adm-pin">{data?.arrival_id ?? `#${appointmentId}`}</span>
            {primaryStatus && (
              <span className={`status-badge status-${statusClass(primaryStatus as AppointmentStatusEnum)}`}>
                {labelForStatus(primaryStatus)}
              </span>
            )}
            {subBadges.map(b => (
              <span key={b} className={`status-badge status-${b}-substate`}>
                {labelForStatus(b)}
              </span>
            ))}
            {data?.highway_infraction && (
              <span className="status-badge status-highway-infraction">
                <ShieldAlert size={12} /> Infraction
              </span>
            )}
          </div>
          <button className="adm-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="adm-body">
          {isLoading && (
            <div className="adm-loading"><Loader2 className="adm-spin" size={24} /> Loading details…</div>
          )}
          {isError && (
            <div className="adm-error"><AlertTriangle size={20} /> Failed to load details.</div>
          )}

          {data && (
            <>
              {/* Scheduling */}
              <section className="adm-section">
                <h3 className="adm-section-title"><Clock size={14} /> Schedule</h3>
                <Row label="Scheduled" value={data.scheduled_start_time
                  ? new Date(data.scheduled_start_time).toLocaleString('en-GB')
                  : null} />
                <Row label="Expected duration" value={data.expected_duration
                  ? `${data.expected_duration} min`
                  : null} />
                <Row label="Notes" value={data.notes} />
              </section>

              {/* Truck */}
              <section className="adm-section">
                <h3 className="adm-section-title"><Truck size={14} /> Truck</h3>
                <Row label="Plate" value={data.truck?.license_plate} />
                <Row label="Company" value={data.truck?.company?.name} />
                <Row label="Brand" value={data.truck?.brand} />
              </section>

              {/* Driver */}
              {data.driver && (
                <section className="adm-section">
                  <h3 className="adm-section-title"><User size={14} /> Driver</h3>
                  <Row label="Name" value={data.driver.name} />
                  <Row label="License" value={data.driver.drivers_license} />
                </section>
              )}

              {/* Booking / Cargo */}
              {data.booking && (
                <section className="adm-section">
                  <h3 className="adm-section-title"><Package size={14} /> Booking</h3>
                  <Row label="Reference" value={data.booking.reference} />
                  <Row label="Direction" value={data.booking.direction ?? undefined} />
                  {data.booking.cargos?.map((c, i) => (
                    <div key={i} className="adm-cargo">
                      <span>{c.description ?? c.booking_reference}</span>
                      <span className="adm-cargo-meta">{c.state} · qty {c.quantity}</span>
                    </div>
                  ))}
                </section>
              )}

              {/* Gates / Terminal */}
              <section className="adm-section">
                <h3 className="adm-section-title"><MapPin size={14} /> Location</h3>
                <Row label="Terminal" value={data.terminal?.name} />
                <Row label="Gate In" value={data.gate_in?.label} />
                <Row label="Gate Out" value={data.gate_out?.label} />
              </section>

              {/* In-Transit specifics — shown when truck is en route but hasn't entered the port */}
              {data.status === 'in_transit' && !data.visit && (
                <section className="adm-section">
                  <h3 className="adm-section-title"><Navigation size={14} /> En Route</h3>
                  <div className="adm-transit-banner">
                    <span className="adm-transit-dot" />
                    Truck is currently in transit to the port.
                  </div>
                  <Row
                    label="Expected at gate"
                    value={data.gate_in?.label ? `Gate ${data.gate_in.label}` : undefined}
                  />
                  {data.highway_infraction && (
                    <div className="adm-transit-alert">
                      <ShieldAlert size={14} />
                      Highway infraction recorded during this transit.
                    </div>
                  )}
                </section>
              )}

              {/* Visit / Port state */}
              {data.visit && (
                <section className="adm-section">
                  <h3 className="adm-section-title"><Container size={14} /> Inside Port</h3>
                  <VisitTimeline state={data.visit.state} />
                  <div className="adm-visit-times">
                    <Row label="Entered" value={data.visit.entry_time
                      ? new Date(data.visit.entry_time).toLocaleString('en-GB')
                      : null} />
                    <Row label="Exited" value={data.visit.out_time
                      ? new Date(data.visit.out_time).toLocaleString('en-GB')
                      : null} />
                    <Row label="Shift" value={data.visit.shift_type ?? undefined} />
                  </div>
                </section>
              )}

              {/* Carrier info */}
              {data.truck?.company && (
                <section className="adm-section">
                  <h3 className="adm-section-title"><Building2 size={14} /> Carrier</h3>
                  <Row label="Name" value={data.truck.company.name} />
                  <Row label="NIF" value={data.truck.company.nif} />
                  <Row label="Contact" value={data.truck.company.contact} />
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
