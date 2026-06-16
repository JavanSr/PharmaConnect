import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Users, Pill, Package, ShieldAlert, CheckCircle, Clock,
  LayoutDashboard, ClipboardList, ShieldCheck, Wallet, XCircle,
  TrendingUp, BarChart2, AlertCircle, MapPin, Zap, Activity,
} from 'lucide-react';
import { differenceInCalendarDays } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';

// ─── Types ───────────────────────────────────────────────────────────────────

type OverrideEntry = {
  id: string;
  pharmacyId: string;
  alertType: string;
  reason: string;
  createdAt: string;
  pharmacy: { name: string };
};

type RecentPharmacy = {
  id: string;
  name: string;
  region: string;
  subscriptionTier: string;
  status: string;
  createdAt: string;
};

type FounderStats = {
  pharmacies: { total: number; active: number };
  users: { total: number };
  tierBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  recentPharmacies: RecentPharmacy[];
  recentOverrides: OverrideEntry[];
  activity: { totalDispensings: number; totalBatches: number };
};

type Registration = {
  id: string;
  name: string;
  region: string;
  pharmacyType: string;
  tier: string;
  status: string;
  trialActive: boolean;
  trialStartsAt: string;
  trialEndsAt: string;
  isActive: boolean;
  createdAt: string;
  owner: { name: string; email: string; emailVerified: boolean } | null;
};

type SubscriptionPaymentRequest = {
  id: string;
  pharmacyId: string;
  requestedTier: string;
  billingCycle: string;
  amount: string | number;
  paymentMethod: string;
  transactionRef: string;
  payerPhone?: string | null;
  note?: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  reviewedAt?: string | null;
  reviewNote?: string | null;
  paidUntil?: string | null;
  createdAt: string;
  pharmacy: {
    name: string;
    region: string;
    subscriptionTier: string;
    status: string;
    trialActive: boolean;
    trialEndsAt: string;
  };
  requester: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
  };
};

type GrowthData = {
  mrr: { total: number; byTier: Record<string, number>; arr: number; paidCount: number };
  mrrMovement: { newMrr: number; expansionMrr: number; contractionMrr: number; churnedMrr: number };
  quickRatio: number | null;
  trials: {
    active: number;
    expiringSoon: Array<{ id: string; name: string; tier: string; trialEndsAt: string | null; daysLeft: number | null }>;
    conversionRate: number;
    convertedEver: number;
    newThisMonth: number;
    avgDaysToConvert: number | null;
  };
  churn: {
    graceCount: number;
    gracePharmacies: Array<{ id: string; name: string; tier: string; graceSince: string | null }>;
    darkCount: number;
    darkPharmacies: Array<{ id: string; name: string; tier: string }>;
    churnRateThisMonth: number;
    churnRateLastMonth: number;
  };
  activation: { newLast30Days: number; stockWithin3Days: number; activationRate: number; dispensingRate: number; stuckCount: number };
  geography: Array<{ region: string; count: number }>;
};

type AnalyticsData = {
  windowDays: number;
  revenue: {
    allTime:     { total: number; count: number };
    window:      { total: number; count: number };
    last7d:      { total: number; count: number };
    monthToDate: { total: number; count: number };
  };
  revenueByDay: Array<{ day: string; revenue: number; count: number }>;
  revenueByPaymentMethod: Array<{ method: string; revenue: number; count: number }>;
  topPharmacies: Array<{ pharmacyId: string; name: string; tier: string; dispensingCount: number; revenue: number }>;
  topProducts: Array<{ productName: string; totalQty: number; dispenseCount: number; revenue: number }>;
  clinicalOverrides: {
    byType: Array<{ alertType: string; count: number }>;
    recent: Array<{ id: string; alertType: string; reason: string; pharmacyId: string; pharmacyName: string | null; createdAt: string }>;
  };
};

type Tab = 'overview' | 'growth' | 'analytics' | 'registrations' | 'payments';

const TIERS = ['ADDO', 'BASIC', 'STANDARD', 'PREMIUM', 'WHOLESALE', 'ENTERPRISE'] as const;
const TIER_ORDER = ['ADDO', 'BASIC', 'STANDARD', 'PREMIUM', 'WHOLESALE', 'ENTERPRISE'];

