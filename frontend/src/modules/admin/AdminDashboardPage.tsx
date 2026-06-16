import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2, TrendingUp, ShoppingCart, UserPlus,
  AlertTriangle, Clock, Activity, Bell,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { DashboardMetrics, AdminAuditEntry } from './types';
import { STATUS_LABEL, STATUS_STYLE, HEALTH_DOT, fmtDateTime, fmtDate } from './types';

const MetricCard: React.FC<{
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
}> = ({ label, value, sub, icon, accent = 'text-[#1A6B5C]' }) => (
  <div className="rounded-2xl border border-[#D6F0E8] bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#64748B]">{label}</p>
        <p className={`mt-1 text-3xl font-bold ${accent}`}>{value}</p>
        {sub && <p className="mt-0.5 text-xs text-[#94A3B8]">{sub}</p>}
      </div>
      <div className="rounded-xl bg-[#EDF7F3] p-2.5 text-[#1A6B5C]">{icon}</div>
    </div>
  </div>
);

const MiniMrrChart: React.FC<{ trend: Array<{ month: string; totalTzs: number }> }> = ({ trend }) => {
  if (!trend.length) return <div className="h-24 flex items-center justify-center text-xs text-[#94A3B8]">No payment data yet</div>;
  const max = Math.max(...trend.map((t) => t.totalTzs), 1);
  return (
    <div className="flex h-24 items-end gap-1.5">
      {trend.map((t) => (
        <div key={t.month} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-[#2A9478] opacity-80"
            style={{ height: `${Math.max((t.totalTzs / max) * 80, 4)}px` }}
            title={`Tsh ${t.totalTzs.toLocaleString()}`}
          />
          <span className="text-[10px] text-[#94A3B8]">{t.month.slice(5)}</span>
        </div>
      ))}
    </div>
  );
};

export const AdminDashboardPage: React.FC = () => {
  const metricsQuery = useQuery({
    queryKey: ['admin-dashboard-metrics'],
    queryFn: () => api.get('/admin/dashboard/metrics').then((r) => r.data.data as DashboardMetrics),
    staleTime: 60_000,
  });

  const atRiskQuery = useQuery({
    queryKey: ['admin-at-risk'],
    queryFn: () => api.get('/admin/dashboard/at-risk').then((r) => r.data.data as Array<{ id: string; name: string; tier: string; status: string; activityHealth: string }>),
    staleTime: 60_000,
  });

  const auditQuery = useQuery({
    queryKey: ['admin-audit-recent'],
    queryFn: () =>
      api.get('/admin/audit', { params: { limit: 20 } }).then((r) => (r.data.data as { data: AdminAuditEntry[] }).data),
    staleTime: 60_000,
  });

  const m = metricsQuery.data;
  const atRisk = atRiskQuery.data ?? [];
  const auditEntries = auditQuery.data ?? [];

  if (metricsQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1A6B5C] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0D4035]">Platform Overview</h1>
        <p className="text-sm text-[#64748B]">APOTEKH super-admin dashboard</p>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Active pharmacies" value={m?.activePharmacies ?? 0} icon={<Building2 size={18} />} />
        <MetricCard label="MRR" value={`Tsh ${(m?.mrr ?? 0).toLocaleString()}`} sub="from active subscriptions" icon={<TrendingUp size={18} />} />
        <MetricCard label="Transactions this month" value={(m?.transactionsThisMonth ?? 0).toLocaleString()} icon={<ShoppingCart size={18} />} />
        <MetricCard label="New this month" value={m?.newPharmaciesThisMonth ?? 0} icon={<UserPlus size={18} />} />
        <MetricCard
          label="Churned this month"
          value={m?.churnedThisMonth ?? 0}
          icon={<AlertTriangle size={18} />}
          accent={(m?.churnedThisMonth ?? 0) > 0 ? 'text-red-600' : 'text-[#1A6B5C]'}
        />
        <MetricCard
          label="In grace period"
          value={m?.gracePeriodCount ?? 0}
          icon={<Clock size={18} />}
          accent={(m?.gracePeriodCount ?? 0) > 0 ? 'text-amber-600' : 'text-[#1A6B5C]'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* MRR trend */}
          <div className="rounded-2xl border border-[#D6F0E8] bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-[#0D4035]">MRR trend (last 6 months)</h2>
            <MiniMrrChart trend={m?.mrrTrend ?? []} />
          </div>

          {/* Status breakdown */}
          <div className="rounded-2xl border border-[#D6F0E8] bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-[#0D4035]">Pharmacy status breakdown</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {(['ACTIVE', 'TRIAL', 'GRACE', 'SUSPENDED', 'CANCELLED'] as const).map((s) => (
                <div key={s} className="rounded-xl border border-[#E2E8F0] p-3 text-center">
                  <p className="text-2xl font-bold text-[#0D4035]">{m?.statusBreakdown?.[s] ?? 0}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[s]}`}>
                    {STATUS_LABEL[s]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Expiring in 5 days */}
          {(m?.expiringIn5Days?.length ?? 0) > 0 && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-800">
                <Bell size={14} /> Expiring within 5 days ({m!.expiringIn5Days.length})
              </h2>
              <div className="space-y-2">
                {m!.expiringIn5Days.map((p) => {
                  const daysLeft = Math.ceil((new Date(p.trialEndsAt).getTime() - Date.now()) / 86_400_000);
                  return (
                    <div key={p.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-red-100">
                      <Link to={`/superadmin/pharmacies/${p.id}`} className="text-sm font-medium text-[#0D4035] hover:underline">{p.name}</Link>
                      <span className="text-xs font-semibold text-red-700">
                        {daysLeft <= 0 ? 'Today' : `${daysLeft}d left`} · {p.subscriptionTier}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grace accounts */}
          {(m?.gracePeriodPharmacies?.length ?? 0) > 0 && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
                <Clock size={14} /> Grace period accounts ({m!.gracePeriodPharmacies.length})
              </h2>
              <div className="space-y-2">
                {m!.gracePeriodPharmacies.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-amber-100">
                    <Link to={`/superadmin/pharmacies/${p.id}`} className="text-sm font-medium text-[#0D4035] hover:underline">{p.name}</Link>
                    <span className="text-xs text-amber-700">{p.region} · {p.subscriptionTier}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent audit feed */}
          <div className="rounded-2xl border border-[#D6F0E8] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#0D4035]">Recent admin actions</h2>
              <Link to="/superadmin/audit" className="text-xs text-[#1A6B5C] hover:underline">View all</Link>
            </div>
            <div className="space-y-2">
              {auditEntries.length === 0 && (
                <p className="text-xs text-[#94A3B8] py-4 text-center">No actions recorded yet.</p>
              )}
              {auditEntries.slice(0, 10).map((e) => (
                <div key={e.id} className="flex items-start justify-between gap-2 rounded-xl border border-[#F1F5F9] px-3 py-2 text-xs">
                  <div className="min-w-0">
                    <span className="font-mono font-semibold text-[#0D4035]">{e.action}</span>
                    {e.pharmacyName && (
                      <span className="ml-1.5 text-[#64748B]">→ {e.pharmacyName}</span>
                    )}
                    <p className="truncate text-[#94A3B8]">{e.adminEmail}</p>
                  </div>
                  <span className="shrink-0 text-[#94A3B8]">{fmtDateTime(e.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column — at-risk */}
        <div className="rounded-2xl border border-[#D6F0E8] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Activity size={14} className="text-[#1A6B5C]" />
            <h2 className="text-sm font-semibold text-[#0D4035]">At-risk accounts</h2>
          </div>
          {atRisk.length === 0 && (
            <p className="text-xs text-[#94A3B8] py-8 text-center">All accounts showing green activity.</p>
          )}
          <div className="space-y-2">
            {atRisk.map((p) => (
              <Link
                key={p.id}
                to={`/superadmin/pharmacies/${p.id}`}
                className="flex items-center gap-3 rounded-xl border border-[#F1F5F9] px-3 py-2.5 hover:bg-[#EDF7F3] transition-colors"
              >
                <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${HEALTH_DOT[p.activityHealth as 'amber' | 'red']}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#0D4035]">{p.name}</p>
                  <p className="text-xs text-[#64748B]">{p.tier} · {p.status}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
