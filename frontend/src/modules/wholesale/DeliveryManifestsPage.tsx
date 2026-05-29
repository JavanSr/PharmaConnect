import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, MapPin, Truck } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type { DeliveryManifest, WholesaleOrder } from '@/types';
import { WholesaleShell } from './WholesaleShell';

type ManifestStatus = DeliveryManifest['status'];

const STATUS_STYLE: Record<ManifestStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  IN_TRANSIT: 'bg-blue-50 text-blue-700',
  DELIVERED: 'bg-[#EDF7F3] text-[#1A6B5C]',
  PARTIAL: 'bg-purple-50 text-purple-700',
};

const STATUS_LABEL: Record<ManifestStatus, string> = {
  PENDING: 'Pending',
  IN_TRANSIT: 'In transit',
  DELIVERED: 'Delivered',
  PARTIAL: 'Partial',
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-TZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── Create manifest form ─────────────────────────────────────────────────────

type TeamMember = { id: string; name: string; role: string };

const CreateManifestForm: React.FC<{ onCreated: () => void }> = ({ onCreated }) => {
  const toast = useNotificationStore((s) => s.toast);
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState({ deliveryStaffId: '', route: '', vehicleReg: '', notes: '' });
  const [selectedOrderIds, setSelectedOrderIds] = React.useState<Set<string>>(new Set());

  const teamQuery = useQuery({
    queryKey: ['team-members-delivery'],
    queryFn: () => api.get('/settings/team').then((r) => (r.data.data as TeamMember[]).filter((m) => m.role === 'DELIVERY_STAFF')),
  });

  const ordersQuery = useQuery({
    queryKey: ['wholesale-orders-full'],
    queryFn: () => api.get('/b2b/orders').then((r) => r.data.data as WholesaleOrder[]),
  });

  const dispatchableOrders = (ordersQuery.data ?? []).filter((o) => o.status === 'PACKED' || o.status === 'DISPATCHED');

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/b2b/manifests', {
        deliveryStaffId: form.deliveryStaffId,
        orderIds: Array.from(selectedOrderIds),
        route: form.route,
        vehicleReg: form.vehicleReg || null,
        notes: form.notes || null,
      }).then((r) => r.data.data as DeliveryManifest),
    onSuccess: () => {
      toast.success('Manifest created');
      queryClient.invalidateQueries({ queryKey: ['delivery-manifests'] });
      setForm({ deliveryStaffId: '', route: '', vehicleReg: '', notes: '' });
      setSelectedOrderIds(new Set());
      onCreated();
    },
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Could not create manifest'),
  });

  function toggleOrder(id: string) {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const canSubmit = form.deliveryStaffId && form.route && selectedOrderIds.size > 0;

  return (
    <Card header={<h2 className="text-base font-semibold text-[#0D4035]">Create delivery manifest</h2>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#64748B]">Delivery staff</label>
            <select
              value={form.deliveryStaffId}
              onChange={(e) => setForm((f) => ({ ...f, deliveryStaffId: e.target.value }))}
              className="w-full rounded-xl border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] outline-none focus:border-[#1A6B5C] focus:ring-1 focus:ring-[#1A6B5C]"
            >
              <option value="">Select driver…</option>
              {(teamQuery.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            {teamQuery.data?.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">
                No delivery staff found.{' '}
                <Link to="/settings/team" className="font-semibold underline">Invite a team member</Link>
                {' '}with the DELIVERY_STAFF role first.
              </p>
            )}
          </div>
          <Input label="Route / area" placeholder="Arusha CBD route A" value={form.route} onChange={(e) => setForm((f) => ({ ...f, route: e.target.value }))} />
          <Input label="Vehicle reg (optional)" placeholder="T 123 ABC" value={form.vehicleReg} onChange={(e) => setForm((f) => ({ ...f, vehicleReg: e.target.value }))} />
          <Input label="Notes (optional)" placeholder="Call buyer before arriving" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#64748B]">
            Select orders to include ({selectedOrderIds.size} selected)
          </p>
          {dispatchableOrders.length === 0 && (
            <p className="text-sm text-[#64748B]">No Packed or Dispatched orders available. Confirm and pack orders first.</p>
          )}
          <div className="space-y-2">
            {dispatchableOrders.map((order) => (
              <label key={order.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${selectedOrderIds.has(order.id) ? 'border-[#1A6B5C] bg-[#EDF7F3]' : 'border-[#D6F0E8] hover:bg-[#F7FCFA]'}`}>
                <input
                  type="checkbox"
                  checked={selectedOrderIds.has(order.id)}
                  onChange={() => toggleOrder(order.id)}
                  className="mt-0.5 accent-[#1A6B5C]"
                />
                <div>
                  <p className="text-sm font-medium text-[#0D4035]">{order.orderNumber}</p>
                  <p className="text-xs text-[#64748B]">{order.items.length} items · Tsh {order.totalAmount.toLocaleString()}</p>
                  {order.scheduledDeliveryAt && (
                    <p className="text-xs text-[#1A6B5C]">Scheduled {fmt(order.scheduledDeliveryAt)}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} className="w-full">
          Create manifest
        </Button>
      </div>
    </Card>
  );
};

// ─── Manifest card ────────────────────────────────────────────────────────────

const ManifestCard: React.FC<{ manifest: DeliveryManifest; isDeliveryStaff: boolean; onUpdated: () => void }> = ({ manifest, isDeliveryStaff, onUpdated }) => {
  const toast = useNotificationStore((s) => s.toast);
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = React.useState(false);
  const [deliveredIds, setDeliveredIds] = React.useState<Set<string>>(new Set());

  const detailQuery = useQuery({
    queryKey: ['manifest-detail', manifest.id],
    queryFn: () => api.get(`/b2b/manifests/${manifest.id}`).then((r) => r.data.data as DeliveryManifest),
    enabled: expanded,
  });

  const departMutation = useMutation({
    mutationFn: () => api.patch(`/b2b/manifests/${manifest.id}/depart`).then((r) => r.data.data as DeliveryManifest),
    onSuccess: () => { toast.success('Manifest departed — in transit'); queryClient.invalidateQueries({ queryKey: ['delivery-manifests'] }); onUpdated(); },
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Could not depart'),
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      api.patch(`/b2b/manifests/${manifest.id}/complete`, { deliveredOrderIds: Array.from(deliveredIds) }).then((r) => r.data.data as DeliveryManifest),
    onSuccess: (updated) => {
      toast.success(updated.status === 'DELIVERED' ? 'All orders delivered' : 'Manifest completed (partial)');
      queryClient.invalidateQueries({ queryKey: ['delivery-manifests'] });
      queryClient.invalidateQueries({ queryKey: ['wholesale-orders-full'] });
      onUpdated();
    },
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Could not complete manifest'),
  });

  const orderDetails = detailQuery.data?.orderDetails ?? [];
  const allOrderIds = manifest.orders;

  return (
    <div className="rounded-2xl border border-[#D6F0E8] bg-white">
      <div className="flex flex-wrap items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[manifest.status]}`}>
              {STATUS_LABEL[manifest.status]}
            </span>
            <p className="font-semibold text-[#0D4035]">{manifest.route}</p>
          </div>
          <p className="mt-1 text-sm text-[#64748B]">
            {manifest.deliveryStaffName ?? 'Driver'} · {allOrderIds.length} order{allOrderIds.length !== 1 ? 's' : ''}
            {manifest.vehicleReg && ` · ${manifest.vehicleReg}`}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-[#94A3B8]">
            <span>Created {fmt(manifest.createdAt)}</span>
            {manifest.departedAt && <span>Departed {fmt(manifest.departedAt)}</span>}
            {manifest.completedAt && <span>Completed {fmt(manifest.completedAt)}</span>}
          </div>
          {manifest.notes && <p className="mt-1 text-xs text-[#64748B]">{manifest.notes}</p>}
        </div>

        <div className="flex gap-2 shrink-0 flex-wrap">
          {manifest.status === 'PENDING' && (
            <Button size="sm" leftIcon={<Truck size={13} />} onClick={() => departMutation.mutate()} loading={departMutation.isPending}>
              Depart
            </Button>
          )}
          {manifest.status === 'IN_TRANSIT' && (
            <Button size="sm" onClick={() => setExpanded(true)}>
              Complete
            </Button>
          )}
          <button
            onClick={() => setExpanded((s) => !s)}
            className="inline-flex items-center gap-1 rounded-full border border-[#D6F0E8] px-3 py-1.5 text-xs text-[#64748B] hover:bg-[#EDF7F3]"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Hide' : 'Orders'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#D6F0E8] px-4 pb-4">
          {detailQuery.isLoading && <p className="py-3 text-sm text-[#64748B]">Loading…</p>}
          <div className="mt-3 space-y-2">
            {orderDetails.map((order) => (
              <label key={order.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${deliveredIds.has(order.id) ? 'border-[#1A6B5C] bg-[#EDF7F3]' : 'border-[#D6F0E8]'}`}>
                {manifest.status === 'IN_TRANSIT' && (
                  <input
                    type="checkbox"
                    checked={deliveredIds.has(order.id)}
                    onChange={() => setDeliveredIds((prev) => { const n = new Set(prev); n.has(order.id) ? n.delete(order.id) : n.add(order.id); return n; })}
                    className="mt-0.5 accent-[#1A6B5C]"
                  />
                )}
                <div>
                  <p className="text-sm font-medium text-[#0D4035]">{order.orderNumber}</p>
                  <p className="text-xs text-[#64748B]">{order.items.length} items</p>
                </div>
              </label>
            ))}
            {orderDetails.length === 0 && allOrderIds.length > 0 && !detailQuery.isLoading && (
              <p className="text-xs text-[#94A3B8]">{allOrderIds.length} order IDs attached — details load on expand.</p>
            )}
          </div>

          {manifest.status === 'IN_TRANSIT' && (
            <div className="mt-4">
              <Button
                onClick={() => completeMutation.mutate()}
                loading={completeMutation.isPending}
                disabled={deliveredIds.size === 0}
                className="w-full"
              >
                Mark {deliveredIds.size} of {allOrderIds.length} delivered
              </Button>
              <p className="mt-1 text-center text-xs text-[#94A3B8]">
                Tick the orders that were successfully delivered. Unticked orders stay open.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export const DeliveryManifestsPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const isManager = ['OWNER', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'].includes(user?.role ?? '');
  const isDeliveryStaff = user?.role === 'DELIVERY_STAFF';
  const [showCreate, setShowCreate] = React.useState(false);

  const manifestsQuery = useQuery({
    queryKey: ['delivery-manifests'],
    queryFn: () => api.get('/b2b/manifests').then((r) => r.data.data as DeliveryManifest[]),
  });

  const manifests = manifestsQuery.data ?? [];

  return (
    <WholesaleShell>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-[#0D4035]">Delivery manifests</h1>
          {isManager && (
            <Button size="sm" leftIcon={<MapPin size={13} />} onClick={() => setShowCreate((s) => !s)}>
              {showCreate ? 'Cancel' : 'New manifest'}
            </Button>
          )}
        </div>

        {showCreate && isManager && (
          <CreateManifestForm onCreated={() => setShowCreate(false)} />
        )}

        <div className="space-y-3">
          {manifestsQuery.isLoading && (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#1A6B5C] border-t-transparent" />
            </div>
          )}
          {!manifestsQuery.isLoading && manifests.length === 0 && (
            <Card>
              <div className="py-8 text-center">
                <Truck size={32} className="mx-auto text-[#AFDFD3]" />
                <p className="mt-3 text-sm font-medium text-[#0D4035]">No delivery manifests yet</p>
                <p className="mt-1 text-xs text-[#64748B]">
                  {isManager ? 'Create a manifest to assign packed orders to a driver.' : 'Manifests assigned to you will appear here.'}
                </p>
              </div>
            </Card>
          )}
          {manifests.map((manifest) => (
            <ManifestCard
              key={manifest.id}
              manifest={manifest}
              isDeliveryStaff={isDeliveryStaff}
              onUpdated={() => manifestsQuery.refetch()}
            />
          ))}
        </div>
      </div>
    </WholesaleShell>
  );
};
