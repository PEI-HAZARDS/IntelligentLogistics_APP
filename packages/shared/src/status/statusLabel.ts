import type { Appointment, AppointmentStatusEnum, DeliveryStatusEnum } from '../types/types';

// Primary appointment status → human-readable label
const _PRIMARY_LABELS: Record<string, string> = {
  scheduled:  'Scheduled',
  in_transit: 'In Transit',
  in_process: 'In Process',
  completed:  'Completed',
  canceled:   'Canceled',
  // computed display-only sub-states (never persisted)
  unloading:  'Unloading',
  delayed:    'Delayed',
  in_port:    'In Port',
};

// Visit state → human-readable label
const _VISIT_LABELS: Record<DeliveryStatusEnum, string> = {
  in_port:   'In Port',
  unloading: 'Unloading',
  done:      'Done',
};

/** Simple string → label (for call sites that only have a status string). */
export function labelForStatus(status: AppointmentStatusEnum | string): string {
  return _PRIMARY_LABELS[status] ?? status;
}

/**
 * Returns the display label for an appointment, preferring `display_status`
 * (computed by backend) over the raw `status` field.
 */
export function getPrimaryLabel(appt: Pick<Appointment, 'status' | 'display_status'>): string {
  const s = appt.display_status ?? appt.status;
  return _PRIMARY_LABELS[s] ?? s;
}

/**
 * Returns active sub-state badges for the appointment.
 * Suppresses sub-badges when the appointment is in a terminal state.
 */
export function getSubBadges(
  appt: Pick<Appointment, 'status' | 'display_status' | 'is_delayed' | 'is_unloading'>,
): Array<'delayed' | 'unloading'> {
  const primary = appt.display_status ?? appt.status;
  if (primary === 'completed' || primary === 'canceled') return [];

  const badges: Array<'delayed' | 'unloading'> = [];
  if (appt.is_delayed || primary === 'delayed') badges.push('delayed');
  if (appt.is_unloading || primary === 'unloading') badges.push('unloading');
  return badges;
}

/** Returns the CSS class suffix for a status (use as `status-${statusClass(s)}`). */
export function statusClass(status: AppointmentStatusEnum | string): string {
  return status.toLowerCase().replace(/_/g, '-');
}

/** Returns the display label for a Visit state. */
export function getVisitLabel(state: DeliveryStatusEnum): string {
  return _VISIT_LABELS[state] ?? state;
}
