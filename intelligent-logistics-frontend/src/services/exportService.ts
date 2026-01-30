/**
 * Export Service
 * PDF and CSV report generation for manager dashboard
 */
import type { DashboardSummary, TransportStats } from './statistics';

interface ExportData {
    summary: DashboardSummary;
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
        ['Total de Camiões', data.summary.totalTrucks.toString()],
        ['Entradas', data.summary.entriesCount.toString()],
        ['Saídas', data.summary.exitsCount.toString()],
        ['Tempo Médio Permanência', `${data.summary.avgPermanenceMinutes} min`],
        ['Taxa de Atraso', `${data.summary.delayRate.toFixed(1)}%`],
        ['SLA Cumprido', `${data.summary.slaCompliance.toFixed(1)}%`],
    ];

    autoTable(doc, {
        startY: 52,
        head: [['Métrica', 'Valor']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 14, right: 14 },
    });

    // Transport Stats Section
    const finalY = (doc as any).lastAutoTable.finalY || 100;
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
    rows.push(['Total de Camiões', data.summary.totalTrucks.toString()]);
    rows.push(['Entradas', data.summary.entriesCount.toString()]);
    rows.push(['Saídas', data.summary.exitsCount.toString()]);
    rows.push(['Tempo Médio Permanência (min)', data.summary.avgPermanenceMinutes.toString()]);
    rows.push(['Taxa de Atraso (%)', data.summary.delayRate.toFixed(1)]);
    rows.push(['SLA Cumprido (%)', data.summary.slaCompliance.toFixed(1)]);
    rows.push([]);

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
