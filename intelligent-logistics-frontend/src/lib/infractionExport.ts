/**
 * Reviewed-infraction export helpers.
 *
 * Lets the logistics manager communicate reviewed highway infractions to the
 * carrier: a CSV download (one row per reviewed infraction) and a pre-filled
 * email draft (mailto). The CSV reuses the same Blob + UTF-8 BOM download idiom
 * as services/exportService.ts. mailto cannot attach files, so the email draft
 * carries a text summary and the manager attaches the CSV manually.
 */
import type { Appointment, AppointmentStatusEnum } from '@/types/types';
import { labelForStatus } from '@/lib/statusLabel';

export type ReviewedInfraction = Appointment & {
    reviewed_at?: string | null;
    reviewed_by?: string | null;
    review_note?: string | null;
    primary_status?: AppointmentStatusEnum;
};

function csvCell(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
}

function formatDateTime(iso?: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function companyName(item: ReviewedInfraction): string {
    return item.truck?.company?.name ?? '—';
}

function companyNif(item: ReviewedInfraction): string {
    return item.truck?.company?.nif ?? item.truck?.company_nif ?? '';
}

/** Keep only the infractions that have actually been reviewed. */
export function onlyReviewed(items: ReviewedInfraction[]): ReviewedInfraction[] {
    return items.filter(i => !!i.reviewed_at);
}

/**
 * Build and download a CSV of the reviewed infractions.
 * Returns the number of rows exported (0 → nothing downloaded).
 */
export function exportReviewedInfractionsCSV(items: ReviewedInfraction[]): number {
    const reviewed = onlyReviewed(items);
    if (reviewed.length === 0) return 0;

    const header = [
        'License Plate', 'Company', 'NIF', 'Arrival ID', 'Scheduled',
        'Gate', 'Status', 'Reviewed At', 'Reviewed By', 'Note',
    ];

    const rows = reviewed.map(item => [
        item.truck_license_plate ?? '',
        companyName(item),
        companyNif(item),
        item.arrival_id ?? '',
        formatDateTime(item.scheduled_start_time),
        item.gate_in?.label ?? '',
        labelForStatus(item.primary_status ?? item.status),
        formatDateTime(item.reviewed_at),
        item.reviewed_by ?? '',
        item.review_note ?? '',
    ]);

    const csvContent = [header, ...rows]
        .map(row => row.map(cell => csvCell(String(cell))).join(','))
        .join('\n');

    const stamp = new Date().toISOString().slice(0, 10);
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reviewed-infractions-${stamp}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    return reviewed.length;
}

/**
 * Open a pre-filled email draft (mailto) summarising the reviewed infractions.
 * Recipient is left blank for the manager to fill (or attach the CSV).
 * Returns the number of infractions summarised (0 → nothing opened).
 */
export function mailtoReviewedInfractions(items: ReviewedInfraction[]): number {
    const reviewed = onlyReviewed(items);
    if (reviewed.length === 0) return 0;

    const subject = `Porto de Aveiro — Highway infraction notice (${reviewed.length})`;

    // mailto URLs have practical length limits (~2000 chars in some clients),
    // so cap the inline summary and point to the CSV for the full list.
    const MAX_LINES = 25;
    const lines = reviewed.slice(0, MAX_LINES).map(item => {
        const parts = [
            item.truck_license_plate ?? '—',
            companyName(item),
            formatDateTime(item.scheduled_start_time),
        ];
        if (item.review_note) parts.push(`note: ${item.review_note}`);
        return `• ${parts.join(' · ')}`;
    });
    if (reviewed.length > MAX_LINES) {
        lines.push(`…and ${reviewed.length - MAX_LINES} more (see the attached CSV).`);
    }

    const body = [
        'Dear carrier,',
        '',
        'Please find below the highway infractions recorded for hazmat vehicles on restricted routes, reviewed by our logistics team:',
        '',
        ...lines,
        '',
        'A detailed CSV export is attached.',
        '',
        'Regards,',
        'Port of Aveiro — Intelligent Logistics',
    ].join('\n');

    const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;

    return reviewed.length;
}
