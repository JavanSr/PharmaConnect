import jsPDF from 'jspdf';

export interface ReceiptLine {
  productName: string;
  genericName?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  batchNumber?: string;
  vfdReceiptNumber?: string | null;
}

export interface ReceiptData {
  pharmacyName: string;
  pharmacyAddress?: string;
  productName?: string;
  genericName?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount: number;
  paymentMethod: string;
  paymentRef?: string;
  vfdReceiptNumber?: string | null;
  dispensedAt: string;
  dispensedBy: string;
  batchNumber?: string;
  items?: ReceiptLine[];
}

export function generateReceiptPdf(data: ReceiptData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a6', orientation: 'portrait' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const center = pageWidth / 2;
  const items =
    data.items?.length
      ? data.items
      : [
          {
            productName: data.productName ?? 'Medicines',
            genericName: data.genericName,
            quantity: data.quantity ?? 0,
            unitPrice: data.unitPrice ?? 0,
            totalAmount: data.totalAmount,
            batchNumber: data.batchNumber,
            vfdReceiptNumber: data.vfdReceiptNumber,
          },
        ];

  doc.setFillColor(26, 107, 92);
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(data.pharmacyName, center, 10, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  if (data.pharmacyAddress) {
    doc.text(data.pharmacyAddress, center, 16, { align: 'center' });
  }
  doc.text('OFFICIAL DISPENSING RECEIPT', center, 20, { align: 'center' });

  doc.setTextColor(50, 50, 50);
  let y = 30;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${data.dispensedAt}`, 8, y);
  if (data.vfdReceiptNumber) {
    doc.text(`VFD No: ${data.vfdReceiptNumber}`, pageWidth - 8, y, { align: 'right' });
  }
  y += 5;
  doc.text(`Served by: ${data.dispensedBy}`, 8, y);
  y += 3;

  doc.setDrawColor(209, 232, 223);
  doc.line(8, y, pageWidth - 8, y);
  y += 5;

  const drawItemHeader = () => {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 27, 22);
    doc.text('ITEM', 8, y);
    doc.text('QTY', center - 5, y, { align: 'right' });
    doc.text('UNIT', center + 10, y, { align: 'right' });
    doc.text('TOTAL', pageWidth - 8, y, { align: 'right' });
    y += 4;

    doc.setDrawColor(209, 232, 223);
    doc.line(8, y, pageWidth - 8, y);
    y += 4;
  };

  const ensureSpace = (neededHeight: number, repeatItemHeader = true) => {
    if (y + neededHeight <= pageHeight - 14) return;
    doc.addPage();
    y = 12;
    if (repeatItemHeader) {
      drawItemHeader();
    }
  };

  drawItemHeader();

  for (const item of items) {
    const itemName = item.genericName
      ? `${item.productName}\n(${item.genericName})`
      : item.productName;
    const splitName = doc.splitTextToSize(itemName, center - 20);
    const metaLines = [
      item.batchNumber ? `Batch: ${item.batchNumber}` : null,
      item.vfdReceiptNumber ? `VFD: ${item.vfdReceiptNumber}` : null,
    ].filter(Boolean);
    const rowHeight = splitName.length * 4 + (metaLines.length ? 4 : 0) + 4;

    ensureSpace(rowHeight);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text(splitName, 8, y);
    doc.text(`${item.quantity}`, center - 5, y, { align: 'right' });
    doc.text(`${item.unitPrice.toLocaleString()}`, center + 10, y, { align: 'right' });
    doc.text(`${item.totalAmount.toLocaleString()}`, pageWidth - 8, y, { align: 'right' });
    y += splitName.length * 4;

    if (metaLines.length) {
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(metaLines.join(' | '), 8, y);
      y += 4;
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(8, y, pageWidth - 8, y);
    y += 4;
  }

  ensureSpace(38, false);

  doc.setDrawColor(209, 232, 223);
  doc.line(8, y, pageWidth - 8, y);
  y += 5;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 27, 22);
  doc.text('TOTAL (TZS)', 8, y);
  doc.text(`${data.totalAmount.toLocaleString()}`, pageWidth - 8, y, { align: 'right' });
  y += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const paymentMethod = data.paymentMethod.replace(/_/g, ' ');
  const paymentLine = data.paymentRef
    ? `${paymentMethod} - Ref: ${data.paymentRef}`
    : paymentMethod;
  doc.text(`Payment: ${paymentLine}`, 8, y);
  y += 8;

  if (data.vfdReceiptNumber) {
    ensureSpace(22, false);
    doc.setFillColor(225, 245, 238);
    doc.roundedRect(8, y, pageWidth - 16, 10, 2, 2, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(26, 107, 92);
    doc.setFont('helvetica', 'bold');
    doc.text('TRA FISCAL RECEIPT', center, y + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(data.vfdReceiptNumber, center, y + 8, { align: 'center' });
    y += 14;
  }

  ensureSpace(16, false);

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    'Thank you for your visit. Keep medicines out of reach of children.',
    center,
    y + 4,
    { align: 'center' }
  );
  doc.text('Powered by PharmaConnect', center, y + 8, { align: 'center' });

  return doc;
}

export function downloadReceiptPdf(data: ReceiptData, filename?: string) {
  const doc = generateReceiptPdf(data);
  doc.save(filename ?? `receipt-${Date.now()}.pdf`);
}
