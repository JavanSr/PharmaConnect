import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { ArrowLeft, Printer, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { groupItemsBySupplier, statusBadgeVariant, statusLabel, type StockOrder, type StockOrderItem } from './stockOrderTypes';

type ReceiptDraft = {
  batchNumber: string;
  expiryDate: string;
  quantityReceived: string;
  unitCost: string;
  sellingPrice: string;
};

const emptyReceiptDraft: ReceiptDraft = {
  batchNumber: '',
  expiryDate: '',
  quantityReceived: '',
  unitCost: '',
  sellingPrice: '',
};

function money(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return amount > 0 ? `TZS ${amount.toLocaleString('en-TZ', { maximumFractionDigits: 2 })}` : '-';
}

function outstanding(item: StockOrderItem) {
  return Math.max(item.quantityOrdered - item.quantityReceived, 0);
}

export const StockOrderViewPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useNotificationStore((s) => s.toast);
  const [receipts, setReceipts] = useState<Record<string, ReceiptDraft>>({});

  const { data: order, isLoading } = useQuery({
    queryKey: ['stock-order', id],
    queryFn: () => api.get(`/stock-orders/${id}`).then((r) => r.data.data as StockOrder),
    enabled: Boolean(id),
  });

  const groups = useMemo(() => groupItemsBySupplier(order?.items ?? []), [order?.items]);
  const canReceive = order?.status === 'SUBMITTED' || order?.status === 'PARTIALLY_RECEIVED';

  const receiveMutation = useMutation({
    mutationFn: () => {
      const payload = Object.entries(receipts)
        .filter(([, receipt]) => receipt.batchNumber && receipt.expiryDate && receipt.quantityReceived && receipt.unitCost)
        .map(([itemId, receipt]) => ({
          itemId,
          batchNumber: receipt.batchNumber,
          expiryDate: receipt.expiryDate,
          quantityReceived: Number(receipt.quantityReceived),
          unitCost: Number(receipt.unitCost),
          sellingPrice: receipt.sellingPrice ? Number(receipt.sellingPrice) : undefined,
        }));
      if (payload.length === 0) {
        throw Object.assign(new Error('Fill at least one receipt form'), { local: true });
      }
      return api.post(`/stock-orders/${id}/receive`, { receipts: payload }).then((r) => r.data.data as StockOrder);
    },
    onSuccess: () => {
      setReceipts({});
      queryClient.invalidateQueries({ queryKey: ['stock-order', id] });
      queryClient.invalidateQueries({ queryKey: ['stock-orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-on-hand'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard-summary'] });
      toast.success('Receipt recorded');
    },
    onError: (e: any) => toast.error(e.local ? e.message : e.response?.data?.error || e.response?.data?.message || 'Failed to receive stock'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/stock-orders/${id}/cancel`).then((r) => r.data.data as StockOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-order', id] });
      queryClient.invalidateQueries({ queryKey: ['stock-orders'] });
      toast.success('Order cancelled');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || e.response?.data?.message || 'Failed to cancel order'),
  });

  const updateReceipt = (itemId: string, patch: Partial<ReceiptDraft>) => {
    setReceipts((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? emptyReceiptDraft), ...patch },
    }));
  };

  const generateSupplierPdf = (supplierGroup: ReturnType<typeof groupItemsBySupplier>[number]) => {
    if (!order) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 16;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(order.pharmacy?.name ?? 'PharmaConnect Pharmacy', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    y += 6;
    doc.text(order.pharmacy?.address ?? '', 15, y);
    y += 5;
    doc.text(`Licence: ${order.pharmacy?.licenceNumber ?? '-'}`, 15, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('PURCHASE ORDER', pageWidth - 15, 18, { align: 'right' });
    doc.setFontSize(10);
    doc.text(order.orderNumber, pageWidth - 15, 25, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(order.createdAt), 'dd MMM yyyy'), pageWidth - 15, 31, { align: 'right' });

    y = 45;
    doc.setFont('helvetica', 'bold');
    doc.text('Supplier', 15, y);
    doc.setFont('helvetica', 'normal');
    y += 6;
    doc.text(supplierGroup.supplierName, 15, y);
    y += 5;
    doc.text([supplierGroup.supplier?.phone, supplierGroup.supplier?.email].filter(Boolean).join(' | ') || '-', 15, y);

    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.text('Item', 15, y);
    doc.text('Qty', 125, y);
    doc.text('Unit cost', 145, y);
    doc.text('Line total', 180, y, { align: 'right' });
    y += 3;
    doc.line(15, y, 195, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    supplierGroup.items.forEach((item) => {
      const unitCost = Number(item.expectedUnitCost ?? 0);
      const lineTotal = unitCost * item.quantityOrdered;
      const itemText = doc.splitTextToSize([item.productName, item.genericName, item.strength, item.dosageForm].filter(Boolean).join(' | '), 105);
      doc.text(itemText, 15, y);
      doc.text(String(item.quantityOrdered), 125, y);
      doc.text(unitCost > 0 ? unitCost.toLocaleString('en-TZ') : '-', 145, y);
      doc.text(unitCost > 0 ? lineTotal.toLocaleString('en-TZ') : '-', 180, y, { align: 'right' });
      y += Math.max(7, itemText.length * 5);
    });

    y += 8;
    doc.text(`Notes: ${order.notes || '-'}`, 15, y);
    y += 18;
    doc.text('Prepared by ____________________', 15, y);
    doc.text('Approved by ____________________', 85, y);
    doc.text('Date ____________', 155, y);

    const safeSupplier = supplierGroup.supplierName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'Supplier';
    doc.save(`${order.orderNumber}-${safeSupplier}.pdf`);
  };

  if (isLoading || !order) {
    return <div className="text-sm text-[#64748B]">Loading order...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/inventory/stock-orders" className="mb-2 inline-flex items-center gap-1 text-sm text-[#1A6B5C] hover:underline">
            <ArrowLeft size={14} /> Back to orders
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-[#0D4035]">{order.orderNumber}</h1>
            <Badge variant={statusBadgeVariant(order.status)}>{statusLabel(order.status)}</Badge>
          </div>
          <p className="mt-1 text-sm text-[#64748B]">
            Created by {order.createdByUser?.firstName} {order.createdByUser?.lastName} on {format(new Date(order.createdAt), 'dd MMM yyyy')}
            {order.submittedAt ? ` | Submitted ${format(new Date(order.submittedAt), 'dd MMM yyyy')}` : ''}
            {order.expectedBy ? ` | Expected ${format(new Date(order.expectedBy), 'dd MMM yyyy')}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.status === 'DRAFT' && <Button variant="secondary" onClick={() => navigate(`/inventory/stock-orders/${order.id}/edit`)}>Continue Draft</Button>}
          {['DRAFT', 'SUBMITTED'].includes(order.status) && (
            <Button variant="danger" leftIcon={<XCircle size={16} />} loading={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      {groups.map((group) => (
        <Card
          key={group.key}
          header={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#0D4035]">{group.supplierName}</p>
                <p className="text-xs text-[#64748B]">{[group.supplier?.phone, group.supplier?.email].filter(Boolean).join(' | ') || 'No contact details'}</p>
              </div>
              <Button size="sm" variant="secondary" leftIcon={<Printer size={14} />} onClick={() => generateSupplierPdf(group)}>
                Print / Share PO
              </Button>
            </div>
          }
          padding={false}
        >
          <div className="divide-y divide-[#D6F0E8]">
            {group.items.map((item) => {
              const remaining = outstanding(item);
              const receipt = receipts[item.id] ?? emptyReceiptDraft;
              return (
                <div key={item.id} className="space-y-3 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0D4035]">{item.productName}</p>
                      <p className="text-xs text-[#64748B]">{[item.genericName, item.strength, item.dosageForm].filter(Boolean).join(' | ')}</p>
                      <p className="mt-1 text-xs text-[#64748B]">
                        Ordered {item.quantityOrdered} | Received {item.quantityReceived} | Outstanding {remaining} | Expected {money(item.expectedUnitCost)}
                      </p>
                    </div>
                    <Badge variant={item.status === 'RECEIVED' ? 'success' : item.status === 'PARTIALLY_RECEIVED' ? 'warning' : 'muted'}>
                      {statusLabel(item.status)}
                    </Badge>
                  </div>

                  {canReceive && remaining > 0 && item.productId && (
                    <div className="grid gap-3 rounded-xl border border-[#D6F0E8] bg-[#F8FCFA] p-3 sm:grid-cols-5">
                      <Input label="Batch number" value={receipt.batchNumber} onChange={(e) => updateReceipt(item.id, { batchNumber: e.target.value })} />
                      <Input label="Expiry date" type="date" value={receipt.expiryDate} onChange={(e) => updateReceipt(item.id, { expiryDate: e.target.value })} />
                      <Input label="Qty received" type="number" min="1" max={remaining} value={receipt.quantityReceived} onChange={(e) => updateReceipt(item.id, { quantityReceived: e.target.value })} />
                      <Input label="Unit cost" type="number" min="0.01" step="0.01" value={receipt.unitCost} onChange={(e) => updateReceipt(item.id, { unitCost: e.target.value })} />
                      <Input label="Selling price" type="number" min="0.01" step="0.01" placeholder={item.product?.sellingPrice ? String(item.product.sellingPrice) : undefined} value={receipt.sellingPrice} onChange={(e) => updateReceipt(item.id, { sellingPrice: e.target.value })} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      {canReceive && (
        <div className="flex justify-end">
          <Button loading={receiveMutation.isPending} onClick={() => receiveMutation.mutate()}>
            Receive Selected
          </Button>
        </div>
      )}
    </div>
  );
};
