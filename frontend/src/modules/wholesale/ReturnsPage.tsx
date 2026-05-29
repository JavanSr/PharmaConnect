import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type { WholesaleOrder, WholesaleReturn, WholesaleReturnLine, WholesaleReturnReason } from '@/types';
import { WholesaleShell } from './WholesaleShell';

const REASON_LABEL: Record<WholesaleReturnReason, string> = {
  DAMAGED: 'Damaged',
  WRONG_ITEM: 'Wrong item',
  EXPIRED: 'Expired',
  OTHER: 'Other',
};

const STATUS_STYLE: Record<WholesaleReturn['status'], string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-[#EDF7F3] text-[#1A6B5C]',
  CREDITED: 'bg-blue-50 text-blue-700',
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-TZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Create return form ───────────────────────────────────────────────────────

const CreateReturnForm: React.FC<{ onCreated: () => void }> = ({ onCreated }) => {
  const toast = useNotificationStore((s) => s.toast);
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = React.useState('');
  const [reason, setReason] = React.useState<WholesaleReturnReason>('DAMAGED');
  const [lines, setLines] = React.useState<Record<string, { qty: string; unitPrice: string }>>({});

  const ordersQuery = useQuery({
    queryKey: ['wholesale-orders-full'],
    queryFn: () => api.get('/b2b/orders').then((r) => r.data.data as WholesaleOrder[]),
  });

  const completedOrders = (ordersQuery.data ?? []).filter((o) => ['DELIVERED', 'COMPLETED'].includes(o.status));
  const selectedOrder = completedOrders.find((o) => o.id === selectedOrderId) ?? null;

  React.useEffect(() => {
    if (selectedOrder) {
      setLines(Object.fromEntries(selectedOrder.items.map((item) => [item.productId, { qty: '', unitPrice: String(item.unitPrice) }])));
    } else {
      setLines({});
    }
  }, [selectedOrderId]);

  const returnLines: WholesaleReturnLine[] = selectedOrder
    ? selectedOrder.items
        .filter((item) => parseInt(lines[item.productId]?.qty ?? '0', 10) > 0)
        .map((item) => ({
          productId: item.productId,
          qty: parseInt(lines[item.productId].qty, 10),
          unitPrice: parseFloat(lines[item.productId]?.unitPrice ?? '0') || item.unitPrice,
        }))
    : [];

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/b2b/returns', { orderId: selectedOrderId, reason, lines: returnLines }).then((r) => r.data.data as WholesaleReturn),
    onSuccess: () => {
      toast.success('Return request created');
      queryClient.invalidateQueries({ queryKey: ['wholesale-returns'] });
      setSelectedOrderId('');
      setLines({});
      onCreated();
    },
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Could not create return'),
  });

  return (
    <Card header={<h2 className="text-base font-semibold text-[#0D4035]">Create return request</h2>}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#64748B]">Order</label>
          <select
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            className="w-full rounded-xl border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] outline-none focus:border-[#1A6B5C] focus:ring-1 focus:ring-[#1A6B5C]"
          >
            <option value="">Select a delivered order…</option>
            {completedOrders.map((o) => (
              <option key={o.id} value={o.id}>{o.orderNumber} — {o.items.length} items</option>
            ))}
          </select>
          {!ordersQuery.isLoading && completedOrders.length === 0 && (
            <p className="mt-1 text-xs text-[#94A3B8]">No delivered or completed orders found.</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[#64748B]">Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as WholesaleReturnReason)}
            className="w-full rounded-xl border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] outline-none focus:border-[#1A6B5C] focus:ring-1 focus:ring-[#1A6B5C]"
          >
            {(Object.keys(REASON_LABEL) as WholesaleReturnReason[]).map((r) => (
              <option key={r} value={r}>{REASON_LABEL[r]}</option>
            ))}
          </select>
        </div>

        {selectedOrder && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#64748B]">Qty to return per item</p>
            {selectedOrder.items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3 rounded-xl border border-[#D6F0E8] p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#0D4035]">{item.productName}</p>
                  <p className="text-xs text-[#94A3B8]">Ordered: {item.quantity}</p>
                </div>
                <div className="w-24 shrink-0">
                  <input
                    type="number"
                    min={0}
                    max={item.quantity}
                    value={lines[item.productId]?.qty ?? ''}
                    onChange={(e) => setLines((prev) => ({ ...prev, [item.productId]: { ...prev[item.productId], qty: e.target.value } }))}
                    placeholder="0"
                    className="w-full rounded-xl border border-[#D6F0E8] px-3 py-2 text-center text-sm text-[#0D4035] outline-none focus:border-[#1A6B5C] focus:ring-1 focus:ring-[#1A6B5C]"
                  />
                </div>
              </div>
            ))}
            {returnLines.length > 0 && (
              <p className="text-xs text-[#64748B]">
                Credit value: Tsh {returnLines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0).toLocaleString()}
              </p>
            )}
          </div>
        )}

        <Button
          className="w-full"
          onClick={() => createMutation.mutate()}
          loading={createMutation.isPending}
          disabled={!selectedOrderId || returnLines.length === 0}
        >
          Submit return request
        </Button>
      </div>
    </Card>
  );
};

