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
    doc.text('Relatório de Operações Logísticas', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Período: ${getTimeRangeLabel(data.timeRange)}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Gerado em: ${data.generatedAt.toLocaleString('pt-PT')}`, pageWidth / 2, 34, { align: 'center' });

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Resumo', 14, 48);

    const summaryData = [
        ['Camiões no Porto', data.summary.trucksInPort.toString()],
        ['Em Trânsito', data.summary.trucksInTransit.toString()],
        ['Em Descarga', data.summary.unloadingCount.toString()],
        ['Agendados', data.summary.scheduledCount.toString()],
        ['Entradas', data.summary.entriesCount.toString()],
        ['Saídas', data.summary.exitsCount.toString()],
        ['Concluídos', data.summary.completedCount.toString()],
        ['Tempo Médio Permanência', `${data.summary.avgPermanenceMinutes} min`],
        ['Tempo Médio Espera', `${data.summary.avgWaitingMinutes} min`],
        ['Taxa de Atraso', `${data.summary.delayRate.toFixed(1)}%`],
        ['SLA Cumprido', `${data.summary.slaCompliance.toFixed(1)}%`],
        ['Infrações', data.summary.infractionCount.toString()],
        ['Hora de Pico', data.summary.peakHour ? `${data.summary.peakHour.hour}h (${data.summary.peakHour.count} entradas)` : 'N/A'],
        ['Taxa de Congestionamento', `${data.summary.congestionRate}%`],
        ['Capacidade do Porto', data.summary.portCapacity.toString()],
        ['Veículos / Hora', data.summary.vehiclesPerHour.toString()],
    ];

    autoTable(doc, {
        startY: 52,
        head: [['Métrica', 'Valor']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 14, right: 14 },
    });

    // Decision Analytics Section
    let finalY = (doc as any).lastAutoTable.finalY || 100;
    if (data.decisions && data.decisions.totalDecisions > 0) {
        doc.setFontSize(14);
        doc.text('Análise de Decisões (IA)', 14, finalY + 15);

        const decisionData = [
            ['Total de Decisões', data.decisions.totalDecisions.toString()],
            ['Aceites', data.decisions.accepted.toString()],
            ['Rejeitados', data.decisions.rejected.toString()],
            ['Revisão Manual', data.decisions.manualReview.toString()],
            ['Taxa de Aceitação', `${data.decisions.acceptanceRate.toFixed(1)}%`],
            ['Tempo Médio Pipeline', `${data.decisions.avgPipelineMs} ms`],
        ];

        autoTable(doc, {
            startY: finalY + 20,
            head: [['Métrica', 'Valor']],
            body: decisionData,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] },
            margin: { left: 14, right: 14 },
        });
        finalY = (doc as any).lastAutoTable.finalY || finalY + 60;
    }

    // Transport Stats Section
    doc.setFontSize(14);
    doc.text('Detalhe por Transportadora', 14, finalY + 15);

    const transportData = data.transportStats.map(stat => [
        stat.companyName,
        `${stat.avgUnloadingTime} min`,
        `${stat.avgWaitingTime} min`,
        stat.operationsCount.toString(),
        `${stat.slaAttendedRate}%`,
    ]);

    autoTable(doc, {
        startY: finalY + 20,
        head: [['Transportadora', 'T. Descarga', 'T. Espera', 'Operações', 'SLA']],
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
            `Intelligent Logistics - Página ${i} de ${pageCount}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
        );
    }

    // Save
    doc.save(`relatorio-logistica-${formatDateForFilename(data.generatedAt)}.pdf`);
}

/**
 * Export dashboard data to CSV
 */
export function exportToCSV(data: ExportData): void {
    const rows: string[][] = [];

    // Header row
    rows.push(['Relatório de Operações Logísticas']);
    rows.push([`Período: ${getTimeRangeLabel(data.timeRange)}`]);
    rows.push([`Gerado em: ${data.generatedAt.toLocaleString('pt-PT')}`]);
    rows.push([]);

    // Summary section
    rows.push(['RESUMO']);
    rows.push(['Métrica', 'Valor']);
    rows.push(['Camiões no Porto', data.summary.trucksInPort.toString()]);
    rows.push(['Em Trânsito', data.summary.trucksInTransit.toString()]);
    rows.push(['Em Descarga', data.summary.unloadingCount.toString()]);
    rows.push(['Agendados', data.summary.scheduledCount.toString()]);
    rows.push(['Entradas', data.summary.entriesCount.toString()]);
    rows.push(['Saídas', data.summary.exitsCount.toString()]);
    rows.push(['Concluídos', data.summary.completedCount.toString()]);
    rows.push(['Tempo Médio Permanência (min)', data.summary.avgPermanenceMinutes.toString()]);
    rows.push(['Tempo Médio Espera (min)', data.summary.avgWaitingMinutes.toString()]);
    rows.push(['Taxa de Atraso (%)', data.summary.delayRate.toFixed(1)]);
    rows.push(['SLA Cumprido (%)', data.summary.slaCompliance.toFixed(1)]);
    rows.push(['Infrações', data.summary.infractionCount.toString()]);
    rows.push(['Hora de Pico', data.summary.peakHour ? `${data.summary.peakHour.hour}h (${data.summary.peakHour.count})` : 'N/A']);
    rows.push(['Taxa de Congestionamento (%)', data.summary.congestionRate.toString()]);
    rows.push(['Capacidade do Porto', data.summary.portCapacity.toString()]);
    rows.push(['Veículos / Hora', data.summary.vehiclesPerHour.toString()]);
    rows.push([]);

    // Decision analytics section
    if (data.decisions && data.decisions.totalDecisions > 0) {
        rows.push(['ANÁLISE DE DECISÕES (IA)']);
        rows.push(['Métrica', 'Valor']);
        rows.push(['Total de Decisões', data.decisions.totalDecisions.toString()]);
        rows.push(['Aceites', data.decisions.accepted.toString()]);
        rows.push(['Rejeitados', data.decisions.rejected.toString()]);
        rows.push(['Revisão Manual', data.decisions.manualReview.toString()]);
        rows.push(['Taxa de Aceitação (%)', data.decisions.acceptanceRate.toFixed(1)]);
        rows.push(['Tempo Médio Pipeline (ms)', data.decisions.avgPipelineMs.toString()]);
        rows.push([]);
    }

    // Transport stats section
    rows.push(['DETALHE POR TRANSPORTADORA']);
    rows.push(['Transportadora', 'T. Descarga (min)', 'T. Espera (min)', 'Operações', 'SLA (%)']);
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
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-logistica-${formatDateForFilename(data.generatedAt)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

function getTimeRangeLabel(range: string): string {
    switch (range) {
        case 'today': return 'Hoje';
        case 'week': return 'Última Semana';
        case 'month': return 'Último Mês';
        case 'year': return 'Último Ano';
        default: return range;
    }
}

function formatDateForFilename(date: Date): string {
    return date.toISOString().split('T')[0];
}
