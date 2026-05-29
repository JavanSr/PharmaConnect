import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Package,
  Scan,
  Truck,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type { OrderStatus, VatInvoice, WholesaleOrder, WholesaleOrderLine } from '@/types';
import { WholesaleShell } from '@/modules/wholesale/WholesaleShell';

const STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  PACKED: 'Packed',
  DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  DISPUTED: 'Disputed',
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SUBMITTED: 'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-blue-50 text-blue-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
  PACKED: 'bg-[#EDF7F3] text-[#1A6B5C]',
  DISPATCHED: 'bg-purple-50 text-purple-700',
  DELIVERED: 'bg-green-50 text-green-700',
  COMPLETED: 'bg-[#D6F0E8] text-[#0D4035]',
  DISPUTED: 'bg-red-50 text-red-700',
};

const ALL_STATUSES: OrderStatus[] = [
  'SUBMITTED', 'CONFIRMED', 'PACKED', 'DISPATCHED', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'CANCELLED',
];

const MANAGER_ROLES = ['OWNER', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'];
const PICKER_ROLES = ['OWNER', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF', 'SUPER_ADMIN'];
const DELIVERY_ROLES = ['OWNER', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF', 'DELIVERY_STAFF', 'SUPER_ADMIN'];

function ts(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleString('en-TZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── Verify items panel ───────────────────────────────────────────────────────

type VerifyResult = { matched: { productId: string; barcode: string; scanned: number }[]; unmatched: { barcode: string; scanned: number }[]; shortfall: { productId: string; barcode: string; required: number; scanned: number }[] };

const VerifyPanel: React.FC<{ order: WholesaleOrder; onClose: () => void; onDone: () => void }> = ({ order, onClose, onDone }) => {
  const toast = useNotificationStore((state) => state.toast);
  const [barcodeInput, setBarcodeInput] = React.useState('');
  const [scanned, setScanned] = React.useState<string[]>([]);
  const [result, setResult] = React.useState<VerifyResult | null>(null);

  const verifyMutation = useMutation({
    mutationFn: () =>
      api.post(`/b2b/orders/${order.id}/verify-items`, { scanned_barcodes: scanned }).then((r) => r.data.data as VerifyResult),
    onSuccess: (data) => {
      setResult(data);
      if (data.shortfall.length === 0 && data.unmatched.length === 0) {
        toast.success('All items verified');
        onDone();
      }
    },
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Verify failed'),
  });

  function handleBarcodeKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && barcodeInput.trim()) {
      setScanned((prev) => [...prev, barcodeInput.trim()]);
      setBarcodeInput('');
      e.preventDefault();
    }
  }

  const counts = scanned.reduce<Record<string, number>>((acc, b) => { acc[b] = (acc[b] ?? 0) + 1; return acc; }, {});

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-[#D6F0E8] bg-[#F7FCFA] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scan size={15} className="text-[#1A6B5C]" />
          <p className="text-sm font-semibold text-[#0D4035]">Verify by barcode scan</p>
        </div>
        <button onClick={onClose} className="text-xs text-[#94A3B8] hover:text-[#64748B]">Close</button>
      </div>

      <div className="space-y-2">
        {order.items.map((line) => {
          const scannedCount = line.barcode ? (counts[line.barcode] ?? 0) : 0;
          const ok = scannedCount >= line.quantity;
          return (
            <div key={line.productId} className={`flex items-center justify-between rounded-xl border p-3 text-sm ${ok ? 'border-[#AFDFD3] bg-[#EDF7F3]' : 'border-[#D6F0E8] bg-white'}`}>
              <div>
                <p className="font-medium text-[#0D4035]">{line.productName}</p>
                {line.barcode && <p className="text-xs text-[#94A3B8]">Barcode: {line.barcode}</p>}
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${ok ? 'text-[#1A6B5C]' : 'text-[#64748B]'}`}>
                  {scannedCount} / {line.quantity}
                </p>
                {ok && <CheckCircle2 size={14} className="ml-auto text-[#1A6B5C]" />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Input
          label="Scan barcode (press Enter after each)"
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          onKeyDown={handleBarcodeKey}
          placeholder="Focus here and scan..."
          className="flex-1"
        />
      </div>

      {scanned.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(counts).map(([barcode, count]) => (
            <span key={barcode} className="rounded-full bg-[#D6F0E8] px-2.5 py-1 text-xs font-medium text-[#0D4035]">
              {barcode} ×{count}
            </span>
          ))}
        </div>
      )}

      {result && (
        <div className="space-y-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
          {result.shortfall.map((s) => (
            <p key={s.productId} className="text-xs text-amber-800">
              Shortfall: {s.barcode} — scanned {s.scanned}, need {s.required}
            </p>
          ))}
          {result.unmatched.map((u) => (
            <p key={u.barcode} className="text-xs text-amber-800">Unknown barcode: {u.barcode}</p>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={() => verifyMutation.mutate()}
          loading={verifyMutation.isPending}
          disabled={scanned.length === 0}
          className="flex-1"
        >
          Submit verification ({scanned.length} scans)
        </Button>
        <Button variant="secondary" onClick={() => setScanned([])}>Clear</Button>
      </div>
    </div>
  );
};

// ─── Pick items panel ─────────────────────────────────────────────────────────

const PickPanel: React.FC<{ order: WholesaleOrder; onClose: () => void; onDone: (updated: WholesaleOrder) => void }> = ({ order, onClose, onDone }) => {
  const toast = useNotificationStore((state) => state.toast);
  const [picks, setPicks] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(order.items.map((line) => [line.productId, String(line.pickedQuantity ?? line.quantity)]))
  );

  const pickMutation = useMutation({
    mutationFn: () =>
      api.patch(`/b2b/orders/${order.id}/pick-items`, {
        picks: order.items.map((line) => ({ productId: line.productId, pickedQuantity: parseInt(picks[line.productId] ?? '0', 10) || 0 })),
      }).then((r) => r.data.data as WholesaleOrder),
    onSuccess: (updated) => {
      toast.success(updated.status === 'PACKED' ? 'All items picked — order moved to Packed' : 'Pick quantities saved');
      onDone(updated);
    },
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Pick failed'),
  });

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-[#D6F0E8] bg-[#F7FCFA] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={15} className="text-[#1A6B5C]" />
          <p className="text-sm font-semibold text-[#0D4035]">Pick items</p>
        </div>
        <button onClick={onClose} className="text-xs text-[#94A3B8] hover:text-[#64748B]">Close</button>
      </div>

      <div className="space-y-2">
        {order.items.map((line) => (
          <div key={line.productId} className="flex items-center gap-3 rounded-xl border border-[#D6F0E8] bg-white p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#0D4035]">{line.productName}</p>
              <p className="text-xs text-[#94A3B8]">Ordered: {line.quantity}</p>
            </div>
            <div className="w-24 shrink-0">
              <Input
                label="Picked"
                type="number"
                min={0}
                max={line.quantity}
                value={picks[line.productId] ?? ''}
                onChange={(e) => setPicks((p) => ({ ...p, [line.productId]: e.target.value }))}
                className="text-center"
              />
            </div>
          </div>
        ))}
      </div>

      <Button onClick={() => pickMutation.mutate()} loading={pickMutation.isPending} className="w-full">
        Save picks
      </Button>
    </div>
  );
};

// ─── Order card ───────────────────────────────────────────────────────────────

const OrderCard: React.FC<{ order: WholesaleOrder; role: string; invoice?: VatInvoice; onUpdated: (o: WholesaleOrder) => void }> = ({ order, role, invoice, onUpdated }) => {
  const toast = useNotificationStore((state) => state.toast);
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = React.useState(false);
  const [showPick, setShowPick] = React.useState(false);
  const [showVerify, setShowVerify] = React.useState(false);
  const [showSchedule, setShowSchedule] = React.useState(false);
  const [scheduleDraft, setScheduleDraft] = React.useState({
    scheduledDeliveryAt: order.scheduledDeliveryAt ? order.scheduledDeliveryAt.slice(0, 16) : '',
    deliveryWindowLabel: order.deliveryWindowLabel ?? '',
    deliveryNote: order.deliveryNote ?? '',
  });

  const isManager = MANAGER_ROLES.includes(role);
  const isPicker = PICKER_ROLES.includes(role);
  const isDelivery = DELIVERY_ROLES.includes(role);

  const statusMutation = useMutation({
    mutationFn: (payload: { nextStatus: OrderStatus; assignedPicker?: string | null; assignedDriver?: string | null }) =>
      api.patch(`/b2b/orders/${order.id}/status`, payload).then((r) => r.data.data as WholesaleOrder),
    onSuccess: (updated) => {
      toast.success(`Order ${STATUS_LABEL[updated.status]}`);
      onUpdated(updated);
      queryClient.invalidateQueries({ queryKey: ['wholesale-invoices'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Action failed'),
  });

  const deliveryMutation = useMutation({
    mutationFn: () => api.patch(`/b2b/orders/${order.id}/confirm-delivery`).then((r) => r.data.data as WholesaleOrder),
    onSuccess: (updated) => { toast.success('Delivery confirmed'); onUpdated(updated); },
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Could not confirm delivery'),
  });

  const scheduleMutation = useMutation({
    mutationFn: () =>
      api.patch(`/b2b/orders/${order.id}/delivery-schedule`, {
        scheduledDeliveryAt: scheduleDraft.scheduledDeliveryAt,
        deliveryWindowLabel: scheduleDraft.deliveryWindowLabel || null,
        deliveryNote: scheduleDraft.deliveryNote || null,
      }).then((r) => r.data.data as WholesaleOrder),
    onSuccess: (updated) => { toast.success('Delivery schedule saved'); onUpdated(updated); setShowSchedule(false); },
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Could not save schedule'),
  });

  const { status } = order;

  const canConfirm = isManager && status === 'SUBMITTED';
  const canCancel = isManager && ['SUBMITTED', 'CONFIRMED'].includes(status);
  const canPick = isPicker && status === 'CONFIRMED';
  const canDispatch = isManager && status === 'PACKED';
  const canConfirmDelivery = isDelivery && status === 'DISPATCHED';
  const canComplete = isManager && status === 'DELIVERED';
  const canDispute = isManager && ['DISPATCHED', 'DELIVERED'].includes(status);
  const canSchedule = isPicker && !['COMPLETED', 'CANCELLED', 'DELIVERED'].includes(status);

  const allPicked = order.items.every((l) => (l.pickedQuantity ?? 0) >= l.quantity);

  return (
    <div className="rounded-2xl border border-[#D6F0E8] bg-white">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-[#0D4035]">{order.orderNumber}</p>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}>
              {STATUS_LABEL[status]}
            </span>
            {invoice && (
              <span className="rounded-full bg-[#FFF7ED] px-2 py-0.5 text-xs font-medium text-[#B45309]">
                INV {invoice.invoiceNumber}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#64748B]">
            {order.items.length} line{order.items.length !== 1 ? 's' : ''} · Tsh {order.totalAmount.toLocaleString()}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#94A3B8]">
            {order.submittedAt && <span>Submitted {ts(order.submittedAt)}</span>}
            {order.confirmedAt && <span>Confirmed {ts(order.confirmedAt)}</span>}
            {order.packedAt && <span>Packed {ts(order.packedAt)}</span>}
            {order.dispatchedAt && <span>Dispatched {ts(order.dispatchedAt)}</span>}
            {order.deliveredAt && <span>Delivered {ts(order.deliveredAt)}</span>}
            {order.completedAt && <span>Completed {ts(order.completedAt)}</span>}
          </div>
          {order.scheduledDeliveryAt && (
            <p className="mt-1 text-xs text-[#1A6B5C]">
              Delivery: {ts(order.scheduledDeliveryAt)}{order.deliveryWindowLabel ? ` · ${order.deliveryWindowLabel}` : ''}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {/* Primary actions */}
          {canConfirm && (
            <Button size="sm" onClick={() => statusMutation.mutate({ nextStatus: 'CONFIRMED' })} loading={statusMutation.isPending}>
              Confirm
            </Button>
          )}
          {canPick && !showPick && (
            <Button size="sm" variant="secondary" leftIcon={<Package size={13} />} onClick={() => { setShowPick(true); setShowVerify(false); }}>
              {allPicked ? 'Re-pick' : 'Pick items'}
            </Button>
          )}
          {status === 'PACKED' && isPicker && !showVerify && (
            <Button size="sm" variant="secondary" leftIcon={<Scan size={13} />} onClick={() => { setShowVerify(true); setShowPick(false); }}>
              Verify
            </Button>
          )}
          {canDispatch && (
            <Button size="sm" leftIcon={<Truck size={13} />} onClick={() => statusMutation.mutate({ nextStatus: 'DISPATCHED' })} loading={statusMutation.isPending}>
              Dispatch
            </Button>
          )}
          {canConfirmDelivery && (
            <Button size="sm" leftIcon={<CheckCircle2 size={13} />} onClick={() => deliveryMutation.mutate()} loading={deliveryMutation.isPending}>
              Confirm delivery
            </Button>
          )}
          {canComplete && (
            <Button size="sm" onClick={() => statusMutation.mutate({ nextStatus: 'COMPLETED' })} loading={statusMutation.isPending}>
              Complete
            </Button>
          )}
          {canDispute && (
            <Button size="sm" variant="secondary" leftIcon={<AlertTriangle size={13} />} onClick={() => statusMutation.mutate({ nextStatus: 'DISPUTED' })} loading={statusMutation.isPending}>
              Dispute
            </Button>
          )}
          {canCancel && (
            <Button size="sm" variant="secondary" leftIcon={<XCircle size={13} />} onClick={() => statusMutation.mutate({ nextStatus: 'CANCELLED' })} loading={statusMutation.isPending}>
              Cancel
            </Button>
          )}

          {/* Expand / schedule toggles */}
          {canSchedule && (
            <button
              onClick={() => setShowSchedule((s) => !s)}
              className="inline-flex items-center gap-1 rounded-full border border-[#D6F0E8] px-3 py-1.5 text-xs text-[#64748B] hover:bg-[#EDF7F3]"
            >
              <Truck size={12} />
              {showSchedule ? 'Hide' : 'Schedule'}
            </button>
          )}
          <button
            onClick={() => setExpanded((s) => !s)}
            className="inline-flex items-center gap-1 rounded-full border border-[#D6F0E8] px-3 py-1.5 text-xs text-[#64748B] hover:bg-[#EDF7F3]"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Hide' : 'Items'}
          </button>
        </div>
      </div>

      {/* Items list */}
      {expanded && (
        <div className="border-t border-[#D6F0E8] px-4 py-3 space-y-2">
          {order.items.map((line) => (
            <div key={line.productId} className="flex items-start justify-between gap-4 text-sm">
              <div>
                <p className="font-medium text-[#0D4035]">{line.productName}</p>
                {line.genericName && <p className="text-xs text-[#94A3B8]">{line.genericName}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[#0D4035]">{line.quantity} × Tsh {line.unitPrice.toLocaleString()}</p>
                <p className="text-xs text-[#64748B]">= Tsh {line.lineTotal.toLocaleString()}</p>
                {line.pickedQuantity !== undefined && (
                  <p className={`text-xs font-medium ${line.pickedQuantity >= line.quantity ? 'text-[#1A6B5C]' : 'text-amber-600'}`}>
                    Picked: {line.pickedQuantity}
                  </p>
                )}
                {line.verifiedQuantity !== undefined && (
                  <p className={`text-xs font-medium ${line.verifiedQuantity >= line.quantity ? 'text-[#1A6B5C]' : 'text-red-500'}`}>
                    Verified: {line.verifiedQuantity}
                  </p>
                )}
              </div>
            </div>
          ))}
          <div className="flex justify-between border-t border-[#D6F0E8] pt-2 text-sm font-semibold text-[#0D4035]">
            <span>Total</span>
            <span>Tsh {order.totalAmount.toLocaleString()}</span>
          </div>
          {order.notes && <p className="text-xs text-[#64748B]">Note: {order.notes}</p>}
        </div>
      )}

      {/* Pick panel */}
      {showPick && (
        <div className="border-t border-[#D6F0E8] px-4 pb-4">
          <PickPanel
            order={order}
            onClose={() => setShowPick(false)}
            onDone={(updated) => { onUpdated(updated); setShowPick(false); }}
          />
        </div>
      )}

      {/* Verify panel */}
      {showVerify && (
        <div className="border-t border-[#D6F0E8] px-4 pb-4">
          <VerifyPanel
            order={order}
            onClose={() => setShowVerify(false)}
            onDone={() => { setShowVerify(false); }}
          />
        </div>
      )}

      {/* Schedule delivery panel */}
      {showSchedule && (
        <div className="border-t border-[#D6F0E8] px-4 pb-4">
          <div className="mt-4 grid gap-3 rounded-2xl border border-[#E5F2ED] bg-[#F7FCFA] p-4 sm:grid-cols-[1fr_1fr_1.5fr_auto]">
            <Input
              label="Scheduled delivery"
              type="datetime-local"
              value={scheduleDraft.scheduledDeliveryAt}
              onChange={(e) => setScheduleDraft((d) => ({ ...d, scheduledDeliveryAt: e.target.value }))}
            />
            <Input
              label="Window"
              placeholder="Morning route"
              value={scheduleDraft.deliveryWindowLabel}
              onChange={(e) => setScheduleDraft((d) => ({ ...d, deliveryWindowLabel: e.target.value }))}
            />
            <Input
              label="Delivery note"
              placeholder="Leave at receiving desk"
              value={scheduleDraft.deliveryNote}
              onChange={(e) => setScheduleDraft((d) => ({ ...d, deliveryNote: e.target.value }))}
            />
            <div className="flex items-end">
              <Button onClick={() => scheduleMutation.mutate()} loading={scheduleMutation.isPending}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Orders page ──────────────────────────────────────────────────────────────

export const OrdersPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const role = user?.role ?? '';
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | 'ALL'>('ALL');
  const [orders, setOrders] = React.useState<WholesaleOrder[] | null>(null);

  const ordersQuery = useQuery({
    queryKey: ['wholesale-orders-full'],
    queryFn: () => api.get('/b2b/orders').then((r) => r.data.data as WholesaleOrder[]),
  });

  const invoicesQuery = useQuery({
    queryKey: ['wholesale-invoices'],
    queryFn: () => api.get('/b2b/invoices').then((r) => r.data.data as VatInvoice[]),
  });

  React.useEffect(() => {
    if (ordersQuery.data) setOrders(ordersQuery.data);
  }, [ordersQuery.data]);

  function handleUpdated(updated: WholesaleOrder) {
    setOrders((prev) => prev ? prev.map((o) => o.id === updated.id ? updated : o) : [updated]);
  }

  const invoiceByOrderId = new Map((invoicesQuery.data ?? []).map((inv) => [inv.orderId, inv]));

  const displayed = (orders ?? []).filter((o) => statusFilter === 'ALL' || o.status === statusFilter);

  const countByStatus = (orders ?? []).reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  const activeStatuses = ALL_STATUSES.filter((s) => (countByStatus[s] ?? 0) > 0);

  return (
    <WholesaleShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-[#0D4035]">Wholesale orders</h1>
          {ordersQuery.isFetching && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A6B5C] border-t-transparent" />
          )}
        </div>

        {/* Status filter chips */}
        {(orders?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === 'ALL' ? 'border-[#1A6B5C] bg-[#1A6B5C] text-white' : 'border-[#D6F0E8] bg-white text-[#0D4035] hover:bg-[#EDF7F3]'}`}
            >
              All ({orders?.length ?? 0})
            </button>
            {activeStatuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === s ? 'border-[#1A6B5C] bg-[#1A6B5C] text-white' : 'border-[#D6F0E8] bg-white text-[#0D4035] hover:bg-[#EDF7F3]'}`}
              >
                {STATUS_LABEL[s]} ({countByStatus[s]})
              </button>
            ))}
          </div>
        )}

        {/* Orders list */}
        <div className="space-y-3">
          {ordersQuery.isLoading && (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#1A6B5C] border-t-transparent" />
            </div>
          )}

          {!ordersQuery.isLoading && displayed.length === 0 && (
            <Card>
              <div className="py-8 text-center">
                <ClipboardCheck size={32} className="mx-auto text-[#AFDFD3]" />
                <p className="mt-3 text-sm font-medium text-[#0D4035]">
                  {statusFilter === 'ALL' ? 'No orders yet' : `No ${STATUS_LABEL[statusFilter as OrderStatus]} orders`}
                </p>
                <p className="mt-1 text-xs text-[#64748B]">
                  {statusFilter === 'ALL' ? 'Orders from buyer pharmacies will appear here.' : 'Try a different filter above.'}
                </p>
              </div>
            </Card>
          )}

          {displayed.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              role={role}
              invoice={invoiceByOrderId.get(order.id)}
              onUpdated={handleUpdated}
            />
          ))}
        </div>
      </div>
    </WholesaleShell>
  );
};