// ─── Return card ──────────────────────────────────────────────────────────────

const ReturnCard: React.FC<{ item: WholesaleReturn; isManager: boolean }> = ({ item, isManager }) => {
  const toast = useNotificationStore((s) => s.toast);
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: () => api.patch(`/b2b/returns/${item.id}/approve`).then((r) => r.data.data as WholesaleReturn),
    onSuccess: (updated) => {
      toast.success(`Return approved · Credit note ${updated.creditNoteNumber}`);
      queryClient.invalidateQueries({ queryKey: ['wholesale-returns'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Approval failed'),
  });

  return (
    <div className="rounded-2xl border border-[#D6F0E8] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[item.status]}`}>{item.status}</span>
            <span className="text-xs font-medium text-[#64748B]">{REASON_LABEL[item.reason]}</span>
          </div>
          <p className="mt-1 text-sm text-[#64748B]">Order {item.orderId.slice(-8)} · {fmt(item.createdAt)}</p>
          <p className="text-sm font-semibold text-[#0D4035]">Credit value: Tsh {item.creditAmountTzs.toLocaleString()}</p>
          {item.creditNoteNumber && <p className="text-xs text-[#1A6B5C]">Credit note: {item.creditNoteNumber}</p>}
          {item.resolvedAt && <p className="text-xs text-[#94A3B8]">Resolved {fmt(item.resolvedAt)}</p>}
        </div>
        {isManager && item.status === 'PENDING' && (
          <Button size="sm" leftIcon={<CheckCircle2 size={13} />} onClick={() => approveMutation.mutate()} loading={approveMutation.isPending}>
            Approve
          </Button>
        )}
      </div>
      <div className="mt-3 space-y-1">
        {item.lines.map((line) => (
          <div key={line.productId} className="flex justify-between text-xs text-[#64748B]">
            <span>{line.productId.slice(-8)} × {line.qty}</span>
            <span>Tsh {(line.qty * line.unitPrice).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export const ReturnsPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const isManager = ['OWNER', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'].includes(user?.role ?? '');
  const [showCreate, setShowCreate] = React.useState(false);

  const returnsQuery = useQuery({
    queryKey: ['wholesale-returns'],
    queryFn: () => api.get('/b2b/returns').then((r) => (r.data.data as { data: WholesaleReturn[] }).data),
  });

  const returns = returnsQuery.data ?? [];

  return (
    <WholesaleShell>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-[#0D4035]">Returns</h1>
          {isManager && (
            <Button size="sm" leftIcon={<RotateCcw size={13} />} onClick={() => setShowCreate((s) => !s)}>
              {showCreate ? 'Cancel' : 'New return'}
            </Button>
          )}
        </div>

        {showCreate && isManager && (
          <CreateReturnForm onCreated={() => setShowCreate(false)} />
        )}

        <div className="space-y-3">
          {returnsQuery.isLoading && (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#1A6B5C] border-t-transparent" />
            </div>
          )}
          {!returnsQuery.isLoading && returns.length === 0 && (
            <Card>
              <div className="py-8 text-center">
                <RotateCcw size={32} className="mx-auto text-[#AFDFD3]" />
                <p className="mt-3 text-sm font-medium text-[#0D4035]">No returns yet</p>
                <p className="mt-1 text-xs text-[#64748B]">Return requests from delivered orders appear here.</p>
              </div>
            </Card>
          )}
          {returns.map((item) => (
            <ReturnCard key={item.id} item={item} isManager={isManager} />
          ))}
        </div>
      </div>
    </WholesaleShell>
  );
};