const TIER_COLORS: Record<string, string> = {
  ADDO:       '#64748B',
  BASIC:      '#2A9478',
  STANDARD:   '#1A6B5C',
  PREMIUM:    '#0D4035',
  WHOLESALE:  '#E8A020',
  ENTERPRISE: '#082B23',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtTzs = (n: number) =>
  n >= 1_000_000 ? `Tsh ${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `Tsh ${(n / 1_000).toFixed(0)}K`
  : `Tsh ${n.toLocaleString()}`;

const fmtNum = (n: number) => n.toLocaleString('en-TZ');

// ─── Component ───────────────────────────────────────────────────────────────

export const FounderDashboardPage: React.FC = () => {
  const [tab, setTab] = React.useState<Tab>('overview');
  const [extensionDays, setExtensionDays] = React.useState('7');
  const [setTierTarget, setSetTierTarget] = React.useState<{ id: string; name: string } | null>(null);
  const [selectedTier, setSelectedTier] = React.useState<string>('STANDARD');
  const [analyticsDays, setAnalyticsDays] = React.useState(30);
  const queryClient = useQueryClient();
  const toast = useNotificationStore(state => state.toast);

  const statsQuery = useQuery<{ data: FounderStats }>({
    queryKey: ['founder-stats'],
    queryFn: () => api.get('/founder/stats').then(r => r.data),
    staleTime: 60_000,
  });

  const regsQuery = useQuery<{ data: Registration[] }>({
    queryKey: ['founder-registrations'],
    queryFn: () => api.get('/founder/registrations').then(r => r.data),
    staleTime: 30_000,
    enabled: tab === 'registrations',
  });

  const paymentsQuery = useQuery<{ data: SubscriptionPaymentRequest[] }>({
    queryKey: ['founder-subscription-payments', 'PENDING'],
    queryFn: () => api.get('/founder/subscription-payments', { params: { status: 'PENDING' } }).then(r => r.data),
    staleTime: 30_000,
    enabled: tab === 'payments',
  });

  const growthQuery = useQuery<{ data: GrowthData }>({
    queryKey: ['founder-growth'],
    queryFn: () => api.get('/founder/growth').then(r => r.data),
    staleTime: 60_000,
    enabled: tab === 'growth',
  });

  const analyticsQuery = useQuery<{ data: AnalyticsData }>({
    queryKey: ['founder-analytics', analyticsDays],
    queryFn: () => api.get('/founder/analytics', { params: { days: analyticsDays } }).then(r => r.data),
    staleTime: 60_000,
    enabled: tab === 'analytics',
  });

  const stats = statsQuery.data?.data;
  const registrations = regsQuery.data?.data ?? [];
  const paymentRequests = paymentsQuery.data?.data ?? [];
  const pendingVerification = registrations.filter(r => r.owner && !r.owner.emailVerified).length;

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const verifyOwnerMutation = useMutation({
    mutationFn: (pharmacyId: string) => api.post(`/founder/registrations/${pharmacyId}/verify-owner`),
    onSuccess: async () => {
      toast.success('Owner account verified');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['founder-registrations'] }),
        queryClient.invalidateQueries({ queryKey: ['founder-stats'] }),
      ]);
    },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Could not verify owner account'),
  });

  const extendTrialMutation = useMutation({
    mutationFn: (pharmacyId: string) => api.patch(`/founder/registrations/${pharmacyId}/trial`, {
      extensionDays: Number(extensionDays) || 7,
    }),
    onSuccess: async () => {
      toast.success('Trial extended');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['founder-registrations'] }),
        queryClient.invalidateQueries({ queryKey: ['founder-stats'] }),
      ]);
    },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Could not extend trial'),
  });

  const setTierMutation = useMutation({
    mutationFn: ({ pharmacyId, tier }: { pharmacyId: string; tier: string }) =>
      api.patch(`/founder/registrations/${pharmacyId}/set-tier`, { tier }),
    onSuccess: async (_, { tier }) => {
      toast.success(`Tier set to ${tier} — access active immediately`);
      setSetTierTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['founder-registrations'] }),
        queryClient.invalidateQueries({ queryKey: ['founder-stats'] }),
      ]);
    },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Could not set tier'),
  });

  const suspendMutation = useMutation({
    mutationFn: (pharmacyId: string) => api.patch(`/founder/registrations/${pharmacyId}/suspend`, {
      reason: 'Founder dashboard manual suspension',
    }),
    onSuccess: async () => {
      toast.success('Pharmacy suspended');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['founder-registrations'] }),
        queryClient.invalidateQueries({ queryKey: ['founder-stats'] }),
      ]);
    },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Could not suspend pharmacy'),
  });

  const reviewPaymentMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'CONFIRMED' | 'REJECTED' }) =>
      api.patch(`/founder/subscription-payments/${id}/review`, { status }),
    onSuccess: async (_, { status }) => {
      toast.success(status === 'CONFIRMED' ? 'Payment confirmed and access activated' : 'Payment request rejected');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['founder-subscription-payments'] }),
        queryClient.invalidateQueries({ queryKey: ['founder-registrations'] }),
        queryClient.invalidateQueries({ queryKey: ['founder-stats'] }),
      ]);
    },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Could not review payment request'),
  });

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0D4035]">Founder Dashboard</h1>
          <p className="text-sm text-[#64748B] mt-1">Platform-wide view — SUPER_ADMIN only.</p>
        </div>
        {pendingVerification > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
            <Clock size={14} className="text-amber-600" />
            <span className="text-xs font-medium text-amber-700">{pendingVerification} pending email verification</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#EDF7F3] rounded-xl p-1 w-fit flex-wrap">
        {([
          ['overview',      <LayoutDashboard size={14} />, 'Overview'],
          ['growth',        <TrendingUp size={14} />,      'Growth'],
          ['analytics',     <Activity size={14} />,        'Analytics'],
          ['registrations', <ClipboardList size={14} />,   'Registrations'],
          ['payments',      <Wallet size={14} />,          'Payments'],
        ] as const).map(([id, icon, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === id ? 'bg-white text-[#0D4035] shadow-sm' : 'text-[#64748B] hover:text-[#0D4035]'
            }`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        statsQuery.isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-[#1A6B5C] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !stats ? (
          <Card><div className="p-8 text-center text-sm text-[#64748B]">Stats could not be loaded.</div></Card>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Pharmacies"  value={stats.pharmacies.total}          icon={<Building2 size={20} className="text-[#1A6B5C]" />} />
              <StatCard label="Active"             value={stats.pharmacies.active}         icon={<Building2 size={20} className="text-[#1D9E75]" />} />
              <StatCard label="Total Users"        value={stats.users.total}               icon={<Users size={20} className="text-[#1A6B5C]" />} />
              <StatCard label="Total Dispensings"  value={stats.activity.totalDispensings} icon={<Pill size={20} className="text-[#1A6B5C]" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card header={<span className="text-sm font-semibold text-[#0D4035]">Subscription Tiers</span>}>
                <div className="space-y-3 pt-1">
                  {TIER_ORDER.map(tier => {
                    const count = stats.tierBreakdown[tier] ?? 0;
                    const max = Math.max(...Object.values(stats.tierBreakdown), 1);
                    return (
                      <div key={tier} className="flex items-center gap-3">
                        <span className="text-sm text-[#64748B] w-24 shrink-0">{tier}</span>
                        <div className="flex-1 h-2 bg-[#D6F0E8] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.round((count / max) * 100)}%`, background: TIER_COLORS[tier] ?? '#1A6B5C' }} />
                        </div>
                        <span className="text-sm font-semibold text-[#0D4035] w-6 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card header={<span className="text-sm font-semibold text-[#0D4035]">Platform Activity</span>}>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="rounded-2xl bg-[#EDF7F3] px-4 py-3">
                    <div className="flex items-center gap-2 mb-1"><Pill size={14} className="text-[#1A6B5C]" /><p className="text-xs text-[#64748B]">Dispensings</p></div>
                    <p className="text-xl font-bold text-[#0D4035]">{stats.activity.totalDispensings.toLocaleString()}</p>
                  </div>
                  <div className="rounded-2xl bg-[#EDF7F3] px-4 py-3">
                    <div className="flex items-center gap-2 mb-1"><Package size={14} className="text-[#1A6B5C]" /><p className="text-xs text-[#64748B]">Batches</p></div>
                    <p className="text-xl font-bold text-[#0D4035]">{stats.activity.totalBatches.toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {Object.entries(stats.statusBreakdown).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-sm">
                      <span className="text-[#64748B]">{status}</span>
                      <Badge variant={status === 'ACTIVE' ? 'success' : status === 'TRIAL' ? 'warning' : 'muted'} size="sm">{count}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card
              header={
                <div className="flex items-center gap-2">
                  <ShieldAlert size={16} className="text-[#D97706]" />
                  <span className="text-sm font-semibold text-[#0D4035]">Recent PIC Overrides (platform-wide)</span>
                </div>
              }
              padding={false}
            >
              {stats.recentOverrides.length === 0 ? (
                <div className="px-5 py-6 text-sm text-[#64748B]">No overrides recorded yet.</div>
              ) : (
                <div className="divide-y divide-[#D6F0E8]">
                  {stats.recentOverrides.map(o => (
                    <div key={o.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-sm font-medium text-[#0D4035]">{o.pharmacy?.name ?? o.pharmacyId}</p>
                          <p className="text-xs text-[#64748B] mt-0.5 truncate max-w-xs">{o.reason}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="warning" size="sm">{o.alertType}</Badge>
                          <span className="text-xs text-[#64748B]">{new Date(o.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )
      )}

      {/* ── Growth ── */}
      {tab === 'growth' && (
        growthQuery.isLoading ? (
          <div className="flex items-center justify-center h-64 text-[#64748B]">Loading growth metrics…</div>
        ) : (() => {
          const g = growthQuery.data?.data;
          if (!g) return <div className="text-[#64748B] p-8">No data available.</div>;
          const qr = g.quickRatio;
          const qrLabel = qr === null ? '∞' : qr.toFixed(2);
          const qrColor = qr === null || qr >= 4 ? '#16A34A' : qr >= 2 ? '#D97706' : '#DC2626';
          const qrSub = qr === null ? 'No churn this week' : qr >= 4 ? 'Healthy growth' : qr >= 2 ? 'Moderate' : 'At risk';
          const churnImproved = g.churn.churnRateThisMonth <= g.churn.churnRateLastMonth;

          return (
            <div className="space-y-6">
              {/* Hero KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'MRR',               value: fmtTzs(g.mrr.total),          sub: `${g.mrr.paidCount} paid accounts`,         icon: <TrendingUp size={16} className="text-[#1A6B5C]" />, color: undefined },
                  { label: 'ARR',               value: fmtTzs(g.mrr.arr),            sub: 'annualised run rate',                       icon: <BarChart2 size={16} className="text-[#1A6B5C]" />, color: undefined },
                  { label: 'Quick Ratio',        value: qrLabel,                      sub: qrSub,                                       icon: <Zap size={16} />,                                   color: qrColor },
                  { label: 'Trial → Paid',       value: `${g.trials.conversionRate}%`,sub: `${g.trials.convertedEver} converted`,       icon: <Zap size={16} className="text-[#E8A020]" />,        color: g.trials.conversionRate >= 30 ? '#16A34A' : g.trials.conversionRate >= 15 ? '#D97706' : '#DC2626' },
                  { label: 'Avg Days to Convert',value: g.trials.avgDaysToConvert !== null ? `${g.trials.avgDaysToConvert}d` : '—', sub: 'trial → first payment', icon: <AlertCircle size={16} className="text-[#64748B]" />, color: undefined },
                ].map(({ label, value, sub, icon, color }) => (
                  <Card key={label}>
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <p className="text-xs text-[#64748B] mb-1">{label}</p>
                        <p className="text-lg font-bold text-[#0D4035]" style={color ? { color } : undefined}>{value}</p>
                        <p className="text-xs text-[#94A3B8] mt-0.5">{sub}</p>
                      </div>
                      {icon}
                    </div>
                  </Card>
                ))}
              </div>

              {/* MRR Movement */}
              <Card header={<span className="text-sm font-semibold text-[#0D4035]">MRR Movement — this week</span>}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'New MRR',        value: g.mrrMovement.newMrr,         sub: 'first-time activations', border: 'border-l-4 border-green-400 bg-green-50',   text: 'text-green-700' },
                    { label: 'Expansion MRR',  value: g.mrrMovement.expansionMrr,   sub: 'tier upgrades',          border: 'border-l-4 border-teal-400 bg-teal-50',     text: 'text-teal-700' },
                    { label: 'Contraction MRR',value: g.mrrMovement.contractionMrr, sub: 'tier downgrades',        border: g.mrrMovement.contractionMrr > 0 ? 'border-l-4 border-orange-400 bg-orange-50' : 'border-l-4 border-gray-200 bg-gray-50', text: g.mrrMovement.contractionMrr > 0 ? 'text-orange-700' : 'text-gray-500' },
                    { label: 'Churned MRR',    value: g.mrrMovement.churnedMrr,     sub: 'entered grace',          border: g.mrrMovement.churnedMrr > 0 ? 'border-l-4 border-red-400 bg-red-50' : 'border-l-4 border-gray-200 bg-gray-50', text: g.mrrMovement.churnedMrr > 0 ? 'text-red-700' : 'text-gray-500' },
                  ].map(({ label, value, sub, border, text }) => (
                    <div key={label} className={`rounded-lg p-3 ${border}`}>
                      <p className="text-xs text-[#64748B] mb-1">{label}</p>
                      <p className={`text-base font-bold ${text}`}>{fmtTzs(value)}</p>
                      <p className="text-xs text-[#94A3B8] mt-0.5">{sub}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* MRR by tier */}
              <Card header={<span className="text-sm font-semibold text-[#0D4035]">MRR by tier</span>}>
                <div className="space-y-2">
                  {Object.entries(g.mrr.byTier).sort((a, b) => b[1] - a[1]).map(([tier, amount]) => {
                    const pct = g.mrr.total > 0 ? Math.round((amount / g.mrr.total) * 100) : 0;
                    return (
                      <div key={tier} className="flex items-center gap-3">
                        <span className="text-xs font-semibold w-20 text-[#0D4035]">{tier}</span>
                        <div className="flex-1 bg-[#EDF7F3] rounded-full h-2">
                          <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: TIER_COLORS[tier] ?? '#1A6B5C' }} />
                        </div>
                        <span className="text-xs text-[#0D4035] font-medium w-24 text-right">Tsh {fmtNum(amount)}</span>
                        <span className="text-xs text-[#64748B] w-8">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Trial + Churn */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card header={
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#0D4035]">Trials expiring in 7 days</span>
                    <Badge variant={g.trials.expiringSoon.length > 0 ? 'warning' : 'success'} size="sm">{g.trials.expiringSoon.length}</Badge>
                  </div>
                }>
                  {g.trials.expiringSoon.length === 0 ? (
                    <p className="text-sm text-[#64748B]">None expiring this week.</p>
                  ) : (
                    <div className="space-y-2">
                      {g.trials.expiringSoon.map(p => (
                        <div key={p.id} className="flex items-center justify-between text-sm">
                          <span className="text-[#0D4035] font-medium truncate">{p.name}</span>
                          <span className={`text-xs font-semibold ml-2 shrink-0 ${(p.daysLeft ?? 99) <= 2 ? 'text-red-600' : 'text-amber-600'}`}>{p.daysLeft}d left</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card header={<span className="text-sm font-semibold text-[#0D4035]">Churn Rate — Month on Month</span>}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`rounded-lg p-3 ${churnImproved ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <p className="text-xs text-[#64748B] mb-1">This month</p>
                      <p className={`text-xl font-bold ${churnImproved ? 'text-green-700' : 'text-red-700'}`}>{g.churn.churnRateThisMonth.toFixed(1)}%</p>
                      <p className="text-xs mt-0.5" style={{ color: churnImproved ? '#16A34A' : '#DC2626' }}>{churnImproved ? '↓ Better' : '↑ Worse'}</p>
                    </div>
                    <div className="rounded-lg p-3 bg-[#F8FAFC] border border-[#E2E8F0]">
                      <p className="text-xs text-[#64748B] mb-1">Last month</p>
                      <p className="text-xl font-bold text-[#64748B]">{g.churn.churnRateLastMonth.toFixed(1)}%</p>
                      <p className="text-xs text-[#94A3B8] mt-0.5">baseline</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* At-risk + Activation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card header={
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#0D4035]">At-risk accounts</span>
                    <Badge variant={g.churn.graceCount + g.churn.darkCount > 0 ? 'warning' : 'success'} size="sm">{g.churn.graceCount + g.churn.darkCount}</Badge>
                  </div>
                }>
                  {g.churn.graceCount === 0 && g.churn.darkCount === 0 ? (
                    <p className="text-sm text-[#64748B]">No at-risk accounts.</p>
                  ) : (
                    <div className="space-y-1">
                      {g.churn.graceCount > 0 && <p className="text-xs text-amber-700 font-semibold">{g.churn.graceCount} in grace period</p>}
                      {g.churn.gracePharmacies.map(p => <div key={p.id} className="text-xs text-[#64748B] pl-2">· {p.name} ({p.tier})</div>)}
                      {g.churn.darkCount > 0 && <p className="text-xs text-red-600 font-semibold mt-2">{g.churn.darkCount} paid — no activity 14d</p>}
                      {g.churn.darkPharmacies.map(p => <div key={p.id} className="text-xs text-[#64748B] pl-2">· {p.name} ({p.tier})</div>)}
                    </div>
                  )}
                </Card>

                <Card header={<span className="text-sm font-semibold text-[#0D4035]">Activation — new pharmacies (30d)</span>}>
                  <div className="space-y-3">
                    {[
                      { label: 'Signed up',                value: g.activation.newLast30Days,  color: '#1A6B5C' },
                      { label: 'Received stock within 3d', value: g.activation.stockWithin3Days,pct: g.activation.activationRate,  color: '#2A9478' },
                      { label: 'Completed first dispense', value: Math.round(g.activation.newLast30Days * g.activation.dispensingRate / 100), pct: g.activation.dispensingRate, color: '#0D4035' },
                      { label: 'Stuck at setup',           value: g.activation.stuckCount,      color: '#DC2626' },
                    ].map(({ label, value, pct, color }) => (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span className="text-[#64748B]">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold" style={{ color }}>{value}</span>
                          {pct !== undefined && <span className="text-xs text-[#64748B]">({pct}%)</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Geography */}
              <Card header={<span className="text-sm font-semibold text-[#0D4035]">Pharmacies by region</span>}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                  {g.geography.slice(0, 12).map(({ region, count }) => {
                    const total = g.geography.reduce((s, r) => s + r.count, 0);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={region} className="flex items-center gap-3">
                        <MapPin size={12} className="text-[#64748B] shrink-0" />
                        <span className="text-xs text-[#0D4035] w-28 truncate">{region}</span>
                        <div className="flex-1 bg-[#EDF7F3] rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-[#1A6B5C]" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-[#0D4035] w-6 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          );
        })()
      )}

      {/* ── Analytics ── */}
      {tab === 'analytics' && (
        <div className="space-y-6">
          {/* Window selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#64748B]">Window:</span>
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setAnalyticsDays(d)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  analyticsDays === d ? 'bg-[#1A6B5C] text-white' : 'bg-[#EDF7F3] text-[#0D4035] hover:bg-[#D6F0E8]'
                }`}
              >
                Last {d}d
              </button>
            ))}
          </div>

          {analyticsQuery.isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-[#1A6B5C] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (() => {
            const a = analyticsQuery.data?.data;
            if (!a) return <div className="text-[#64748B] p-8 text-sm">No analytics data available.</div>;

            const totalPaymentRevenue = a.revenueByPaymentMethod.reduce((s, r) => s + r.revenue, 0);

            return (
              <div className="space-y-6">

                {/* Revenue KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: `Last ${a.windowDays}d Revenue`, value: fmtTzs(a.revenue.window.total),      sub: `${fmtNum(a.revenue.window.count)} dispensings` },
                    { label: 'Last 7d Revenue',                value: fmtTzs(a.revenue.last7d.total),      sub: `${fmtNum(a.revenue.last7d.count)} dispensings` },
                    { label: 'Month-to-Date',                  value: fmtTzs(a.revenue.monthToDate.total), sub: `${fmtNum(a.revenue.monthToDate.count)} dispensings` },
                    { label: 'All-Time Revenue',               value: fmtTzs(a.revenue.allTime.total),     sub: `${fmtNum(a.revenue.allTime.count)} total dispensings` },
                  ].map(({ label, value, sub }) => (
                    <Card key={label}>
                      <p className="text-xs text-[#64748B] mb-1">{label}</p>
                      <p className="text-lg font-bold text-[#0D4035]">{value}</p>
                      <p className="text-xs text-[#94A3B8] mt-0.5">{sub}</p>
                    </Card>
                  ))}
                </div>

                {/* Revenue by day sparkline */}
                <Card header={<span className="text-sm font-semibold text-[#0D4035]">Daily revenue — last {a.windowDays} days</span>}>
                  {a.revenueByDay.length === 0 ? (
                    <p className="text-sm text-[#64748B]">No dispensing revenue recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {(() => {
                        const maxRev = Math.max(...a.revenueByDay.map(d => d.revenue), 1);
                        return a.revenueByDay.map(d => (
                          <div key={d.day} className="flex items-center gap-3">
                            <span className="text-xs text-[#64748B] w-24 shrink-0">{d.day.slice(5)}</span>
                            <div className="flex-1 bg-[#EDF7F3] rounded-full h-2">
                              <div className="h-2 rounded-full bg-[#1A6B5C]" style={{ width: `${Math.round((d.revenue / maxRev) * 100)}%` }} />
                            </div>
                            <span className="text-xs text-[#0D4035] font-medium w-28 text-right">{fmtTzs(d.revenue)}</span>
                            <span className="text-xs text-[#94A3B8] w-10 text-right">{d.count}×</span>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </Card>

                {/* Payment method + top products */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Payment method breakdown */}
                  <Card header={<span className="text-sm font-semibold text-[#0D4035]">Revenue by payment method</span>}>
                    {a.revenueByPaymentMethod.length === 0 ? (
                      <p className="text-sm text-[#64748B]">No data.</p>
                    ) : (
                      <div className="space-y-3">
                        {a.revenueByPaymentMethod.map(m => {
                          const pct = totalPaymentRevenue > 0 ? Math.round((m.revenue / totalPaymentRevenue) * 100) : 0;
                          return (
                            <div key={m.method} className="flex items-center gap-3">
                              <span className="text-xs text-[#64748B] w-28 shrink-0">{m.method}</span>
                              <div className="flex-1 bg-[#EDF7F3] rounded-full h-2">
                                <div className="h-2 rounded-full bg-[#2A9478]" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-[#0D4035] font-medium w-20 text-right">{fmtTzs(m.revenue)}</span>
                              <span className="text-xs text-[#94A3B8] w-8">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>

                  {/* Top products */}
                  <Card header={<span className="text-sm font-semibold text-[#0D4035]">Top 10 products — units dispensed</span>}>
                    {a.topProducts.length === 0 ? (
                      <p className="text-sm text-[#64748B]">No product data yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {(() => {
                          const maxQty = Math.max(...a.topProducts.map(p => p.totalQty), 1);
                          return a.topProducts.map((p, i) => (
                            <div key={p.productName} className="flex items-center gap-2">
                              <span className="text-xs text-[#94A3B8] w-4 shrink-0">{i + 1}</span>
                              <span className="text-xs text-[#0D4035] truncate flex-1">{p.productName}</span>
                              <div className="w-20 bg-[#EDF7F3] rounded-full h-1.5 shrink-0">
                                <div className="h-1.5 rounded-full bg-[#1A6B5C]" style={{ width: `${Math.round((p.totalQty / maxQty) * 100)}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-[#0D4035] w-10 text-right shrink-0">{fmtNum(p.totalQty)}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </Card>
                </div>

                {/* Top pharmacies */}
                <Card header={<span className="text-sm font-semibold text-[#0D4035]">Top 10 pharmacies by revenue</span>} padding={false}>
                  {a.topPharmacies.length === 0 ? (
                    <div className="px-5 py-6 text-sm text-[#64748B]">No dispensing data yet.</div>
                  ) : (
                    <div className="divide-y divide-[#D6F0E8]">
                      {a.topPharmacies.map((p, i) => (
                        <div key={p.pharmacyId} className="px-5 py-3 flex items-center gap-4">
                          <span className="text-sm font-bold text-[#94A3B8] w-5 shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#0D4035] truncate">{p.name}</p>
                            <p className="text-xs text-[#64748B]">{p.tier} · {fmtNum(p.dispensingCount)} dispensings</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-bold text-[#0D4035]">{fmtTzs(p.revenue)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Clinical overrides */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card header={<span className="text-sm font-semibold text-[#0D4035]">Clinical overrides by type</span>}>
                    {a.clinicalOverrides.byType.length === 0 ? (
                      <p className="text-sm text-[#64748B]">No overrides in this window.</p>
                    ) : (
                      <div className="space-y-2">
                        {(() => {
                          const maxCount = Math.max(...a.clinicalOverrides.byType.map(o => o.count), 1);
                          return a.clinicalOverrides.byType.map(o => (
                            <div key={o.alertType} className="flex items-center gap-3">
                              <span className="text-xs text-[#64748B] w-36 shrink-0 truncate">{o.alertType}</span>
                              <div className="flex-1 bg-amber-50 rounded-full h-2">
                                <div className="h-2 rounded-full bg-amber-400" style={{ width: `${Math.round((o.count / maxCount) * 100)}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-[#0D4035] w-8 text-right">{o.count}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </Card>

                  <Card header={<span className="text-sm font-semibold text-[#0D4035]">Recent overrides</span>} padding={false}>
                    {a.clinicalOverrides.recent.length === 0 ? (
                      <div className="px-5 py-4 text-sm text-[#64748B]">None in this window.</div>
                    ) : (
                      <div className="divide-y divide-[#D6F0E8]">
                        {a.clinicalOverrides.recent.map(o => (
                          <div key={o.id} className="px-5 py-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-[#0D4035]">{o.pharmacyName ?? o.pharmacyId}</p>
                                <p className="text-xs text-[#64748B] mt-0.5 truncate">{o.reason}</p>
                              </div>
                              <Badge variant="warning" size="sm">{o.alertType}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>

              </div>
            );
          })()}
        </div>
      )}

      {/* ── Registrations ── */}
      {tab === 'registrations' && (
        <Card padding={false} header={
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <span className="text-sm font-semibold text-[#0D4035]">All Registrations</span>
            <div className="flex items-end gap-3">
              <Input
                label="Extension days"
                type="number"
                min="1"
                max="365"
                value={extensionDays}
                onChange={(event) => setExtensionDays(event.target.value)}
                className="w-24"
              />
              <span className="pb-2 text-xs text-[#64748B]">{registrations.length} total</span>
            </div>
          </div>
        }>
          {regsQuery.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-4 border-[#1A6B5C] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : registrations.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[#64748B]">No registrations yet.</div>
          ) : (
            <div className="divide-y divide-[#D6F0E8]">
              {registrations.map(r => (
                <div key={r.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-[#0D4035]">{r.name}</p>
                        <Badge variant="info" size="sm">{r.tier}</Badge>
                        <Badge variant={r.status === 'ACTIVE' ? 'success' : 'warning'} size="sm">{r.status}</Badge>
                      </div>
                      <p className="text-xs text-[#64748B] mt-0.5">{r.region} · {r.pharmacyType} · {new Date(r.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-[#64748B] mt-1">
                        Trial ends {new Date(r.trialEndsAt).toLocaleDateString()} · {Math.max(0, differenceInCalendarDays(new Date(r.trialEndsAt), new Date()))} day(s) left
                      </p>
                      {r.owner && (
                        <p className="text-xs text-[#374151] mt-1">
                          <span className="font-medium">{r.owner.name}</span>
                          {' · '}
                          <a href={`mailto:${r.owner.email}`} className="text-[#1A6B5C] hover:underline">{r.owner.email}</a>
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-3">
                      {r.owner?.emailVerified ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-[#1A6B5C]">
                          <CheckCircle size={13} />Verified
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                            <Clock size={13} />Pending
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<ShieldCheck size={14} />}
                            loading={verifyOwnerMutation.isPending && verifyOwnerMutation.variables === r.id}
                            onClick={() => verifyOwnerMutation.mutate(r.id)}
                          >
                            Verify owner
                          </Button>
                        </div>
                      )}
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={extendTrialMutation.isPending && extendTrialMutation.variables === r.id}
                          onClick={() => extendTrialMutation.mutate(r.id)}
                        >
                          Extend trial
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => { setSetTierTarget({ id: r.id, name: r.name }); setSelectedTier(r.tier); }}
                        >
                          Set tier
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          loading={suspendMutation.isPending && suspendMutation.variables === r.id}
                          disabled={!r.isActive && r.status === 'SUSPENDED'}
                          onClick={() => {
                            if (window.confirm(`Suspend ${r.name}? This will stop pharmacy access.`)) {
                              suspendMutation.mutate(r.id);
                            }
                          }}
                        >
                          Suspend
                        </Button>
                      </div>
                      {setTierTarget?.id === r.id && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[#D6F0E8] bg-[#F7FCFA] p-3">
                          <span className="text-xs font-medium text-[#0D4035]">Activate tier:</span>
                          {TIERS.map((t) => (
                            <button
                              key={t}
                              onClick={() => setSelectedTier(t)}
                              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${selectedTier === t ? 'bg-[#1A6B5C] text-white' : 'bg-[#EDF7F3] text-[#0D4035] hover:bg-[#D6F0E8]'}`}
                            >
                              {t}
                            </button>
                          ))}
                          <Button
                            size="sm"
                            loading={setTierMutation.isPending}
                            onClick={() => setTierMutation.mutate({ pharmacyId: r.id, tier: selectedTier })}
                          >
                            Activate {selectedTier}
                          </Button>
                          <button
                            className="text-xs text-[#94A3B8] hover:text-[#64748B]"
                            onClick={() => setSetTierTarget(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Payments ── */}
      {tab === 'payments' && (
        <Card padding={false} header={
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="text-sm font-semibold text-[#0D4035]">Pending subscription payments</span>
              <p className="mt-1 text-xs text-[#64748B]">Confirm requests after checking M-Pesa or bank transfer records.</p>
            </div>
            <Badge variant="warning" size="sm">{paymentRequests.length} pending</Badge>
          </div>
        }>
          {paymentsQuery.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-4 border-[#1A6B5C] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : paymentRequests.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[#64748B]">No pending payment requests.</div>
          ) : (
            <div className="divide-y divide-[#D6F0E8]">
              {paymentRequests.map((request) => {
                const isCurrent = reviewPaymentMutation.isPending && reviewPaymentMutation.variables?.id === request.id;
                return (
                  <div key={request.id} className="px-5 py-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[#0D4035]">{request.pharmacy.name}</p>
                          <Badge variant="info" size="sm">{request.requestedTier}</Badge>
                          <Badge variant="muted" size="sm">{request.billingCycle}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-[#64748B]">
                          {request.pharmacy.region} · current {request.pharmacy.subscriptionTier} · {request.pharmacy.status}
                        </p>
                        <p className="mt-2 text-sm text-[#0D4035]">
                          Tsh {Number(request.amount).toLocaleString()} via {request.paymentMethod}
                        </p>
                        <p className="mt-1 text-xs text-[#64748B]">
                          Ref {request.transactionRef} · submitted {new Date(request.createdAt).toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-[#64748B]">
                          {request.requester.firstName} {request.requester.lastName} · {request.requester.email}
                          {request.payerPhone ? ` · payer ${request.payerPhone}` : ''}
                        </p>
                        {request.note && <p className="mt-2 text-xs text-[#475569]">{request.note}</p>}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          size="sm"
                          leftIcon={<CheckCircle size={14} />}
                          loading={isCurrent && reviewPaymentMutation.variables?.status === 'CONFIRMED'}
                          disabled={reviewPaymentMutation.isPending}
                          onClick={() => reviewPaymentMutation.mutate({ id: request.id, status: 'CONFIRMED' })}
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          leftIcon={<XCircle size={14} />}
                          loading={isCurrent && reviewPaymentMutation.variables?.status === 'REJECTED'}
                          disabled={reviewPaymentMutation.isPending}
                          onClick={() => {
                            if (window.confirm('Reject this payment request?')) {
                              reviewPaymentMutation.mutate({ id: request.id, status: 'REJECTED' });
                            }
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="bg-white rounded-2xl border border-[#D6F0E8] p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-[#64748B] mb-1">{label}</p>
        <p className="text-2xl font-bold text-[#0D4035]">{value.toLocaleString()}</p>
      </div>
      <div className="w-10 h-10 rounded-xl bg-[#D6F0E8] flex items-center justify-center shrink-0">
        {icon}
      </div>
    </div>
  </div>
);
