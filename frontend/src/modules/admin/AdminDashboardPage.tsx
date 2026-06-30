import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2, TrendingUp, ShoppingCart, UserPlus,
  AlertTriangle, Clock, Activity, Bell,
  ShieldAlert, ShieldCheck, Users, Zap, UserX,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { DashboardMetrics, AdminAuditEntry } from './types';
import { STATUS_LABEL, STATUS_STYLE, HEALTH_DOT, fmtDateTime } from './types';

const MetricCard: React.FC<{
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
  to?: string;
}> = ({ label, value, sub, icon, accent = 'text-[#1A6B5C]', to }) => {
  const inner = (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#64748B]">{label}</p>
        <p className={`mt-1 text-3xl font-bold ${accent}`}>{value}</p>
        {sub && <p className="mt-0.5 text-xs text-[#94A3B8]">{sub}</p>}
      </div>
      <div className="rounded-xl bg-[#EDF7F3] p-2.5 text-[#1A6B5C]">{icon}</div>
    </div>
  );
  if (to) {
    return (
      <Link to={to} className="block rounded-2xl border border-[#D6F0E8] bg-white p-5 shadow-sm hover:border-[#1A6B5C] hover:shadow-md transition-shadow">
        {inner}
      </Link>
    );
  }
  return <div className="rounded-2xl border border-[#D6F0E8] bg-white p-5 shadow-sm">{inner}</div>;
};

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

const RateBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-[#64748B]">{label}</span>
      <span className="font-semibold text-[#0D4035]">{value}%</span>
    </div>
    <div className="h-2 rounded-full bg-[#EDF7F3]">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  </div>
);

