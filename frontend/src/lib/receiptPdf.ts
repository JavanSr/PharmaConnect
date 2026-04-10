import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

export interface ReceiptData {
  referenceNumber: string;
  pharmacyName: string;
  pharmacyAddress: string;
  pharmacyLicence: string;
  dispensedBy: string;
  patientName?: string;
  paymentMethod: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    dose?: string;
    counsellingNotes?: string;
  }>;
  totalAmount: number;
  createdAt: string;
}

export function downloadReceiptPdf(receipt: ReceiptData): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 15;

  const centerText = (text: string, yPos: number, size = 10) => {
    doc.setFontSize(size);
    doc.text(text, pageW / 2, yPos, { align: 'center' });
  };

  const line = () => {
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageW - margin, y);
    y += 4;
  };

  // Header
  doc.setFillColor(26, 107, 92);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  centerText(receipt.pharmacyName, 11, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  centerText(receipt.pharmacyAddress, 17, 8);
  centerText(`Licence: ${receipt.pharmacyLicence}`, 22, 8);
  y = 34;

  // Reference
  doc.setTextColor(13, 64, 53);
  doc.setFont('helvetica', 'bold');
  centerText('DISPENSING RECEIPT', y, 11);
  y += 6;
  doc.setFont('helvetica', 'normal');
  centerText(`Ref: ${receipt.referenceNumber}`, y, 9);
  y += 5;
  centerText(format(new Date(receipt.createdAt), 'dd MMM yyyy HH:mm'), y, 8);
  y += 6;
  line();

  // Patient & payment
  doc.setFontSize(9);
  if (receipt.patientName) {
    doc.text(`Patient: ${receipt.patientName}`, margin, y);
    y += 5;
  }
  doc.text(`Dispensed by: ${receipt.dispensedBy}`, margin, y);
  y += 5;
  doc.text(`Payment: ${receipt.paymentMethod.replace(/_/g, ' ')}`, margin, y);
  y += 6;
  line();

  // Items header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Item', margin, y);
  doc.text('Qty', pageW - margin - 30, y);
  doc.text('Unit', pageW - margin - 18, y);
  doc.text('Total', pageW - margin, y, { align: 'right' });
  y += 4;
  line();

  // Items
  doc.setFont('helvetica', 'normal');
  for (const item of receipt.items) {
    doc.setFontSize(9);
    const nameLines = doc.splitTextToSize(item.name, pageW - margin * 2 - 40);
    doc.text(nameLines, margin, y);
    doc.text(String(item.quantity), pageW - margin - 30, y);
    doc.text(item.unitPrice.toLocaleString(), pageW - margin - 18, y);
    doc.text(item.lineTotal.toLocaleString(), pageW - margin, y, { align: 'right' });
    y += nameLines.length * 5;

    if (item.dose) {
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`Dose: ${item.dose}`, margin + 2, y);
      y += 4;
      doc.setTextColor(13, 64, 53);
    }
    if (item.counsellingNotes) {
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      const notes = doc.splitTextToSize(`Note: ${item.counsellingNotes}`, pageW - margin * 2 - 4);
      doc.text(notes, margin + 2, y);
      y += notes.length * 4;
      doc.setTextColor(13, 64, 53);
    }
  }

  y += 2;
  line();

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL', margin, y);
  doc.text(`TZS ${receipt.totalAmount.toLocaleString()}`, pageW - margin, y, { align: 'right' });
  y += 10;

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  centerText('Thank you for choosing ' + receipt.pharmacyName, y, 7);
  y += 4;
  centerText('TMDA Registered · Tanzania UHI Mandate Compliant', y, 7);
  y += 4;
  centerText('Powered by PharmaConnect', y, 7);

  doc.save(`receipt-${receipt.referenceNumber}.pdf`);
}
