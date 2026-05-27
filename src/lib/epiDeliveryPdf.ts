import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoColorMidia from '@/assets/logo-colormidia-pdf.jpg';
import type { EpiDelivery } from '@/hooks/useEpiControl';

let logoCache: string | null = null;

const toDataUrl = async (url: string): Promise<string> => {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.readAsDataURL(blob);
  });
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const exportEpiDeliveryPDF = async (delivery: EpiDelivery) => {
  if (!logoCache) logoCache = await toDataUrl(logoColorMidia);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header
  if (logoCache) doc.addImage(logoCache, 'JPEG', margin, 10, 32, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 30, 50);
  doc.text('Ficha de Controle de Entrega de EPI', pageW / 2, 18, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text('Conforme NR-06 — Equipamentos de Proteção Individual', pageW / 2, 24, { align: 'center' });

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.6);
  doc.line(margin, 32, pageW - margin, 32);

  // Funcionário info
  autoTable(doc, {
    startY: 38,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3, textColor: 30, lineColor: [200, 210, 225], lineWidth: 0.2 },
    body: [
      [
        { content: 'Funcionário', styles: { fontStyle: 'bold', fillColor: [240, 244, 250] } },
        { content: delivery.employee_name || '-' },
        { content: 'Cargo', styles: { fontStyle: 'bold', fillColor: [240, 244, 250] } },
        { content: delivery.employee_role || '-' },
      ],
      [
        { content: 'Data da entrega', styles: { fontStyle: 'bold', fillColor: [240, 244, 250] } },
        { content: formatDate(delivery.delivery_date) },
        { content: 'Status', styles: { fontStyle: 'bold', fillColor: [240, 244, 250] } },
        { content: delivery.status === 'delivered' ? 'Entregue' : delivery.status },
      ],
    ],
    margin: { left: margin, right: margin },
    columnStyles: { 0: { cellWidth: 36 }, 1: { cellWidth: 60 }, 2: { cellWidth: 24 }, 3: { cellWidth: 'auto' } },
  });

  // Itens
  const items = delivery.items ?? [];
  const totalQty = items.reduce((s, it) => s + Number(it.quantity || 0), 0);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 6,
    theme: 'grid',
    head: [['EPI', 'CA', 'Tamanho', 'Qtd.']],
    body: items.map((it) => [it.epi_name, it.ca_number || '-', it.size || '-', String(it.quantity)]),
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', halign: 'left' },
    styles: { fontSize: 10, cellPadding: 3, textColor: 30, lineColor: [200, 210, 225], lineWidth: 0.2 },
    alternateRowStyles: { fillColor: [248, 250, 253] },
    foot: [[
      { content: 'Total de itens', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 244, 250], textColor: 30 } },
      { content: String(totalQty), styles: { halign: 'left', fontStyle: 'bold', fillColor: [240, 244, 250], textColor: 30 } },
    ]],
    columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 36 }, 2: { cellWidth: 26 }, 3: { cellWidth: 20, halign: 'center' } },
    margin: { left: margin, right: margin },
  });

  // Observações
  if (delivery.notes) {
    const y = (doc as any).lastAutoTable.finalY + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text('Observações:', margin, y);
    doc.setFont('helvetica', 'normal');
    const split = doc.splitTextToSize(delivery.notes, pageW - margin * 2);
    doc.text(split, margin, y + 5);
  }

  // Termo de responsabilidade
  const pageH = doc.internal.pageSize.getHeight();
  const termY = pageH - 70;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30);
  doc.text('Termo de Responsabilidade', margin, termY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60);
  const termo =
    'Declaro ter recebido os Equipamentos de Proteção Individual (EPIs) descritos nesta ficha, em perfeitas condições de uso, ' +
    'e me comprometo a utilizá-los obrigatoriamente durante a execução de minhas atividades, a zelar pela sua guarda e conservação, ' +
    'a comunicar qualquer alteração que os torne impróprios para uso e a devolvê-los à empresa quando solicitado ou no desligamento, ' +
    'conforme determina a NR-06.';
  doc.text(doc.splitTextToSize(termo, pageW - margin * 2), margin, termY + 5);

  // Assinaturas
  const sigY = pageH - 25;
  doc.setDrawColor(120);
  doc.line(margin, sigY, margin + 75, sigY);
  doc.line(pageW - margin - 75, sigY, pageW - margin, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.text('Assinatura do Colaborador', margin + 37, sigY + 5, { align: 'center' });
  doc.text('Assinatura do Responsável', pageW - margin - 37, sigY + 5, { align: 'center' });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    `Gerado em ${new Date().toLocaleString('pt-BR')} • ColorMídia`,
    pageW / 2,
    pageH - 8,
    { align: 'center' },
  );

  doc.save(`EPI_${delivery.employee_name.replace(/\s+/g, '_')}_${formatDate(delivery.delivery_date).replace(/\//g, '-')}.pdf`);
};
