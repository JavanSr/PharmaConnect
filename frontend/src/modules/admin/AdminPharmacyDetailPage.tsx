import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ExternalLink, CheckCircle, AlertTriangle,
  CreditCard, Activity, Users, FileText,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';
import type {
  AdminPharmacyDetail, AdminPayment, PharmacyUsage, PharmacyStatus, SubscriptionTier,
} from './types';
import {
  STATUS_LABEL, STATUS_STYLE, HEALTH_DOT, TIERS, STATUSES,
  fmtDate, fmtDateTime, daysAgo,
} from './types';

const inputCls = 'w-full rounded-xl border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] outline-none focus:border-[#1A6B5C] focus:ring-1 focus:ring-[#1A6B5C] bg-white';
const labelCls = 'mb-1 block text-xs font-medium text-[#64748B]';

const ConfirmModal: React.FC<{
  title: string; body: string; onConfirm: () => void; onCancel: () => void; danger?: boolean;
}> = ({ title, body, onConfirm, onCancel, danger }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="w-full max-w-sm rounded-2xl border border-[#D6F0E8] bg-white p-6 shadow-xl">
      <h3 className="text-base font-semibold text-[#0D4035]">{title}</h3>
      <p className="mt-2 text-sm text-[#64748B]">{body}</p>
      <div className="mt-5 flex justify-end gap-3">
        <button onClick={onCancel} className="rounded-xl border border-[#D6F0E8] px-4 py-2 text-sm text-[#475569] hover:bg-[#F8FAFC]">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1A6B5C] hover:bg-[#145748]'}`}
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
);

// ─── Actions panel ────────────────────────────────────────────────────────────

