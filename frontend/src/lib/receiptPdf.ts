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
    strength?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    dose?: string;
  }>;
  totalAmount: number;
  createdAt: string;
  pharmacyFooterText?: string;
  showPcRegNo?: boolean;
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
  if (receipt.showPcRegNo !== false) {
    centerText(`PC Reg No: ${receipt.pharmacyLicence}`, 22, 8);
  }
  y = 34;

  // pc-600 is the base colour for the entire receipt body
  const teal: [number, number, number] = [26, 107, 92];   // pc-600 #1A6B5C
  const slate: [number, number, number] = [100, 116, 139]; // supporting detail

  // Reference
  doc.setTextColor(...teal);
  doc.setFont('helvetica', 'bold');
  centerText('DISPENSING RECEIPT', y, 11);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slate);
  centerText(`Ref: ${receipt.referenceNumber}`, y, 9);
  y += 5;
  centerText(format(new Date(receipt.createdAt), 'dd MMM yyyy HH:mm'), y, 8);
  y += 6;
  line();

  // Patient & payment
  doc.setTextColor(...teal);
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

  // Items
  for (const item of receipt.items) {
    const label = item.strength ? `${item.name}  ${item.strength}` : item.name;
    const nameLines = doc.splitTextToSize(label, pageW - margin * 2 - 28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...teal);
    doc.text(nameLines, margin, y);
    doc.text(`Tsh ${item.lineTotal.toLocaleString()}`, pageW - margin, y, { align: 'right' });
    y += nameLines.length * 5;

    // Qty × unit — supporting detail in slate
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...slate);
    doc.text(`Qty: ${item.quantity}  ×  Tsh ${item.unitPrice.toLocaleString()}`, margin + 2, y);
    if (item.dose) {
      doc.text(`  |  ${item.dose}`, margin + 2 + 42, y);
    }
    y += 5;
    y += 1;
  }

  y += 1;
  line();

  // Total — pc-600 bold, largest on page
  doc.setTextColor(...teal);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL', margin, y);
  doc.text(`Tsh ${receipt.totalAmount.toLocaleString()}`, pageW - margin, y, { align: 'right' });
  y += 10;

  // Footer — pharmacy's own message
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  if (receipt.pharmacyFooterText) {
    const footerLines = doc.splitTextToSize(receipt.pharmacyFooterText, pageW - margin * 2);
    doc.text(footerLines, pageW / 2, y, { align: 'center' });
    y += footerLines.length * 4 + 3;
  }

  // APOTEKH marketing line — always shown in amber, two lines for breathing room
  doc.setFontSize(8);
  doc.setTextColor(232, 160, 32); // #E8A020 — amber active signal
  centerText('Powered by APOTEKH · apotekh.co.tz', y, 8);
  y += 5;
  centerText('Powering Pharmacies. Protecting Patients.', y, 8);

  doc.save(`receipt-${receipt.referenceNumber}.pdf`);
}
