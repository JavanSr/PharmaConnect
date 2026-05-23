import { prisma } from '../../lib/prisma';

interface OrderExportData {
  id: string;
  orderNumber: string;
  pharmacyName: string;
  pharmacyLicence: string;
  pharmacyAddress: string;
  createdAt: Date;
  items: Array<{
    productName: string;
    genericName?: string | null;
    strength?: string | null;
    dosageForm?: string | null;
    quantityOrdered: number;
    expectedUnitCost?: number | null;
    supplierName?: string;
  }>;
  notes?: string | null;
}

export async function getOrderExportData(pharmacyId: string, orderId: string): Promise<OrderExportData> {
  const order = await prisma.stockOrder.findFirst({
    where: { id: orderId, pharmacyId },
    include: {
      pharmacy: { select: { name: true, licenceNumber: true, address: true } },
      items: {
        select: {
          productName: true,
          genericName: true,
          strength: true,
          dosageForm: true,
          quantityOrdered: true,
          expectedUnitCost: true,
          supplier: { select: { name: true } },
        },
      },
    },
  });

  if (!order) {
    throw Object.assign(new Error('Stock order not found'), { status: 404 });
  }

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    pharmacyName: order.pharmacy.name,
    pharmacyLicence: order.pharmacy.licenceNumber,
    pharmacyAddress: order.pharmacy.address,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      productName: item.productName,
      genericName: item.genericName,
      strength: item.strength,
      dosageForm: item.dosageForm,
      quantityOrdered: item.quantityOrdered,
      expectedUnitCost: item.expectedUnitCost ? Number(item.expectedUnitCost) : undefined,
      supplierName: item.supplier?.name,
    })),
    notes: order.notes,
  };
}

export function generatePlainTextOrder(data: OrderExportData): string {
  const lines: string[] = [
    '='.repeat(60),
    'PURCHASE ORDER',
    '='.repeat(60),
    '',
    `Order Number: ${data.orderNumber}`,
    `Date: ${data.createdAt.toLocaleDateString('en-TZ')}`,
    '',
    'FROM:',
    `  Pharmacy: ${data.pharmacyName}`,
    `  Licence: ${data.pharmacyLicence}`,
    `  Address: ${data.pharmacyAddress}`,
    '',
    '-'.repeat(60),
    'ITEMS:',
    '-'.repeat(60),
  ];

  data.items.forEach((item, idx) => {
    lines.push(`${idx + 1}. ${item.productName}`);
    if (item.genericName) lines.push(`   Generic: ${item.genericName}`);
    if (item.strength) lines.push(`   Strength: ${item.strength}`);
    if (item.dosageForm) lines.push(`   Form: ${item.dosageForm}`);
    lines.push(`   Quantity: ${item.quantityOrdered} units`);
    if (item.expectedUnitCost) lines.push(`   Unit Cost: Tsh ${item.expectedUnitCost}`);
    if (item.supplierName) lines.push(`   Supplier: ${item.supplierName}`);
    lines.push('');
  });

  lines.push('-'.repeat(60));
  if (data.notes) {
    lines.push('NOTES:');
    lines.push(data.notes);
    lines.push('');
  }

  lines.push('='.repeat(60));
  lines.push('Please send this order to your supplier');
  lines.push('Order Reference: ' + data.orderNumber);
  lines.push('='.repeat(60));

  return lines.join('\n');
}

export function generateWhatsAppShareText(data: OrderExportData): string {
  const itemsList = data.items
    .map((item, idx) => {
      const parts = [`${idx + 1}. ${item.productName}`];
      if (item.genericName) parts.push(`(${item.genericName})`);
      parts.push(`- Qty: ${item.quantityOrdered}`);
      return parts.join(' ');
    })
    .join('\n');

  const notesLine = data.notes ? `Notes: ${data.notes}\n\n` : '';
  const text = `*Purchase Order - ${data.orderNumber}*

From: ${data.pharmacyName}
Licence: ${data.pharmacyLicence}
Address: ${data.pharmacyAddress}

Items:
${itemsList}

${notesLine}Please confirm receipt of this order.`;

  return text;
}

export function generateWhatsAppShareLink(data: OrderExportData): string {
  const message = generateWhatsAppShareText(data);
  const encoded = encodeURIComponent(message);
  // Generic WhatsApp link - user selects contact
  return `https://wa.me/?text=${encoded}`;
}
