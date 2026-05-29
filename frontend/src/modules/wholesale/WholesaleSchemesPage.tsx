import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Percent, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type { WholesaleScheme, WholesaleSchemeType } from '@/types';
import { WholesaleShell } from './WholesaleShell';

const SCHEME_TYPE_LABEL: Record<WholesaleSchemeType, string> = {
  PERCENTAGE_DISCOUNT: '% Discount',
  FIXED_DISCOUNT: 'Fixed discount',
  FREE_GOODS: 'Free goods',
};

const SCHEME_TYPE_STYLE: Record<WholesaleSchemeType, string> = {
  PERCENTAGE_DISCOUNT: 'bg-[#EDF7F3] text-[#1A6B5C]',
  FIXED_DISCOUNT: 'bg-blue-50 text-blue-700',
  FREE_GOODS: 'bg-amber-50 text-amber-700',
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-TZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Create form ──────────────────────────────────────────────────────────────

const emptyForm = {
  name: '',
  description: '',
  schemeType: 'PERCENTAGE_DISCOUNT' as WholesaleSchemeType,
  minOrderQty: '1',
  discountPct: '',
  discountTzs: '',
  bonusQty: '',
  validFrom: new Date().toISOString().slice(0, 10),
  validUntil: '',
};

const CreateSchemeForm: React.FC<{ onCreated: () => void }> = ({ onCreated }) => {
  const toast = useNotificationStore((s) => s.toast);
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState(emptyForm);

  const f = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/b2b/schemes', {
        name: form.name.trim(),
        description: form.description.trim() || null,
        schemeType: form.schemeType,
        minOrderQty: parseInt(form.minOrderQty, 10) || 1,
        discountPct: form.schemeType === 'PERCENTAGE_DISCOUNT' && form.discountPct ? parseFloat(form.discountPct) : null,
        discountTzs: form.schemeType === 'FIXED_DISCOUNT' && form.discountTzs ? parseFloat(form.discountTzs) : null,
        bonusQty: form.schemeType === 'FREE_GOODS' && form.bonusQty ? parseInt(form.bonusQty, 10) : null,
        validFrom: form.validFrom || undefined,
        validUntil: form.validUntil || null,
      }).then((r) => r.data.data as WholesaleScheme),
    onSuccess: () => {
      toast.success('Scheme created');
      queryClient.invalidateQueries({ queryKey: ['wholesale-schemes'] });
      setForm(emptyForm);
      onCreated();
    },
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Could not create scheme'),
  });

  const inputCls = 'w-full rounded-xl border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] outline-none focus:border-[#1A6B5C] focus:ring-1 focus:ring-[#1A6B5C]';
  const labelCls = 'mb-1 block text-xs font-medium text-[#64748B]';

  return (
    <Card header={<h2 className="text-base font-semibold text-[#0D4035]">New scheme</h2>}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Name</label>
            <input value={form.name} onChange={f('name')} placeholder="e.g. 10% off Amoxicillin" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <select value={form.schemeType} onChange={f('schemeType')} className={inputCls}>
              {(Object.keys(SCHEME_TYPE_LABEL) as WholesaleSchemeType[]).map((t) => (
                <option key={t} value={t}>{SCHEME_TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Description (optional)</label>
          <input value={form.description} onChange={f('description')} placeholder="Brief description…" className={inputCls} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Min order qty</label>
            <input type="number" min={1} value={form.minOrderQty} onChange={f('minOrderQty')} className={inputCls} />
          </div>
          {form.schemeType === 'PERCENTAGE_DISCOUNT' && (
            <div>
              <label className={labelCls}>Discount %</label>
              <input type="number" min={0} max={100} step="0.1" value={form.discountPct} onChange={f('discountPct')} placeholder="e.g. 10" className={inputCls} />
            </div>
          )}
          {form.schemeType === 'FIXED_DISCOUNT' && (
            <div>
              <label className={labelCls}>Discount (Tsh)</label>
              <input type="number" min={0} value={form.discountTzs} onChange={f('discountTzs')} placeholder="e.g. 5000" className={inputCls} />
            </div>
          )}
          {form.schemeType === 'FREE_GOODS' && (
            <div>
              <label className={labelCls}>Free units</label>
              <input type="number" min={1} value={form.bonusQty} onChange={f('bonusQty')} placeholder="e.g. 2" className={inputCls} />
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Valid from</label>
            <input type="date" value={form.validFrom} onChange={f('validFrom')} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Valid until (optional)</label>
            <input type="date" value={form.validUntil} onChange={f('validUntil')} className={inputCls} />
          </div>
        </div>

        <Button
          className="w-full"
          onClick={() => createMutation.mutate()}
          loading={createMutation.isPending}
          disabled={!form.name.trim()}
        >
          Create scheme
        </Button>
      </div>
    </Card>
  );
};

// ─── Scheme card ──────────────────────────────────────────────────────────────

const SchemeCard: React.FC<{ scheme: WholesaleScheme; isManager: boolean }> = ({ scheme, isManager }) => {
  const toast = useNotificationStore((s) => s.toast);
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: () =>
      scheme.isActive
        ? api.delete(`/b2b/schemes/${scheme.id}`).then((r) => r.data.data)
        : api.patch(`/b2b/schemes/${scheme.id}`, {
            name: scheme.name,
            description: scheme.description,
            minOrderQty: scheme.minOrderQty,
            bonusQty: scheme.bonusQty,
            discountPct: scheme.discountPct,
            discountTzs: scheme.discountTzs,
            isActive: true,
            validFrom: scheme.validFrom,
            validUntil: scheme.validUntil,
          }).then((r) => r.data.data),
    onSuccess: () => {
      toast.success(scheme.isActive ? 'Scheme deactivated' : 'Scheme reactivated');
      queryClient.invalidateQueries({ queryKey: ['wholesale-schemes'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Action failed'),
  });

  return (
    <div className={`rounded-2xl border p-4 ${scheme.isActive ? 'border-[#D6F0E8] bg-white' : 'border-[#E2E8F0] bg-[#F8FAFC] opacity-60'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${SCHEME_TYPE_STYLE[scheme.schemeType]}`}>
              {SCHEME_TYPE_LABEL[scheme.schemeType]}
            </span>
            {!scheme.isActive && (
              <span className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-xs font-medium text-[#64748B]">Inactive</span>
            )}
          </div>
          <p className="text-sm font-semibold text-[#0D4035]">{scheme.name}</p>
          {scheme.description && <p className="text-xs text-[#64748B]">{scheme.description}</p>}
          <div className="flex flex-wrap gap-3 pt-1 text-xs text-[#64748B]">
            {scheme.discountPct != null && <span>{scheme.discountPct}% off</span>}
            {scheme.discountTzs != null && <span>Tsh {scheme.discountTzs.toLocaleString()} off</span>}
            {scheme.bonusQty != null && <span>{scheme.bonusQty} free units</span>}
            <span>Min qty: {scheme.minOrderQty}</span>
            <span>From {fmt(scheme.validFrom)}{scheme.validUntil ? ` → ${fmt(scheme.validUntil)}` : ''}</span>
          </div>
        </div>
        {isManager && (
          <button
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-50"
          >
            {scheme.isActive ? <ToggleRight size={13} className="text-[#1A6B5C]" /> : <ToggleLeft size={13} />}
            {scheme.isActive ? 'Deactivate' : 'Reactivate'}
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export const WholesaleSchemesPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const isManager = ['OWNER', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'].includes(user?.role ?? '');
  const [showCreate, setShowCreate] = React.useState(false);
  const [filter, setFilter] = React.useState<'all' | 'active' | 'inactive'>('active');

  const schemesQuery = useQuery({
    queryKey: ['wholesale-schemes'],
    queryFn: () => api.get('/b2b/schemes').then((r) => r.data.data as WholesaleScheme[]),
  });

  const schemes = (schemesQuery.data ?? []).filter((s) => {
    if (filter === 'active') return s.isActive;
    if (filter === 'inactive') return !s.isActive;
    return true;
  });

  return (
    <WholesaleShell>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-[#0D4035]">Pricing schemes</h1>
          {isManager && (
            <Button size="sm" leftIcon={<Plus size={13} />} onClick={() => setShowCreate((s) => !s)}>
              {showCreate ? 'Cancel' : 'New scheme'}
            </Button>
          )}
        </div>

        {showCreate && isManager && (
          <CreateSchemeForm onCreated={() => setShowCreate(false)} />
        )}

        <div className="flex gap-2">
          {(['active', 'inactive', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                filter === f
                  ? 'border-[#1A6B5C] bg-primary text-white'
                  : 'border-[#D6F0E8] bg-white text-[#475569] hover:bg-[#EDF7F3]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {schemesQuery.isLoading && (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#1A6B5C] border-t-transparent" />
            </div>
          )}
          {!schemesQuery.isLoading && schemes.length === 0 && (
            <Card>
              <div className="py-8 text-center">
                <Percent size={32} className="mx-auto text-[#AFDFD3]" />
                <p className="mt-3 text-sm font-medium text-[#0D4035]">No schemes</p>
                <p className="mt-1 text-xs text-[#64748B]">
                  {filter === 'active'
                    ? 'No active schemes. Create one to apply automatic discounts on new orders.'
                    : 'No schemes match this filter.'}
                </p>
              </div>
            </Card>
          )}
          {schemes.map((s) => (
            <SchemeCard key={s.id} scheme={s} isManager={isManager} />
          ))}
        </div>
      </div>
    </WholesaleShell>
  );
};