const ActionsPanel: React.FC<{ pharmacy: AdminPharmacyDetail; onRefresh: () => void }> = ({ pharmacy, onRefresh }) => {
  const toast = useNotificationStore((s) => s.toast);
  const [tierVal, setTierVal] = React.useState(pharmacy.tier as string);
  const [statusVal, setStatusVal] = React.useState(pharmacy.status as string);
  const [expiryVal, setExpiryVal] = React.useState(pharmacy.trialEndsAt?.slice(0, 10) ?? '');
  const [notesVal, setNotesVal] = React.useState(pharmacy.internalNotes ?? '');
  const [confirm, setConfirm] = React.useState<{ title: string; body: string; action: () => void; danger?: boolean } | null>(null);

  const patch = async (path: string, body: object, label: string) => {
    try {
      await api.patch(`/admin/pharmacies/${pharmacy.id}/${path}`, body);
      toast.success(label);
      onRefresh();
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? `${label} failed`);
    }
  };

  const handleImpersonate = async () => {
    try {
      const res = await api.post(`/admin/pharmacies/${pharmacy.id}/impersonate`);
      const { token, pharmacyName, ownerName } = res.data.data;
      const url = `${window.location.origin}/?impersonation_token=${token}&impersonation_name=${encodeURIComponent(ownerName)}&impersonation_pharmacy=${encodeURIComponent(pharmacyName)}`;
      window.open(url, '_blank', 'noopener');
      toast.success(`Opened ${pharmacyName} as ${ownerName} (15 min session)`);
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Impersonation failed');
    }
  };

  return (
    <>
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          body={confirm.body}
          danger={confirm.danger}
          onConfirm={() => { confirm.action(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="space-y-4">
        {/* Change tier */}
        <div className="rounded-2xl border border-[#D6F0E8] bg-white p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#64748B]">Subscription</p>
          <div>
            <label className={labelCls}>Tier</label>
            <select value={tierVal} onChange={(e) => setTierVal(e.target.value)} className={inputCls}>
              {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button
            onClick={() => setConfirm({
              title: 'Change tier',
              body: `Set ${pharmacy.name} to ${tierVal}? This will mark the account as ACTIVE.`,
              action: () => patch('tier', { tier: tierVal }, 'Tier updated'),
            })}
            className="w-full rounded-xl bg-[#1A6B5C] py-2 text-sm font-semibold text-white hover:bg-[#145748]"
          >
            Apply tier change
          </button>

          <div>
            <label className={labelCls}>Status</label>
            <select value={statusVal} onChange={(e) => setStatusVal(e.target.value)} className={inputCls}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <button
            onClick={() => setConfirm({
              title: 'Change status',
              body: `Set ${pharmacy.name} to ${statusVal}?`,
              danger: statusVal === 'SUSPENDED' || statusVal === 'CANCELLED',
              action: () => patch('status', { status: statusVal }, 'Status updated'),
            })}
            className="w-full rounded-xl border border-[#D6F0E8] py-2 text-sm font-medium text-[#0D4035] hover:bg-[#F8FAFC]"
          >
            Apply status change
          </button>

          <div>
            <label className={labelCls}>Set expiry date</label>
            <input type="date" value={expiryVal} onChange={(e) => setExpiryVal(e.target.value)} className={inputCls} />
          </div>
          <button
            onClick={() => expiryVal && patch('expiry', { expiresAt: expiryVal }, 'Expiry updated')}
            disabled={!expiryVal}
            className="w-full rounded-xl border border-[#D6F0E8] py-2 text-sm font-medium text-[#0D4035] hover:bg-[#F8FAFC] disabled:opacity-40"
          >
            Set expiry
          </button>
        </div>

        {/* Internal notes */}
        <div className="rounded-2xl border border-[#D6F0E8] bg-white p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#64748B]">Internal notes</p>
          <textarea
            value={notesVal}
            onChange={(e) => setNotesVal(e.target.value)}
            rows={4}
            className={`${inputCls} resize-none`}
            placeholder="Notes visible only in admin panel…"
          />
          <button
            onClick={() => patch('notes', { notes: notesVal || null }, 'Notes saved')}
            className="w-full rounded-xl border border-[#D6F0E8] py-2 text-sm font-medium text-[#0D4035] hover:bg-[#F8FAFC]"
          >
            Save notes
          </button>
        </div>

        {/* Impersonation */}
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-800">Impersonate</p>
          <p className="text-xs text-amber-700">Opens a read-only 15-minute session as the pharmacy owner in a new tab.</p>
          <button
            onClick={() => setConfirm({
              title: 'Impersonate pharmacy',
              body: `Open ${pharmacy.name} as ${pharmacy.owner?.name ?? 'owner'} in a new tab? Session is read-only and expires in 15 minutes.`,
              danger: true,
              action: handleImpersonate,
            })}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            <ExternalLink size={13} /> Open as owner
          </button>
        </div>

        {/* Reset PIN */}
        {pharmacy.staff.length > 0 && (
          <div className="rounded-2xl border border-[#D6F0E8] bg-white p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#64748B]">Reset staff PIN</p>
            {pharmacy.staff.map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#0D4035]">{s.name}</p>
                  <p className="text-xs text-[#94A3B8]">{s.role}</p>
                </div>
                <button
                  onClick={() => setConfirm({
                    title: 'Reset PIN',
                    body: `Clear PIC PIN for ${s.name}?`,
                    action: async () => {
                      try {
                        await api.post(`/admin/pharmacies/${pharmacy.id}/reset-pin/${s.id}`);
                        toast.success(`PIN cleared for ${s.name}`);
                      } catch (e: any) {
                        toast.error(e.response?.data?.error ?? 'Failed');
                      }
                    },
                  })}
                  className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-medium text-[#475569] hover:bg-[#F8FAFC]"
                >
                  Reset PIN
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

// ─── Payments tab ─────────────────────────────────────────────────────────────

const PaymentsTab: React.FC<{ pharmacyId: string }> = ({ pharmacyId }) => {
  const toast = useNotificationStore((s) => s.toast);
  const qc = useQueryClient();
  const [form, setForm] = React.useState({ amountTzs: '', paymentDate: new Date().toISOString().slice(0, 10), method: 'mpesa', reference: '', notes: '' });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['admin-payments', pharmacyId],
    queryFn: () => api.get(`/admin/pharmacies/${pharmacyId}/payments`).then((r) => r.data.data as AdminPayment[]),
  });

  const logMutation = useMutation({
    mutationFn: () =>
      api.post(`/admin/pharmacies/${pharmacyId}/payments`, {
        amountTzs: parseInt(form.amountTzs, 10),
        paymentDate: form.paymentDate,
        method: form.method,
        reference: form.reference || null,
        notes: form.notes || null,
      }),
    onSuccess: () => {
      toast.success('Payment logged');
      qc.invalidateQueries({ queryKey: ['admin-payments', pharmacyId] });
      setForm({ amountTzs: '', paymentDate: new Date().toISOString().slice(0, 10), method: 'mpesa', reference: '', notes: '' });
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Failed'),
  });

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#D6F0E8] bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-[#0D4035]">Log manual payment</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Amount (Tsh)</label>
            <input type="number" min={1} value={form.amountTzs} onChange={f('amountTzs')} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Date</label>
            <input type="date" value={form.paymentDate} onChange={f('paymentDate')} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Method</label>
            <select value={form.method} onChange={f('method')} className={inputCls}>
              <option value="mpesa">M-Pesa</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank transfer</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Reference</label>
            <input value={form.reference} onChange={f('reference')} className={inputCls} placeholder="Transaction ref…" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Notes</label>
            <input value={form.notes} onChange={f('notes')} className={inputCls} placeholder="Optional notes…" />
          </div>
        </div>
        <button
          className="mt-4 w-full rounded-xl bg-[#1A6B5C] py-2 text-sm font-semibold text-white hover:bg-[#145748] disabled:opacity-40"
          onClick={() => logMutation.mutate()}
          disabled={!form.amountTzs || logMutation.isPending}
        >
          {logMutation.isPending ? 'Saving…' : 'Log payment'}
        </button>
      </div>

      <div className="rounded-2xl border border-[#D6F0E8] bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              {['Date', 'Amount', 'Method', 'Reference', 'Notes', 'Logged by'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-[#64748B]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="py-8 text-center text-sm text-[#94A3B8]">Loading…</td></tr>}
            {!isLoading && payments.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-sm text-[#94A3B8]">No payments logged yet.</td></tr>
            )}
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-[#F1F5F9]">
                <td className="px-4 py-3 text-[#475569]">{fmtDate(p.paymentDate)}</td>
                <td className="px-4 py-3 font-semibold text-[#0D4035]">Tsh {p.amountTzs.toLocaleString()}</td>
                <td className="px-4 py-3 text-[#475569] uppercase text-xs">{p.method}</td>
                <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{p.reference ?? '—'}</td>
                <td className="px-4 py-3 text-[#64748B]">{p.notes ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-[#94A3B8]">{p.loggedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Usage tab ────────────────────────────────────────────────────────────────

const UsageTab: React.FC<{ pharmacyId: string }> = ({ pharmacyId }) => {
  const { data: usage, isLoading } = useQuery({
    queryKey: ['admin-usage', pharmacyId],
    queryFn: () => api.get(`/admin/pharmacies/${pharmacyId}/usage`).then((r) => r.data.data as PharmacyUsage),
    staleTime: 60_000,
  });

  if (isLoading) return <div className="py-12 text-center text-sm text-[#94A3B8]">Loading usage data…</div>;
  if (!usage) return null;

  const days = (iso: string | null) => {
    const d = daysAgo(iso);
    if (d === null) return '—';
    if (d === 0) return 'Today';
    return `${d}d ago`;
  };

  const health = (() => {
    const latestLogin = usage.staff.reduce<string | null>((best, s) => {
      if (!s.lastLogin) return best;
      if (!best) return s.lastLogin;
      return s.lastLogin > best ? s.lastLogin : best;
    }, null);
    const d = daysAgo(latestLogin);
    if (d === null || d > 21) return 'red';
    if (d > 7) return 'amber';
    return 'green';
  })();

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total transactions', value: usage.totalTransactions.toLocaleString() },
          { label: 'Last 30 days', value: usage.transactions30d.toLocaleString() },
          { label: 'Last 7 days', value: usage.transactions7d.toLocaleString() },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-[#D6F0E8] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#64748B]">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-[#0D4035]">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Health + features */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#D6F0E8] bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${HEALTH_DOT[health]}`} />
            <p className="text-sm font-semibold text-[#0D4035]">
              Activity health — <span className="capitalize">{health}</span>
            </p>
          </div>
          <p className="text-xs text-[#64748B]">
            {health === 'green' && 'Login activity within the last 7 days.'}
            {health === 'amber' && 'No login activity in 8–21 days.'}
            {health === 'red' && 'No login activity for 21+ days. At churn risk.'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#D6F0E8] bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-[#0D4035]">Features used (ever)</p>
          <div className="space-y-1.5">
            {usage.featuresUsed.map((f) => (
              <div key={f.key} className="flex items-center gap-2">
                {f.used
                  ? <CheckCircle size={14} className="shrink-0 text-[#1A6B5C]" />
                  : <div className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[#D6F0E8]" />}
                <span className={`text-xs ${f.used ? 'text-[#0D4035]' : 'text-[#94A3B8]'}`}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff table */}
      <div className="rounded-2xl border border-[#D6F0E8] bg-white overflow-hidden">
        <div className="border-b border-[#E2E8F0] px-5 py-3">
          <p className="text-sm font-semibold text-[#0D4035]">Staff activity</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              {['Name', 'Role', 'Last login', 'Active (30d)'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-[#64748B]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usage.staff.map((s) => (
              <tr key={s.id} className="border-b border-[#F1F5F9]">
                <td className="px-4 py-3 font-medium text-[#0D4035]">{s.name}</td>
                <td className="px-4 py-3 text-xs text-[#64748B]">{s.role}</td>
                <td className="px-4 py-3 text-[#475569]">{days(s.lastLogin)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.activeInLast30d ? 'bg-[#EDF7F3] text-[#1A6B5C]' : 'bg-[#F1F5F9] text-[#94A3B8]'}`}>
                    {s.activeInLast30d ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'identity' | 'payments' | 'usage';

export const AdminPharmacyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = React.useState<Tab>('identity');
  const qc = useQueryClient();

  const { data: pharmacy, isLoading } = useQuery({
    queryKey: ['admin-pharmacy-detail', id],
    queryFn: () => api.get(`/admin/pharmacies/${id}`).then((r) => r.data.data as AdminPharmacyDetail),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1A6B5C] border-t-transparent" />
      </div>
    );
  }

  if (!pharmacy) return <p className="text-sm text-red-600">Pharmacy not found.</p>;

  const days = daysAgo(pharmacy.lastLogin);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <Link to="/superadmin/pharmacies" className="mt-1 rounded-lg border border-[#D6F0E8] p-1.5 text-[#475569] hover:bg-[#EDF7F3]">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0D4035]">{pharmacy.name}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[pharmacy.status as PharmacyStatus]}`}>
              {STATUS_LABEL[pharmacy.status as PharmacyStatus]}
            </span>
            <div className={`h-2.5 w-2.5 rounded-full ${HEALTH_DOT[pharmacy.activityHealth]}`} title={`Activity: ${pharmacy.activityHealth}`} />
          </div>
          <p className="text-sm text-[#64748B]">
            {pharmacy.licenceNumber} · {pharmacy.region} · {pharmacy.tier}
            {pharmacy.isHybrid && ' · Hybrid'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        {/* Main content */}
        <div className="space-y-5">
          {/* Tabs */}
          <div className="flex gap-1 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1 w-fit">
            {([
              ['identity', 'Identity & subscription', <FileText size={13} />],
              ['payments', 'Payment log', <CreditCard size={13} />],
              ['usage', 'Usage metrics', <Activity size={13} />],
            ] as const).map(([t, label, icon]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === t ? 'bg-white text-[#0D4035] shadow-sm' : 'text-[#64748B] hover:text-[#0D4035]'
                }`}
              >
                {icon}{label}
              </button>
            ))}
          </div>

          {tab === 'identity' && (
            <div className="space-y-5">
              {/* Identity */}
              <div className="rounded-2xl border border-[#D6F0E8] bg-white p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-[#64748B]">Identity</p>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['Pharmacy name', pharmacy.name],
                    ['Licence number', pharmacy.licenceNumber],
                    ['Address', pharmacy.address],
                    ['Region', pharmacy.region],
                    ['Type', pharmacy.pharmacyType],
                    ['Owner', pharmacy.owner?.name ?? '—'],
                    ['Owner email', pharmacy.owner?.email ?? '—'],
                    ['Owner phone', pharmacy.owner?.phone ?? '—'],
                    ['Last owner login', pharmacy.owner?.lastLogin ? fmtDateTime(pharmacy.owner.lastLogin) : '—'],
                    ['Onboarded', fmtDate(pharmacy.onboardedAt)],
                  ].map(([dt, dd]) => (
                    <div key={dt}>
                      <dt className="text-xs text-[#94A3B8]">{dt}</dt>
                      <dd className="text-sm font-medium text-[#0D4035]">{dd}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Subscription */}
              <div className="rounded-2xl border border-[#D6F0E8] bg-white p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-[#64748B]">Subscription</p>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['Tier', pharmacy.tier],
                    ['Status', STATUS_LABEL[pharmacy.status as PharmacyStatus]],
                    ['Billing cycle', pharmacy.billingCycle],
                    ['Expires / paid until', fmtDate(pharmacy.trialEndsAt)],
                    ['Grace activated', pharmacy.graceActivatedAt ? fmtDate(pharmacy.graceActivatedAt) : '—'],
                    ['Trial active', pharmacy.trialActive ? 'Yes' : 'No'],
                    ['User limit', String(pharmacy.userLimit)],
                    ['VFD enabled', pharmacy.vfdEnabled ? 'Yes' : 'No'],
                  ].map(([dt, dd]) => (
                    <div key={dt}>
                      <dt className="text-xs text-[#94A3B8]">{dt}</dt>
                      <dd className="text-sm font-medium text-[#0D4035]">{dd}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Staff */}
              {pharmacy.staff.length > 0 && (
                <div className="rounded-2xl border border-[#D6F0E8] bg-white p-5">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-[#64748B]">Staff ({pharmacy.staff.length})</p>
                  <div className="space-y-2">
                    {pharmacy.staff.map((s) => (
                      <div key={s.id} className="flex items-center justify-between rounded-xl border border-[#F1F5F9] px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-[#0D4035]">{s.name}</p>
                          <p className="text-xs text-[#94A3B8]">{s.role} · {s.email}</p>
                        </div>
                        <span className="text-xs text-[#64748B]">
                          {s.lastLogin ? `${daysAgo(s.lastLogin)}d ago` : 'Never'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pharmacy.internalNotes && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-amber-700">Internal notes</p>
                  <p className="text-sm text-amber-900 whitespace-pre-wrap">{pharmacy.internalNotes}</p>
                </div>
              )}
            </div>
          )}

          {tab === 'payments' && <PaymentsTab pharmacyId={pharmacy.id} />}
          {tab === 'usage' && <UsageTab pharmacyId={pharmacy.id} />}
        </div>

        {/* Actions panel */}
        <ActionsPanel
          pharmacy={pharmacy}
          onRefresh={() => qc.invalidateQueries({ queryKey: ['admin-pharmacy-detail', id] })}
        />
      </div>
    </div>
  );
};
