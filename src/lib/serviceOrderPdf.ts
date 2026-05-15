import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoColorMidia from '@/assets/logo-colormidia-pdf.jpg';
import logoMezuk from '@/assets/logo-mezuk-pdf.png';
import type { ChecklistItem, ServiceOrder } from '@/hooks/useServiceOrders';

let cmCache: string | null = null;
let mzCache: string | null = null;

const toDataUrl = async (url: string): Promise<string> => {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.readAsDataURL(blob);
  });
};

const loadLogos = async () => {
  if (!cmCache) cmCache = await toDataUrl(logoColorMidia);
  if (!mzCache) mzCache = await toDataUrl(logoMezuk);
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const statusToCells = (s: ChecklistItem['status']) => ({
  sim: s === 'sim' ? 'X' : '',
  nao: s === 'nao' ? 'X' : '',
  na: s === 'na' ? 'X' : '',
});

export const exportServiceOrderPDF = async (order: ServiceOrder) => {
  await loadLogos();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;

  // ===== Header with logos =====
  if (cmCache) doc.addImage(cmCache, 'JPEG', margin, 10, 32, 18);
  if (mzCache) doc.addImage(mzCache, 'PNG', pageW - margin - 32, 12, 32, 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(20, 30, 50);
  doc.text('Checklist Ferramentas e EPI', pageW / 2, 22, { align: 'center' });
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.6);
  doc.line(margin, 32, pageW - margin, 32);
  doc.setLineWidth(0.2);

  // ===== Date =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Data: ${formatDate(order.date)}`, margin, 39);

  // ===== Header info table =====
  autoTable(doc, {
    startY: 43,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3, textColor: 30, lineColor: [200, 210, 225], lineWidth: 0.2 },
    body: [
      [
        { content: 'Funcionário', styles: { fontStyle: 'bold', fillColor: [240, 244, 250] } },
        { content: order.employee_name || '-' },
        { content: 'Cliente', styles: { fontStyle: 'bold', fillColor: [240, 244, 250] } },
        { content: order.client_name || '-' },
      ],
      [
        { content: 'OS / Tipo de Serviço', styles: { fontStyle: 'bold', fillColor: [240, 244, 250] } },
        { content: order.service_type || '-' },
        { content: 'Auxiliar', styles: { fontStyle: 'bold', fillColor: [240, 244, 250] } },
        { content: order.auxiliar_name || '-' },
      ],
    ],
    margin: { left: margin, right: margin },
    columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 56 }, 2: { cellWidth: 28 }, 3: { cellWidth: 'auto' } },
  });

  const buildChecklistBody = (items: ChecklistItem[]) => {
    const body: any[][] = [];
    for (let i = 0; i < items.length; i += 2) {
      const left = items[i];
      const right = items[i + 1];
      const lc = statusToCells(left.status);
      const rc = right ? statusToCells(right.status) : { sim: '', nao: '', na: '' };
      const mark = (v: string, kind: 'sim' | 'nao' | 'na') => {
        if (!v) return { content: '', styles: { halign: 'center' } };
        const colors: Record<string, [number, number, number]> = {
          sim: [22, 163, 74],
          nao: [220, 38, 38],
          na: [120, 120, 120],
        };
        return {
          content: v,
          styles: { halign: 'center', textColor: colors[kind], fontStyle: 'bold' },
        };
      };
      body.push([
        { content: left.name, styles: { fontStyle: 'bold' } },
        mark(lc.sim, 'sim'),
        mark(lc.nao, 'nao'),
        mark(lc.na, 'na'),
        { content: right ? right.name : '', styles: { fontStyle: 'bold' } },
        mark(rc.sim, 'sim'),
        mark(rc.nao, 'nao'),
        mark(rc.na, 'na'),
      ]);
    }
    return body;
  };

  const checklistColStyles: any = {
    0: { cellWidth: 50 },
    1: { cellWidth: 14, halign: 'center' },
    2: { cellWidth: 14, halign: 'center' },
    3: { cellWidth: 14, halign: 'center' },
    4: { cellWidth: 50 },
    5: { cellWidth: 14, halign: 'center' },
    6: { cellWidth: 14, halign: 'center' },
    7: { cellWidth: 14, halign: 'center' },
  };

  const sectionTitle = (title: string, y: number) => {
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, y - 4.5, pageW - margin * 2, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 3, y);
    doc.setTextColor(30);
  };

  // ===== Ferramentas section =====
  const afterHeaderY = (doc as any).lastAutoTable.finalY + 8;
  sectionTitle('FERRAMENTAS', afterHeaderY);

  autoTable(doc, {
    startY: afterHeaderY + 3,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5, textColor: 30, lineColor: [200, 210, 225], lineWidth: 0.2, valign: 'middle' },
    head: [[
      'Item', 'Sim', 'Não', 'N/A', 'Item', 'Sim', 'Não', 'N/A',
    ]],
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', halign: 'center', valign: 'middle', minCellHeight: 8 },
    alternateRowStyles: { fillColor: [248, 250, 253] },
    body: buildChecklistBody(order.tools),
    margin: { left: margin, right: margin },
    columnStyles: checklistColStyles,
  });

  // ===== EPI section =====
  const afterToolsY = (doc as any).lastAutoTable.finalY + 8;
  sectionTitle("EPI'S", afterToolsY);

  autoTable(doc, {
    startY: afterToolsY + 3,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5, textColor: 30, lineColor: [200, 210, 225], lineWidth: 0.2, valign: 'middle' },
    head: [[
      'Item', 'Sim', 'Não', 'N/A', 'Item', 'Sim', 'Não', 'N/A',
    ]],
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', halign: 'center', valign: 'middle', minCellHeight: 8 },
    alternateRowStyles: { fillColor: [248, 250, 253] },
    body: buildChecklistBody(order.epis),
    margin: { left: margin, right: margin },
    columnStyles: checklistColStyles,
  });

  // ===== Notes =====
  if (order.notes) {
    const y = (doc as any).lastAutoTable.finalY + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text('Observações:', margin, y);
    doc.setFont('helvetica', 'normal');
    const split = doc.splitTextToSize(order.notes, pageW - margin * 2);
    doc.text(split, margin, y + 5);
  }

  // ===== Signatures =====
  const sigY = doc.internal.pageSize.getHeight() - 35;
  doc.setDrawColor(120);
  doc.line(margin, sigY, margin + 75, sigY);
  doc.line(pageW - margin - 75, sigY, pageW - margin, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.text('Assinatura Entrega', margin + 37, sigY + 5, { align: 'center' });
  doc.text('Assinatura Devolução', pageW - margin - 37, sigY + 5, { align: 'center' });

  // ===== Footer =====
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    `Gerado em ${new Date().toLocaleString('pt-BR')} • ColorMídia`,
    pageW / 2,
    doc.internal.pageSize.getHeight() - 8,
    { align: 'center' }
  );

  doc.save(`OS_${order.employee_name.replace(/\s+/g, '_')}_${formatDate(order.date).replace(/\//g, '-')}.pdf`);
};