const FunnelStep: React.FC<{ label: string; value: number; rate?: number; color: string }> = ({ label, value, rate, color }) => (
  <div className="flex items-center gap-3">
    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
    <div className="flex-1">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-[#0D4035]">{label}</span>
        <span className="text-lg font-bold text-[#0D4035]">{value.toLocaleString()}</span>
      </div>
      {rate !== undefined && (
        <div className="mt-0.5 h-1.5 rounded-full bg-[#EDF7F3]">
          <div className={`h-1.5 rounded-full ${color} opacity-70`} style={{ width: `${Math.min(rate, 100)}%` }} />
        </div>
      )}
    </div>
    {rate !== undefined && <span className="text-xs font-semibold text-[#64748B] w-10 text-right">{rate}%</span>}
  </div>
);

const FEATURE_LABELS: Record<string, string> = {
  'medicine_info_view': 'Medicine Info (ⓘ button)',
  'clinical_decision_support': 'Clinical Decision Support',
  'dose_calculator': 'Dose Calculator',
  'forecasting_stockout': 'Stockout Forecast',
  'forecasting_dead_stock': 'Dead Stock Forecast',
  'forecasting_seasonality': 'Seasonality',
  'ai_agents': 'AI Agents',
  'barcode_scan': 'Barcode Scan',
  'catalogue_import': 'Catalogue Import',
  'knowledge_hub': 'Knowledge Hub',
  'supplier_discovery': 'Supplier Discovery',
  'dispensing_returns': 'Dispensing Returns',
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

  const safetyQuery = useQuery({
    queryKey: ['admin-clinical-safety'],
    queryFn: () => api.get('/admin/dashboard/clinical-safety').then((r) => r.data.data),
    staleTime: 120_000,
  });

  const funnelQuery = useQuery({
    queryKey: ['admin-trial-funnel'],
    queryFn: () => api.get('/admin/dashboard/trial-funnel').then((r) => r.data.data),
    staleTime: 120_000,
  });

  const activityQuery = useQuery({
    queryKey: ['admin-network-activity'],
    queryFn: () => api.get('/admin/dashboard/network-activity').then((r) => r.data.data),
    staleTime: 120_000,
  });

  const m = metricsQuery.data;
  const atRisk = atRiskQuery.data ?? [];
  const auditEntries = auditQuery.data ?? [];
  const safety = safetyQuery.data;
  const funnel = funnelQuery.data;
  const activity = activityQuery.data;

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

      {/* Core metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Active pharmacies" value={m?.activePharmacies ?? 0} icon={<Building2 size={18} />} to="/superadmin/pharmacies?status=ACTIVE" />
        <MetricCard label="MRR" value={`Tsh ${(m?.mrr ?? 0).toLocaleString()}`} sub="from active subscriptions" icon={<TrendingUp size={18} />} to="/superadmin/founder" />
        <MetricCard label="Transactions this month" value={(m?.transactionsThisMonth ?? 0).toLocaleString()} icon={<ShoppingCart size={18} />} to="/superadmin/pharmacies" />
        <MetricCard label="New this month" value={m?.newPharmaciesThisMonth ?? 0} icon={<UserPlus size={18} />} to="/superadmin/pharmacies" />
        <MetricCard
          label="Churned this month"
          value={m?.churnedThisMonth ?? 0}
          icon={<AlertTriangle size={18} />}
          accent={(m?.churnedThisMonth ?? 0) > 0 ? 'text-red-600' : 'text-[#1A6B5C]'}
          to="/superadmin/pharmacies?status=CANCELLED"
        />
        <MetricCard
          label="In grace period"
          value={m?.gracePeriodCount ?? 0}
          icon={<Clock size={18} />}
          accent={(m?.gracePeriodCount ?? 0) > 0 ? 'text-amber-600' : 'text-[#1A6B5C]'}
          to="/superadmin/pharmacies?status=GRACE"
        />
      </div>

      {/* ── Clinical Safety + Trial Funnel ── */}
      <div className="grid gap-6 xl:grid-cols-2">

        {/* Clinical safety metrics */}
        <div className="rounded-2xl border border-[#D6F0E8] bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert size={15} className="text-[#1A6B5C]" />
            <h2 className="text-sm font-semibold text-[#0D4035]">Clinical Safety — last 30 days</h2>
          </div>

          {safetyQuery.isLoading ? (
            <div className="h-32 animate-pulse rounded-xl bg-[#EDF7F3]" />
          ) : safety ? (
            <>
              {/* Headline numbers */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-[#EDF7F3] p-3 text-center">
                  <p className="text-2xl font-bold text-[#1A6B5C]">{safety.totalAlerts30d.toLocaleString()}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B] mt-0.5">Alerts fired</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">{safety.totalOverrides30d.toLocaleString()}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 mt-0.5">Overridden</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">
                    {(safety.totalAlerts30d - safety.totalOverrides30d).toLocaleString()}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 mt-0.5">Heeded</p>
                </div>
              </div>

              {/* Rates */}
              <div className="space-y-2.5">
                <RateBar label="Compliance rate (alert heeded)" value={safety.complianceRate30d} color="bg-emerald-500" />
                <RateBar label="Override rate (dispensed anyway)" value={safety.overrideRate30d} color="bg-amber-400" />
              </div>

              {/* Severity breakdown */}
              <div>
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">By severity</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'High', value: safety.severityBreakdown.high, color: 'bg-red-100 text-red-700' },
                    { label: 'Moderate', value: safety.severityBreakdown.moderate, color: 'bg-amber-100 text-amber-700' },
                    { label: 'Info', value: safety.severityBreakdown.info, color: 'bg-blue-100 text-blue-700' },
                  ].map((s) => (
                    <div key={s.label} className={`rounded-xl px-3 py-2 text-center ${s.color}`}>
                      <p className="text-lg font-bold">{s.value.toLocaleString()}</p>
                      <p className="text-[10px] font-semibold">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top drug classes */}
              {safety.topDrugClasses.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Most flagged drug classes</p>
                  <div className="space-y-1.5">
                    {safety.topDrugClasses.slice(0, 5).map((d: { drugClass: string; count: number }) => {
                      const maxCount = safety.topDrugClasses[0]?.count ?? 1;
                      return (
                        <div key={d.drugClass} className="flex items-center gap-2">
                          <span className="text-xs text-[#64748B] w-32 truncate">{d.drugClass}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-[#EDF7F3]">
                            <div className="h-1.5 rounded-full bg-[#1A6B5C]" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-[#0D4035] w-8 text-right">{d.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-[#94A3B8] py-4 text-center">No safety data available.</p>
          )}
        </div>

        {/* Trial funnel */}
        <div className="rounded-2xl border border-[#D6F0E8] bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-[#1A6B5C]" />
            <h2 className="text-sm font-semibold text-[#0D4035]">Trial Conversion Funnel</h2>
          </div>

          {funnelQuery.isLoading ? (
            <div className="h-32 animate-pulse rounded-xl bg-[#EDF7F3]" />
          ) : funnel ? (
            <>
              <div className="space-y-3">
                <FunnelStep label="Registered" value={funnel.registered} color="bg-[#AFDFD3]" />
                <FunnelStep
                  label="Activated (first dispense)"
                  value={funnel.activated}
                  rate={funnel.activationRate}
                  color="bg-[#2A9478]"
                />
                <FunnelStep
                  label="Converted to paid"
                  value={funnel.converted}
                  rate={funnel.conversionRate}
                  color="bg-[#1A6B5C]"
                />
              </div>

              {/* Cold leads */}
              {funnel.neverActivated.count > 0 && (
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <UserX size={13} className="text-amber-600" />
                    <p className="text-xs font-semibold text-amber-800">
                      {funnel.neverActivated.count} cold lead{funnel.neverActivated.count !== 1 ? 's' : ''} — trial started, never dispensed
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {funnel.neverActivated.pharmacies.slice(0, 5).map((p: { id: string; name: string; region: string; tier: string; daysSinceRegistered: number }) => (
                      <Link
                        key={p.id}
                        to={`/superadmin/pharmacies/${p.id}`}
                        className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-xs hover:bg-amber-50 transition-colors"
                      >
                        <span className="font-medium text-[#0D4035] truncate">{p.name}</span>
                        <span className="shrink-0 text-amber-700 ml-2">{p.daysSinceRegistered}d · {p.region}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-[#94A3B8] py-4 text-center">No funnel data available.</p>
          )}
        </div>
      </div>

      {/* ── Network Activity + MRR + Status ── */}
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">

          {/* Feature adoption */}
          <div className="rounded-2xl border border-[#D6F0E8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap size={15} className="text-[#1A6B5C]" />
                <h2 className="text-sm font-semibold text-[#0D4035]">Feature adoption — last 30 days</h2>
              </div>
              {activity && (
                <span className="text-xs text-[#64748B]">
                  {activity.activeDispensingCount} of {activity.totalPharmacies} pharmacies dispensing ({activity.dispensingEngagementRate}%)
                </span>
              )}
            </div>
            {activityQuery.isLoading ? (
              <div className="h-24 animate-pulse rounded-xl bg-[#EDF7F3]" />
            ) : activity?.featureUsage?.length > 0 ? (
              <div className="space-y-2">
                {activity.featureUsage.map((f: { featureKey: string; count: number }) => {
                  const maxCount = activity.featureUsage[0]?.count ?? 1;
                  return (
                    <div key={f.featureKey} className="flex items-center gap-3">
                      <span className="text-xs text-[#64748B] w-44 truncate">
                        {FEATURE_LABELS[f.featureKey] ?? f.featureKey}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-[#EDF7F3]">
                        <div className="h-2 rounded-full bg-[#1A6B5C] opacity-80" style={{ width: `${(f.count / maxCount) * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-[#0D4035] w-10 text-right">{f.count.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#94A3B8] py-4 text-center">No feature usage data yet.</p>
            )}
          </div>

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
                <Link
                  key={s}
                  to={`/superadmin/pharmacies?status=${s}`}
                  className="rounded-xl border border-[#E2E8F0] p-3 text-center hover:border-[#1A6B5C] hover:bg-[#EDF7F3] transition-colors"
                >
                  <p className="text-2xl font-bold text-[#0D4035]">{m?.statusBreakdown?.[s] ?? 0}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[s]}`}>
                    {STATUS_LABEL[s]}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Expiring soon */}
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
        <div className="space-y-5">
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

          {/* Safety quick-stats sidebar */}
          {safety && (
            <div className="rounded-2xl border border-[#D6F0E8] bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                {safety.complianceRate30d >= 70
                  ? <ShieldCheck size={14} className="text-emerald-600" />
                  : <ShieldAlert size={14} className="text-amber-500" />}
                <h2 className="text-sm font-semibold text-[#0D4035]">Safety this week</h2>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-[#EDF7F3] p-2.5">
                  <p className="text-xl font-bold text-[#1A6B5C]">{safety.totalAlerts7d}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">Alerts 7d</p>
                </div>
                <div className="rounded-xl bg-[#EDF7F3] p-2.5">
                  <p className="text-xl font-bold text-[#1A6B5C]">{safety.totalOverrides7d}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">Overrides 7d</p>
                </div>
              </div>
              {safety.topOverrideReasons.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B] mb-1.5">Top override reasons</p>
                  <div className="space-y-1">
                    {safety.topOverrideReasons.slice(0, 3).map((r: { reason: string; count: number }) => (
                      <div key={r.reason} className="flex justify-between text-xs">
                        <span className="text-[#64748B] truncate">{r.reason}</span>
                        <span className="font-semibold text-[#0D4035] ml-2">{r.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
