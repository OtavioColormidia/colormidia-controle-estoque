import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Logo will be loaded dynamically
let logoDataUrl: string | null = null;

const loadLogo = async (): Promise<string | null> => {
  if (logoDataUrl) return logoDataUrl;
  try {
    const logoModule = await import('@/assets/logo-colormedia.jpg');
    const response = await fetch(logoModule.default);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        logoDataUrl = reader.result as string;
        resolve(logoDataUrl);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

interface PDFOptions {
  title: string;
  subtitle?: string;
  orientation?: 'portrait' | 'landscape';
  headers: string[];
  data: string[][];
  columnStyles?: Record<number, { cellWidth?: number; halign?: string }>;
  totals?: { label: string; value: string }[];
}

export const exportProfessionalPDF = async (options: PDFOptions) => {
  const {
    title,
    subtitle,
    orientation = 'landscape',
    headers,
    data,
    columnStyles,
    totals,
  } = options;

  const doc = new jsPDF({ orientation });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Colors
  const primaryColor: [number, number, number] = [37, 99, 235]; // Blue
  const darkColor: [number, number, number] = [30, 41, 59];
  const grayColor: [number, number, number] = [100, 116, 139];

  // === HEADER ===
  // Header background bar
  doc.setFillColor(...darkColor);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent line under header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 28, pageWidth, 1.5, 'F');

  // Logo
  const logo = await loadLogo();
  if (logo) {
    doc.addImage(logo, 'JPEG', 10, 4, 20, 20);
  }

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ColorMídia', logo ? 34 : 10, 14);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Controle de Estoque', logo ? 34 : 10, 20);

  // Date on the right
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text(`${dateStr} - ${timeStr}`, pageWidth - 10, 14, { align: 'right' });

  // === TITLE ===
  doc.setTextColor(...darkColor);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 40);

  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayColor);
    doc.text(subtitle, 14, 47);
  }

  // Record count
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text(`Total de registros: ${data.length}`, pageWidth - 14, 40, { align: 'right' });

  // === TABLE ===
  const startY = subtitle ? 52 : 46;

  autoTable(doc, {
    startY,
    head: [headers],
    body: data,
    styles: {
      fontSize: 7.5,
      cellPadding: 3,
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    bodyStyles: {
      textColor: darkColor,
    },
    columnStyles: columnStyles as any,
    margin: { left: 14, right: 14 },
    didParseCell: (hookData) => {
      // Style status cells
      const cellText = hookData.cell.text.join('');
      if (cellText === 'Reposição' || cellText === 'Crítico') {
        hookData.cell.styles.textColor = [220, 38, 38];
        hookData.cell.styles.fontStyle = 'bold';
      } else if (cellText === 'Baixo' || cellText === 'Atenção') {
        hookData.cell.styles.textColor = [234, 179, 8];
        hookData.cell.styles.fontStyle = 'bold';
      } else if (cellText === 'Confortável' || cellText === 'Normal') {
        hookData.cell.styles.textColor = [22, 163, 74];
      }
    },
  });

  // === TOTALS ===
  if (totals && totals.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY || startY + 20;
    let currentY = finalY + 8;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, currentY - 4, pageWidth - 28, totals.length * 10 + 8, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, currentY - 4, pageWidth - 28, totals.length * 10 + 8, 2, 2, 'S');

    totals.forEach((total) => {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkColor);
      doc.text(total.label, 20, currentY + 3);
      doc.setTextColor(...primaryColor);
      doc.text(total.value, pageWidth - 20, currentY + 3, { align: 'right' });
      currentY += 10;
    });
  }

  // === FOOTER on every page ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
    
    // Footer text
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayColor);
    doc.text('ColorMídia - Sistema de Controle de Estoque', 14, pageHeight - 8);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
    doc.text(`Gerado em ${dateStr} às ${timeStr}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  // Save
  const fileName = `${title.toLowerCase().replace(/\s+/g, '_')}_${now.toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
