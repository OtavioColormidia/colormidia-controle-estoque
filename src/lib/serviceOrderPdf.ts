import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoColorMidia from '@/assets/logo-colormidia-pdf.jpg';
import logoMezuk from '@/assets/logo-mezuk-pdf.jpg';
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
  if (cmCache) doc.addImage(cmCache, 'JPEG', margin, 10, 28, 18);
  if (mzCache) doc.addImage(mzCache, 'JPEG', pageW - margin - 28, 10, 28, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20, 30, 50);
  doc.text('Checklist Ferramentas e EPI', pageW / 2, 22, { align: 'center' });
  doc.setDrawColor(220);
  doc.line(margin, 32, pageW - margin, 32);

  // ===== Date =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(formatDate(order.date), margin, 40);

  // ===== Header info table =====
  autoTable(doc, {
    startY: 44,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3, textColor: 30 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
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
      body.push([
        { content: left.name, styles: { fontStyle: 'bold' } },
        { content: lc.sim, styles: { halign: 'center' } },
        { content: lc.nao, styles: { halign: 'center' } },
        { content: lc.na, styles: { halign: 'center' } },
        { content: right ? right.name : '', styles: { fontStyle: 'bold' } },
        { content: rc.sim, styles: { halign: 'center' } },
        { content: rc.nao, styles: { halign: 'center' } },
        { content: rc.na, styles: { halign: 'center' } },
      ]);
    }
    return body;
  };

  const checklistColStyles: any = {
    0: { cellWidth: 44 },
    1: { cellWidth: 10, halign: 'center' },
    2: { cellWidth: 10, halign: 'center' },
    3: { cellWidth: 10, halign: 'center' },
    4: { cellWidth: 44 },
    5: { cellWidth: 10, halign: 'center' },
    6: { cellWidth: 10, halign: 'center' },
    7: { cellWidth: 10, halign: 'center' },
  };

  // ===== Ferramentas section =====
  const afterHeaderY = (doc as any).lastAutoTable.finalY + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text('Ferramentas', margin, afterHeaderY);

  autoTable(doc, {
    startY: afterHeaderY + 2,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5, textColor: 30 },
    head: [[
      'Item', 'Sim', 'Não', 'N/A', 'Item', 'Sim', 'Não', 'N/A',
    ]],
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', halign: 'center' },
    body: buildChecklistBody(order.tools),
    margin: { left: margin, right: margin },
    columnStyles: checklistColStyles,
  });

  // ===== EPI section =====
  const afterToolsY = (doc as any).lastAutoTable.finalY + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text("EPI's", margin, afterToolsY);

  autoTable(doc, {
    startY: afterToolsY + 2,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5, textColor: 30 },
    head: [[
      'Item', 'Sim', 'Não', 'N/A', 'Item', 'Sim', 'Não', 'N/A',
    ]],
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', halign: 'center' },
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
