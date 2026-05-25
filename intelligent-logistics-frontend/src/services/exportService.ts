/**
 * Export Service
 * PDF and CSV report generation for manager dashboard
 */
import type { DashboardSummary, TransportStats, DecisionAnalytics } from './statistics';

interface ExportData {
    summary: DashboardSummary;
    decisions: DecisionAnalytics | null;
    transportStats: TransportStats[];
    timeRange: string;
    generatedAt: Date;
}

/**
 * Export dashboard data to PDF
 * Uses jsPDF library (dynamically imported to reduce bundle size)
 */
export async function exportToPDF(data: ExportData): Promise<void> {
    // Dynamic import of jsPDF
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text('Logistics Operations Report', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Period: ${getTimeRangeLabel(data.timeRange)}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Generated at: ${data.generatedAt.toLocaleString('en-GB')}`, pageWidth / 2, 34, { align: 'center' });

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Summary', 14, 48);

    const summaryData = [
        ['Trucks in Port', data.summary.trucksInPort.toString()],
        ['In Transit', data.summary.trucksInTransit.toString()],
        ['Unloading', data.summary.unloadingCount.toString()],
        ['Scheduled', data.summary.scheduledCount.toString()],
        ['Entries', data.summary.entriesCount.toString()],
        ['Exits', data.summary.exitsCount.toString()],
        ['Completed', data.summary.completedCount.toString()],
        ['Avg. Stay Time', `${data.summary.avgPermanenceMinutes} min`],
        ['Avg. Wait Time', `${data.summary.avgWaitingMinutes} min`],
        ['Delay Rate', `${data.summary.delayRate.toFixed(1)}%`],
        ['SLA Compliance', `${data.summary.slaCompliance.toFixed(1)}%`],
        ['Infractions', data.summary.infractionCount.toString()],
        ['Peak Hour', data.summary.peakHour ? `${data.summary.peakHour.hour}h (${data.summary.peakHour.count} entries)` : 'N/A'],
        ['Congestion Rate', `${data.summary.congestionRate}%`],
        ['Port Capacity', data.summary.portCapacity.toString()],
        ['Vehicles / Hour', data.summary.vehiclesPerHour.toString()],
    ];

    autoTable(doc, {
        startY: 52,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 14, right: 14 },
    });

    // Decision Analytics Section
    let finalY = (doc as any).lastAutoTable.finalY || 100;
    if (data.decisions && data.decisions.totalDecisions > 0) {
        doc.setFontSize(14);
        doc.text('Decision Analysis (AI)', 14, finalY + 15);

        const decisionData = [
            ['Total Decisions', data.decisions.totalDecisions.toString()],
            ['Accepted', data.decisions.accepted.toString()],
            ['Rejected', data.decisions.rejected.toString()],
            ['Manual Review', data.decisions.manualReview.toString()],
            ['Acceptance Rate', `${data.decisions.acceptanceRate.toFixed(1)}%`],
            ['Avg. Pipeline Time', `${data.decisions.avgPipelineMs} ms`],
        ];

        autoTable(doc, {
            startY: finalY + 20,
            head: [['Metric', 'Value']],
            body: decisionData,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] },
            margin: { left: 14, right: 14 },
        });
        finalY = (doc as any).lastAutoTable.finalY || finalY + 60;
    }

    // Transport Stats Section
    doc.setFontSize(14);
    doc.text('Breakdown by Carrier', 14, finalY + 15);

    const transportData = data.transportStats.map(stat => [
        stat.companyName,
        `${stat.avgUnloadingTime} min`,
        `${stat.avgWaitingTime} min`,
        stat.operationsCount.toString(),
        `${stat.slaAttendedRate}%`,
    ]);

    autoTable(doc, {
        startY: finalY + 20,
        head: [['Carrier', 'Unload Time', 'Wait Time', 'Operations', 'SLA']],
        body: transportData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 14, right: 14 },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Intelligent Logistics - Page ${i} of ${pageCount}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
        );
    }

    // Save
    doc.save(`logistics-report-${formatDateForFilename(data.generatedAt)}.pdf`);
}

/**
 * Export dashboard data to CSV
 */
export function exportToCSV(data: ExportData): void {
    const rows: string[][] = [];

    // Header row
    rows.push(['Logistics Operations Report']);
    rows.push([`Period: ${getTimeRangeLabel(data.timeRange)}`]);
    rows.push([`Generated at: ${data.generatedAt.toLocaleString('en-GB')}`]);
    rows.push([]);

    // Summary section
    rows.push(['SUMMARY']);
    rows.push(['Metric', 'Value']);
    rows.push(['Trucks in Port', data.summary.trucksInPort.toString()]);
    rows.push(['In Transit', data.summary.trucksInTransit.toString()]);
    rows.push(['Unloading', data.summary.unloadingCount.toString()]);
    rows.push(['Scheduled', data.summary.scheduledCount.toString()]);
    rows.push(['Entries', data.summary.entriesCount.toString()]);
    rows.push(['Exits', data.summary.exitsCount.toString()]);
    rows.push(['Completed', data.summary.completedCount.toString()]);
    rows.push(['Avg. Stay Time (min)', data.summary.avgPermanenceMinutes.toString()]);
    rows.push(['Avg. Wait Time (min)', data.summary.avgWaitingMinutes.toString()]);
    rows.push(['Delay Rate (%)', data.summary.delayRate.toFixed(1)]);
    rows.push(['SLA Compliance (%)', data.summary.slaCompliance.toFixed(1)]);
    rows.push(['Infractions', data.summary.infractionCount.toString()]);
    rows.push(['Peak Hour', data.summary.peakHour ? `${data.summary.peakHour.hour}h (${data.summary.peakHour.count})` : 'N/A']);
    rows.push(['Congestion Rate (%)', data.summary.congestionRate.toString()]);
    rows.push(['Port Capacity', data.summary.portCapacity.toString()]);
    rows.push(['Vehicles / Hour', data.summary.vehiclesPerHour.toString()]);
    rows.push([]);

    // Decision analytics section
    if (data.decisions && data.decisions.totalDecisions > 0) {
        rows.push(['DECISION ANALYSIS (AI)']);
        rows.push(['Metric', 'Value']);
        rows.push(['Total Decisions', data.decisions.totalDecisions.toString()]);
        rows.push(['Accepted', data.decisions.accepted.toString()]);
        rows.push(['Rejected', data.decisions.rejected.toString()]);
        rows.push(['Manual Review', data.decisions.manualReview.toString()]);
        rows.push(['Acceptance Rate (%)', data.decisions.acceptanceRate.toFixed(1)]);
        rows.push(['Avg. Pipeline Time (ms)', data.decisions.avgPipelineMs.toString()]);
        rows.push([]);
    }

    // Transport stats section
    rows.push(['BREAKDOWN BY CARRIER']);
    rows.push(['Carrier', 'Unload Time (min)', 'Wait Time (min)', 'Operations', 'SLA (%)']);
    data.transportStats.forEach(stat => {
        rows.push([
            stat.companyName,
            stat.avgUnloadingTime.toString(),
            stat.avgWaitingTime.toString(),
            stat.operationsCount.toString(),
            stat.slaAttendedRate.toString(),
        ]);
    });

    // Convert to CSV string
    const csvContent = rows
        .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
        .join('\n');

    // Create and download file
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `logistics-report-${formatDateForFilename(data.generatedAt)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

function getTimeRangeLabel(range: string): string {
    switch (range) {
        case 'today': return 'Today';
        case 'week': return 'Last Week';
        case 'month': return 'Last Month';
        case 'year': return 'Last Year';
        default: return range;
    }
}

function formatDateForFilename(date: Date): string {
    return date.toISOString().split('T')[0];
}
