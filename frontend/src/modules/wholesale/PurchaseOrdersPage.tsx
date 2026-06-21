import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, ChevronDown, ChevronUp, PackagePlus, Plus, Trash2, Upload, UserCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useNotificationStore } from '@/stores/notificationStore';
import type { Product, Supplier, SupplierOrder, SupplierOrderStatus } from '@/types';
import { WholesaleShell } from './WholesaleShell';

type SupplierMode = 'registered' | 'walkin';

type ExtractedLine = {
  productName: string;
  genericName?: string | null;
  quantity: number;
  unitPrice?: number | null;
  batchNumber?: string | null;
  expiryDate?: string | null;
};

const STATUS_STYLE: Record<SupplierOrderStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SENT: 'bg-amber-50 text-amber-700',
  PARTIAL: 'bg-purple-50 text-purple-700',
  RECEIVED: 'bg-[#EDF7F3] text-[#1A6B5C]',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-TZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Receive stock form ───────────────────────────────────────────────────────

type ReceiptLine = { productId: string; quantity: string; batchNumber: string; expiryDate: string; purchasePriceTzs: string };

const ReceiveStockForm: React.FC<{ order: SupplierOrder; onDone: () => void }> = ({ order, onDone }) => {
  const toast = useNotificationStore((s) => s.toast);
  const queryClient = useQueryClient();
  const [partial, setPartial] = React.useState(false);
  const [lines, setLines] = React.useState<Record<string, ReceiptLine>>(() =>
    Object.fromEntries(order.lines.map((l) => [l.productId, {
      productId: l.productId,
      quantity: String(l.quantity - (l.receivedQuantity ?? 0)),
      batchNumber: '',
      expiryDate: '',
      purchasePriceTzs: String(l.unitPriceTzs),
    }]))
  );

  function updateLine(productId: string, field: keyof ReceiptLine, value: string) {
    setLines((prev) => ({ ...prev, [productId]: { ...prev[productId], [field]: value } }));
  }

  const receiveMutation = useMutation({
    mutationFn: () => {
      const receivedLines = Object.values(lines)
        .filter((l) => parseInt(l.quantity, 10) > 0 && l.batchNumber && l.expiryDate)
        .map((l) => ({
          productId: l.productId,
          quantity: parseInt(l.quantity, 10),
          batchNumber: l.batchNumber,
          expiryDate: l.expiryDate,
          purchasePriceTzs: parseFloat(l.purchasePriceTzs) || 0,
        }));
      return api.patch(`/b2b/purchase-orders/${order.id}/status`, {
        nextStatus: partial ? 'PARTIAL' : 'RECEIVED',
        receivedLines,
      }).then((r) => r.data.data as SupplierOrder);
    },
    onSuccess: () => {
      toast.success('Stock received and added to inventory');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      onDone();
    },
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Could not receive stock'),
  });

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-[#D6F0E8] bg-[#F7FCFA] p-4">
      <p className="text-sm font-semibold text-[#0D4035]">Receive stock from supplier</p>
      <div className="space-y-3">
        {order.lines.map((line) => {
          const remaining = line.quantity - (line.receivedQuantity ?? 0);
          if (remaining <= 0) return null;
          const draft = lines[line.productId];
          return (
            <div key={line.productId} className="rounded-xl border border-[#D6F0E8] bg-white p-3">
              <p className="text-sm font-medium text-[#0D4035]">{line.productId.slice(-8)} · ordered {line.quantity} · remaining {remaining}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-4">
                <Input label="Qty received" type="number" min={1} max={remaining} value={draft?.quantity ?? ''} onChange={(e) => updateLine(line.productId, 'quantity', e.target.value)} />
                <Input label="Batch #" value={draft?.batchNumber ?? ''} onChange={(e) => updateLine(line.productId, 'batchNumber', e.target.value)} />
                <Input label="Expiry date" type="date" value={draft?.expiryDate ?? ''} onChange={(e) => updateLine(line.productId, 'expiryDate', e.target.value)} />
                <Input label="Purchase price (Tsh)" type="number" value={draft?.purchasePriceTzs ?? ''} onChange={(e) => updateLine(line.productId, 'purchasePriceTzs', e.target.value)} />
              </div>
            </div>
          );
        })}
      </div>
      <label className="flex items-center gap-2 text-sm text-[#64748B]">
        <input type="checkbox" checked={partial} onChange={(e) => setPartial(e.target.checked)} className="accent-[#1A6B5C]" />
        Partial delivery — more stock expected
      </label>
      <div className="flex gap-2">
        <Button onClick={() => receiveMutation.mutate()} loading={receiveMutation.isPending} className="flex-1">
          Receive stock
        </Button>
        <Button variant="secondary" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
};

// ─── Purchase order card ──────────────────────────────────────────────────────

const PurchaseOrderCard: React.FC<{ order: SupplierOrder }> = ({ order }) => {
  const toast = useNotificationStore((s) => s.toast);
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = React.useState(false);
  const [showReceive, setShowReceive] = React.useState(false);

  const sendMutation = useMutation({
    mutationFn: () => api.patch(`/b2b/purchase-orders/${order.id}/status`, { nextStatus: 'SENT' }).then((r) => r.data.data as SupplierOrder),
    onSuccess: () => { toast.success('Order marked as sent to supplier'); queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }); },
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.patch(`/b2b/purchase-orders/${order.id}/status`, { nextStatus: 'CANCELLED' }).then((r) => r.data.data as SupplierOrder),
    onSuccess: () => { toast.success('Order cancelled'); queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }); },
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Failed'),
  });

  const canSend = order.status === 'DRAFT';
  const canReceive = ['SENT', 'PARTIAL'].includes(order.status);
  const canCancel = ['DRAFT', 'SENT'].includes(order.status);

  return (
    <div className="rounded-2xl border border-[#D6F0E8] bg-white">
      <div className="flex flex-wrap items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[order.status]}`}>{order.status}</span>
            <p className="font-semibold text-[#0D4035]">{order.supplierName ?? order.supplierId.slice(-8)}</p>
          </div>
          <p className="mt-1 text-sm text-[#64748B]">{order.lines.length} line{order.lines.length !== 1 ? 's' : ''} · Created {fmt(order.createdAt)}</p>
          {order.expectedDeliveryDate && <p className="text-xs text-[#1A6B5C]">Expected {fmt(order.expectedDeliveryDate)}</p>}
          {order.notes && <p className="text-xs text-[#94A3B8]">{order.notes}</p>}
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {canSend && <Button size="sm" onClick={() => sendMutation.mutate()} loading={sendMutation.isPending}>Mark sent</Button>}
          {canReceive && !showReceive && <Button size="sm" leftIcon={<PackagePlus size={13} />} onClick={() => { setShowReceive(true); setExpanded(true); }}>Receive</Button>}
          {canCancel && <Button size="sm" variant="secondary" onClick={() => cancelMutation.mutate()} loading={cancelMutation.isPending}>Cancel</Button>}
          <button onClick={() => setExpanded((s) => !s)} className="inline-flex items-center gap-1 rounded-full border border-[#D6F0E8] px-3 py-1.5 text-xs text-[#64748B] hover:bg-[#EDF7F3]">
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Lines
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#D6F0E8] px-4 pb-4">
          <div className="mt-3 space-y-2">
            {order.lines.map((line) => (
              <div key={line.productId} className="flex items-start justify-between gap-4 text-sm">
                <p className="text-[#0D4035]">{line.productId.slice(-8)}</p>
                <div className="text-right">
                  <p className="text-[#64748B]">Ordered: {line.quantity} · Tsh {line.unitPriceTzs.toLocaleString()}/unit</p>
                  {(line.receivedQuantity ?? 0) > 0 && (
                    <p className="text-xs text-[#1A6B5C]">Received: {line.receivedQuantity}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {showReceive && canReceive && (
            <ReceiveStockForm order={order} onDone={() => setShowReceive(false)} />
          )}
        </div>
      )}
    </div>
  );
};

// ─── Create order form ────────────────────────────────────────────────────────

type DraftLine = { productId: string; productName: string; quantity: string; unitPriceTzs: string };

const CreatePurchaseOrderForm: React.FC<{ onCreated: () => void }> = ({ onCreated }) => {
  const toast = useNotificationStore((s) => s.toast);
  const queryClient = useQueryClient();
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [supplierMode, setSupplierMode] = React.useState<SupplierMode>('registered');
  const [supplierId, setSupplierId] = React.useState('');
  const [walkinName, setWalkinName] = React.useState('');
  const [walkinPhone, setWalkinPhone] = React.useState('');
  const [expectedDate, setExpectedDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [draftLines, setDraftLines] = React.useState<DraftLine[]>([{ productId: '', productName: '', quantity: '', unitPriceTzs: '' }]);
  const [extracting, setExtracting] = React.useState(false);

  const suppliersQuery = useQuery({
    queryKey: ['b2b-suppliers'],
    queryFn: () => api.get('/b2b/suppliers').then((r) => r.data.data as Supplier[]),
  });

  const productsQuery = useQuery({
    queryKey: ['wholesale-settings-products'],
    queryFn: () => api.get('/inventory/products', { params: { limit: 200 } }).then((r) => r.data.data as Product[]),
  });

  function addLine() { setDraftLines((prev) => [...prev, { productId: '', productName: '', quantity: '', unitPriceTzs: '' }]); }
  function removeLine(i: number) { setDraftLines((prev) => prev.filter((_, idx) => idx !== i)); }
  function updateLine(i: number, field: keyof DraftLine, value: string) {
    setDraftLines((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/b2b/purchase-orders/extract-delivery-note', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { data } = res.data as { data: { supplierName?: string | null; supplierPhone?: string | null; lines: ExtractedLine[] } };
      if (data.supplierName && supplierMode === 'walkin') {
        setWalkinName((prev) => prev || data.supplierName!);
        setWalkinPhone((prev) => prev || data.supplierPhone || '');
      }
      if (data.lines.length > 0) {
        setDraftLines(data.lines.map((l) => ({
          productId: '',
          productName: l.productName,
          quantity: String(l.quantity),
          unitPriceTzs: l.unitPrice != null ? String(l.unitPrice) : '',
        })));
        toast.success(`Extracted ${data.lines.length} line items from document`);
      } else {
        toast.error('No line items found in the uploaded document');
      }
    } catch {
      toast.error('Could not extract data from document');
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/b2b/purchase-orders', {
        ...(supplierMode === 'registered' ? { supplierId: supplierId || undefined } : {}),
        ...(supplierMode === 'walkin' ? { walkinSupplierName: walkinName.trim(), walkinSupplierPhone: walkinPhone.trim() || undefined } : {}),
        expectedDeliveryDate: expectedDate || null,
        notes: notes || null,
        lines: draftLines
          .filter((l) => parseInt(l.quantity, 10) > 0)
          .map((l) => ({
            productId: l.productId || undefined,
            productName: l.productName || undefined,
            quantity: parseInt(l.quantity, 10),
            unitPriceTzs: parseFloat(l.unitPriceTzs) || 0,
          })),
      }).then((r) => r.data.data as SupplierOrder),
    onSuccess: () => {
      toast.success('Purchase order created');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setSupplierId(''); setWalkinName(''); setWalkinPhone(''); setExpectedDate(''); setNotes('');
      setDraftLines([{ productId: '', productName: '', quantity: '', unitPriceTzs: '' }]);
      onCreated();
    },
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Could not create order'),
  });

  const supplierReady = supplierMode === 'registered' ? Boolean(supplierId) : Boolean(walkinName.trim());
  const canSubmit = supplierReady && draftLines.some((l) => parseInt(l.quantity, 10) > 0);

  return (
    <Card header={<h2 className="text-base font-semibold text-[#0D4035]">Create purchase order</h2>}>
      <div className="space-y-4">
        {/* Supplier mode toggle */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#64748B]">Supplier</p>
          <div className="flex gap-2">
            <button
              onClick={() => setSupplierMode('registered')}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${supplierMode === 'registered' ? 'border-[#1A6B5C] bg-[#1A6B5C] text-white' : 'border-[#D6F0E8] text-[#64748B] hover:bg-[#EDF7F3]'}`}
            >
              <Building2 size={13} /> Registered supplier
            </button>
            <button
              onClick={() => setSupplierMode('walkin')}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${supplierMode === 'walkin' ? 'border-[#1A6B5C] bg-[#1A6B5C] text-white' : 'border-[#D6F0E8] text-[#64748B] hover:bg-[#EDF7F3]'}`}
            >
              <UserCheck size={13} /> New / unregistered
            </button>
          </div>

          {supplierMode === 'registered' ? (
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full rounded-xl border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] outline-none focus:border-[#1A6B5C] focus:ring-1 focus:ring-[#1A6B5C]">
              <option value="">Select supplier…</option>
              {(suppliersQuery.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Supplier / manufacturer name *" value={walkinName} onChange={(e) => setWalkinName(e.target.value)} placeholder="e.g. Shelys Pharma Ltd" />
              <Input label="Phone (optional)" value={walkinPhone} onChange={(e) => setWalkinPhone(e.target.value)} placeholder="+255 7XX XXX XXX" />
            </div>
          )}
        </div>

        {/* Delivery note upload */}
        <div className="rounded-2xl border border-dashed border-[#AFDFD3] bg-[#F7FCFA] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[#0D4035]">Upload delivery note or receipt</p>
              <p className="text-xs text-[#64748B] mt-0.5">PDF or image — AI extracts line items automatically</p>
            </div>
            <div>
              <input ref={fileRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileUpload} />
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Upload size={13} />}
                loading={extracting}
                onClick={() => fileRef.current?.click()}
              >
                {extracting ? 'Extracting…' : 'Upload'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Expected delivery" type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
          <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#64748B]">Line items</p>
          {draftLines.map((line, i) => (
            <div key={i} className="grid items-end gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#64748B]">Product</label>
                <input
                  type="text"
                  value={line.productName || line.productId}
                  onChange={(e) => {
                    const val = e.target.value;
                    const match = (productsQuery.data ?? []).find((p) => p.name === val);
                    updateLine(i, 'productName', val);
                    if (match) updateLine(i, 'productId', match.id);
                  }}
                  list={`products-list-${i}`}
                  placeholder="Type or select product name…"
                  className="w-full rounded-xl border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] outline-none focus:border-[#1A6B5C] focus:ring-1 focus:ring-[#1A6B5C]"
                />
                <datalist id={`products-list-${i}`}>
                  {(productsQuery.data ?? []).map((p) => <option key={p.id} value={p.name} />)}
                </datalist>
              </div>
              <Input label="Qty" type="number" min={1} value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} />
              <Input label="Unit price (Tsh)" type="number" value={line.unitPriceTzs} onChange={(e) => updateLine(i, 'unitPriceTzs', e.target.value)} />
              <button onClick={() => removeLine(i)} className="mb-[2px] flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D6F0E8] text-[#94A3B8] hover:text-[#B91C1C]">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <Button variant="secondary" size="sm" leftIcon={<Plus size={13} />} onClick={addLine}>Add line</Button>
        </div>

        <Button className="w-full" onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit}>
          Create purchase order
        </Button>
      </div>
    </Card>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export const PurchaseOrdersPage: React.FC = () => {
  const [showCreate, setShowCreate] = React.useState(false);

  const ordersQuery = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => api.get('/b2b/purchase-orders').then((r) => r.data.data as SupplierOrder[]),
  });

  const orders = ordersQuery.data ?? [];

  return (
    <WholesaleShell>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-[#0D4035]">Purchase orders</h1>
          <Button size="sm" leftIcon={<Plus size={13} />} onClick={() => setShowCreate((s) => !s)}>
            {showCreate ? 'Cancel' : 'New order'}
          </Button>
        </div>
        <p className="text-sm text-[#64748B]">Orders placed to your suppliers for wholesale stock replenishment. Receiving an order automatically creates batches and stock movements.</p>

        {showCreate && <CreatePurchaseOrderForm onCreated={() => setShowCreate(false)} />}

        <div className="space-y-3">
          {ordersQuery.isLoading && (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#1A6B5C] border-t-transparent" />
            </div>
          )}
          {!ordersQuery.isLoading && orders.length === 0 && (
            <Card>
              <div className="py-8 text-center">
                <PackagePlus size={32} className="mx-auto text-[#AFDFD3]" />
                <p className="mt-3 text-sm font-medium text-[#0D4035]">No purchase orders yet</p>
                <p className="mt-1 text-xs text-[#64748B]">Create a purchase order to track stock you've ordered from suppliers.</p>
              </div>
            </Card>
          )}
          {orders.map((order) => (
            <PurchaseOrderCard key={order.id} order={order} />
          ))}
        </div>
      </div>
    </WholesaleShell>
  );
};
