import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { Package, TrendingDown, ShieldCheck, AlertTriangle, ArrowRight, TrendingUp, Minus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { api } from '@/lib/api';
import { usePharmacyStore } from '@/stores/pharmacyStore';

// ── Daily Revenue Widget (grace mode) ────────────────────────────────────────
type DailyRevenueData = {
  todayRevenue: number;
  todayCount: number;
  yesterdayRevenue: number;
  change: number | null;
  date: string;
};

const Tsh = (value: number) =>
  `Tsh ${Number(value ?? 0).toLocaleString('en-TZ', { maximumFractionDigits: 0 })}`;

const DailyRevenueWidget: React.FC = () => {
  const { data, isLoading, isError } = useQuery<{ data: DailyRevenueData }>({
    queryKey: ['analytics-daily-revenue'],
    queryFn: () => api.get('/analytics/daily-revenue').then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });

  const revenue = data?.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#0D4035]">Analytics</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Grace access — daily revenue only. Renew to unlock full analytics.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Your subscription has lapsed. You can see today's revenue below.{' '}
        <Link to="/settings/subscription" className="font-semibold underline">
          Renew now
        </Link>{' '}
        to restore full analytics access.
      </div>

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1A6B5C] border-t-transparent" />
        </div>
      )}

      {isError && (
        <Card>
          <div className="p-8 text-center text-sm text-[#64748B]">
            Revenue data could not be loaded. Check your connection and refresh.
          </div>
        </Card>
      )}

      {revenue && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Today's revenue — main figure */}
          <div className="rounded-2xl border border-[#D6F0E8] bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">
              Today's revenue
            </p>
            <p className="mt-3 text-4xl font-bold text-[#0D4035]">
              {Tsh(revenue.todayRevenue)}
            </p>
            <p className="mt-1 text-sm text-[#64748B]">
              {revenue.todayCount} {revenue.todayCount === 1 ? 'sale' : 'sales'} ·{' '}
              {new Date(revenue.date).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>

            {/* Change vs yesterday */}
            {revenue.change !== null && (
              <div
                className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
                  revenue.change > 0
                    ? 'bg-green-100 text-green-700'
                    : revenue.change < 0
                    ? 'bg-red-100 text-red-700'
                    : 'bg-[#EDF7F3] text-[#64748B]'
                }`}
              >
                {revenue.change > 0 ? (
                  <TrendingUp size={14} />
                ) : revenue.change < 0 ? (
                  <TrendingDown size={14} />
                ) : (
                  <Minus size={14} />
                )}
                {revenue.change > 0 ? '+' : ''}
                {revenue.change}% vs yesterday
              </div>
            )}
          </div>

          {/* Yesterday comparison */}
          <div className="rounded-2xl border border-[#D6F0E8] bg-[#F8FAFC] p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">
              Yesterday's revenue
            </p>
            <p className="mt-3 text-3xl font-bold text-[#475569]">
              {Tsh(revenue.yesterdayRevenue)}
            </p>
            <p className="mt-1 text-sm text-[#64748B]">Previous day</p>

            <div className="mt-4 rounded-xl bg-white border border-[#D6F0E8] p-3">
              <p className="text-xs text-[#64748B]">
                Renew your subscription to unlock revenue trends, inventory analytics,
                compliance tracking, and multi-outlet comparison.
              </p>
              <Link
                to="/settings/subscription"
                className="mt-2 inline-block text-xs font-semibold text-[#1A6B5C] hover:underline"
              >
                View plans →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

type MovementKey = 'received' | 'dispensed' | 'adjusted' | 'damaged' | 'other';
type ComplianceKey = 'GREEN' | 'AMBER' | 'RED' | 'EXPIRED';
type StorageKey = 'AMBIENT' | 'REFRIGERATED' | 'FROZEN';

type AnalyticsSummary = {
  inventory: {
    totalProducts: number;
    totalStockValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    storageBreakdown: Record<StorageKey, number>;
    expiryRisk: Record<string, number>;
  };
  movements: {
    periodDays: number;
    counts: Record<MovementKey, number>;
    topDispensed: Array<{ name: string; units: number }>;
  };
  compliance: {
    score: number;
    total: number;
    breakdown: Record<ComplianceKey, number>;
  };
};

type AnalyticsResponse = {
  success: boolean;
  data: AnalyticsSummary;
};

type AnalyticsFeatures = {
  tier: 'ADDO' | 'ESSENTIAL' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE' | 'WHOLESALE' | null;
  historyDays: number;
  stockout: boolean;
  benchmark: boolean;
  forecast: boolean;
  seasonality: boolean;
  deadStock: boolean;
  multiOutletCompare: boolean;
};

type CompareMetric = 'DISPENSED_UNITS' | 'RECEIVED_UNITS' | 'REVENUE_TZS';
type CompareRange = '7D' | '30D' | '90D' | '12M';

type CompareResponse = {
  data: {
    metric: CompareMetric;
    range: CompareRange;
    labels: Array<{ key: string; label: string }>;
    series: Array<{
      pharmacyId: string;
      pharmacyName: string;
      values: Array<{ key: string; label: string; value: number }>;
    }>;
  };
};

const COMPARE_METRIC_OPTIONS = [
  { value: 'DISPENSED_UNITS', label: 'Dispensed units' },
  { value: 'RECEIVED_UNITS', label: 'Received units' },
  { value: 'REVENUE_TZS', label: 'Revenue (Tsh)' },
] as const;

const COMPARE_RANGE_OPTIONS = [
  { value: '7D', label: 'Last 7 days' },
  { value: '30D', label: 'Last 30 days' },
  { value: '90D', label: 'Last 90 days' },
  { value: '12M', label: 'Last 12 months' },
] as const;

const COMPARE_COLORS = ['#1A6B5C', '#D97706', '#1D4ED8', '#DC2626', '#7C3AED'];

const MOVEMENT_COLORS: Record<MovementKey, string> = {
  received: '#1A6B5C',
  dispensed: '#1D9E75',
  adjusted: '#D97706',
  damaged: '#DC2626',
  other: '#94A3B8',
};

const COMPLIANCE_COLORS: Record<ComplianceKey, string> = {
  GREEN: '#1A6B5C',
  AMBER: '#D97706',
  RED: '#DC2626',
  EXPIRED: '#94A3B8',
};

export const AnalyticsPage: React.FC = () => {
  const memberships = usePharmacyStore((state) => state.memberships);
  const activePharmacy = usePharmacyStore((state) => state.pharmacy);

  // Grace mode: subscription lapsed — show daily revenue widget only.
  const isSubscriptionLapsed =
    activePharmacy?.status === 'ACTIVE' &&
    activePharmacy?.trialEndsAt != null &&
    new Date(activePharmacy.trialEndsAt) < new Date();
  const inGrace = activePharmacy?.status === 'GRACE' || isSubscriptionLapsed;
  if (inGrace) return <DailyRevenueWidget />;
  const compareEligibleMemberships = useMemo(
    () => memberships.filter((membership) => membership.pharmacy?.isActive !== false),
    [memberships]
  );
  const [compareMetric, setCompareMetric] = React.useState<CompareMetric>('DISPENSED_UNITS');
  const [compareRange, setCompareRange] = React.useState<CompareRange>('30D');
  const [selectedPharmacyIds, setSelectedPharmacyIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!compareEligibleMemberships.length) {
      return;
    }

    setSelectedPharmacyIds((current) => {
      if (current.length) {
        const next = current.filter((pharmacyId) => compareEligibleMemberships.some((membership) => membership.pharmacyId === pharmacyId));
        if (next.length) {
          return next;
        }
      }

      const preferred = compareEligibleMemberships.find((membership) => membership.pharmacyId === activePharmacy?.id);
      const seed = preferred
        ? [preferred.pharmacyId, ...compareEligibleMemberships.filter((membership) => membership.pharmacyId !== preferred.pharmacyId).slice(0, 1).map((membership) => membership.pharmacyId)]
        : compareEligibleMemberships.slice(0, Math.min(2, compareEligibleMemberships.length)).map((membership) => membership.pharmacyId);

      return seed;
    });
  }, [activePharmacy?.id, compareEligibleMemberships]);

  const emptyAnalyticsSummary: AnalyticsSummary = {
    inventory: { totalProducts: 0, totalStockValue: 0, lowStockCount: 0, outOfStockCount: 0, storageBreakdown: { AMBIENT: 0, REFRIGERATED: 0, FROZEN: 0 }, expiryRisk: {} },
    movements: { periodDays: 30, counts: { received: 0, dispensed: 0, adjusted: 0, damaged: 0, other: 0 }, topDispensed: [] },
    compliance: { score: 0, total: 0, breakdown: { GREEN: 0, AMBER: 0, RED: 0, EXPIRED: 0 } },
  };

  const { data, isLoading, isError, error } = useQuery<AnalyticsResponse>({
    queryKey: ['analytics-summary'],
    queryFn: () =>
      api.get('/analytics/overview').then((r) => {
        const o = r.data?.data ?? {};
        const summary: AnalyticsSummary = {
          inventory: {
            totalProducts: o.totalProducts ?? 0,
            totalStockValue: 0,
            lowStockCount: o.lowStockCount ?? 0,
            outOfStockCount: 0,
            storageBreakdown: { AMBIENT: 0, REFRIGERATED: 0, FROZEN: 0 },
            expiryRisk: { days30: o.expiryCount ?? 0 },
          },
          movements: {
            periodDays: 30,
            counts: { received: o.receivedUnits ?? 0, dispensed: o.dispensedUnits ?? 0, adjusted: 0, damaged: 0, other: 0 },
            topDispensed: [],
          },
          compliance: { score: 0, total: 0, breakdown: { GREEN: 0, AMBER: 0, RED: 0, EXPIRED: 0 } },
        };
        return { success: true, data: summary };
      }).catch((e) => {
        if (e?.response?.status === 403) {
          return { success: true, data: emptyAnalyticsSummary, permissionDenied: true };
        }
        return { success: true, data: emptyAnalyticsSummary };
      }),
    staleTime: 5 * 60 * 1000,
  });
  const featuresQuery = useQuery<{ data: AnalyticsFeatures }>({
    queryKey: ['analytics-features'],
    queryFn: () => api.get('/analytics/features').then((response) => response.data),
    staleTime: 5 * 60 * 1000,
  });
  const compareQuery = useQuery<CompareResponse>({
    queryKey: ['analytics-compare', compareMetric, compareRange, [...selectedPharmacyIds].sort().join(',')],
    enabled: featuresQuery.data?.data.multiOutletCompare === true && selectedPharmacyIds.length > 0,
    queryFn: () => api.post('/analytics/compare', {
      metric: compareMetric,
      range: compareRange,
      pharmacyIds: selectedPharmacyIds,
    }).then((response) => response.data),
    staleTime: 60_000,
  });

  const summary = data?.data;
  const features = featuresQuery.data?.data;

  const movementChartData = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.movements.counts).map(([key, value]) => {
      const movementKey = key as MovementKey;
      return {
        name: movementKey.charAt(0).toUpperCase() + movementKey.slice(1),
        units: value,
        fill: MOVEMENT_COLORS[movementKey] ?? '#94A3B8',
      };
    });
  }, [summary]);

  const compliancePieData = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.compliance.breakdown)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => {
        const complianceKey = key as ComplianceKey;
        return {
          name: complianceKey,
          value,
          fill: COMPLIANCE_COLORS[complianceKey] ?? '#94A3B8',
        };
      });
  }, [summary]);

  const expiryRisk = summary?.inventory.expiryRisk;
  const compareChartData = useMemo(() => {
    const compare = compareQuery.data?.data;
    if (!compare) {
      return [];
    }

    return compare.labels.map((label, index) => {
      const point: Record<string, string | number> = {
        label: label.label,
      };

      compare.series.forEach((series) => {
        point[series.pharmacyId] = series.values[index]?.value ?? 0;
      });

      return point;
    });
  }, [compareQuery.data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-[#1A6B5C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const permissionDenied = (data as any)?.permissionDenied === true;

  if (isError) {
    return (
      <Card>
        <div className="p-8 text-center text-sm text-[#64748B]">
          Analytics could not be loaded. Check your connection and try refreshing.
        </div>
      </Card>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      {permissionDenied && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-[#92400E]">
          Your role does not have analytics access. The figures below are blank — ask your pharmacy owner to grant analytics permission.
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-[#0D4035]">Analytics</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Operational snapshot: inventory, movements, and compliance across active modules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {features?.tier && <Badge variant="info" size="sm">{features.tier} analytics</Badge>}
          <Badge variant="info" size="sm">Last 30 days</Badge>
        </div>
      </div>

      {features?.multiOutletCompare && (
        <Card
          header={
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-[#0D4035]">Multi-outlet compare</p>
                <p className="text-xs text-[#64748B] mt-1">One metric, one time range, one chart across your accessible pharmacies.</p>
              </div>
              <Badge variant="success" size="sm">Enterprise</Badge>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Metric"
                value={compareMetric}
                onChange={(event) => setCompareMetric(event.target.value as CompareMetric)}
                options={COMPARE_METRIC_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
              />
              <Select
                label="Time range"
                value={compareRange}
                onChange={(event) => setCompareRange(event.target.value as CompareRange)}
                options={COMPARE_RANGE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-[#0D4035]">Pharmacies</p>
              <div className="flex flex-wrap gap-2">
                {compareEligibleMemberships.map((membership) => {
                  const selected = selectedPharmacyIds.includes(membership.pharmacyId);
                  return (
                    <button
                      key={membership.id}
                      type="button"
                      className={`px-3 py-2 rounded-full border text-sm transition-colors ${
                        selected
                          ? 'bg-[#1A6B5C] border-[#1A6B5C] text-white'
                          : 'bg-white border-[#D6F0E8] text-[#0D4035] hover:bg-[#EDF7F3]'
                      }`}
                      onClick={() => {
                        setSelectedPharmacyIds((current) => (
                          selected
                            ? current.filter((pharmacyId) => pharmacyId !== membership.pharmacyId)
                            : [...current, membership.pharmacyId]
                        ));
                      }}
                    >
                      {membership.pharmacy.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {compareQuery.isError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#DC2626]">
                Compare data could not be loaded for the selected pharmacies.
              </div>
            ) : compareQuery.isLoading ? (
              <div className="flex items-center justify-center h-56">
                <div className="w-8 h-8 border-3 border-[#1A6B5C] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : compareChartData.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={compareChartData}>
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #D6F0E8', fontSize: 12 }}
                    formatter={(value) => [
                      compareMetric === 'REVENUE_TZS' ? Tsh(Number(value)) : Number(value).toLocaleString(),
                      '',
                    ]}
                  />
                  {compareQuery.data?.data.series.map((series, index) => (
                    <Line
                      key={series.pharmacyId}
                      type="monotone"
                      dataKey={series.pharmacyId}
                      name={series.pharmacyName}
                      stroke={COMPARE_COLORS[index % COMPARE_COLORS.length]}
                      strokeWidth={3}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="rounded-2xl border border-[#D6F0E8] bg-[#F7FBF9] px-4 py-6 text-sm text-[#64748B] text-center">
                Pick at least one pharmacy to compare this metric.
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Stock Value"
          value={Tsh(summary.inventory.totalStockValue)}
          sub="Based on selling prices"
          icon={<Package size={20} className="text-[#1A6B5C]" />}
          color="bg-[#D6F0E8]"
          link="/inventory/products"
        />
        <KpiCard
          label="Units Dispensed"
          value={summary.movements.counts.dispensed.toLocaleString()}
          sub="Past 30 days"
          icon={<TrendingDown size={20} className="text-[#1D9E75]" />}
          color="bg-[#D6F0E8]"
          link="/inventory"
        />
        <KpiCard
          label="Low / Out of Stock"
          value={`${summary.inventory.lowStockCount} / ${summary.inventory.outOfStockCount}`}
          sub="Low stock / out of stock"
          icon={<AlertTriangle size={20} className="text-[#D97706]" />}
          color="bg-amber-50"
          link="/inventory"
        />
        <KpiCard
          label="Compliance Score"
          value={`${summary.compliance.score}%`}
          sub={`${summary.compliance.total} items tracked`}
          icon={<ShieldCheck size={20} className="text-[#1A6B5C]" />}
          color="bg-[#D6F0E8]"
          link="/compliance"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card header={
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#0D4035]">Stock Movements (30 days)</span>
            <Link to="/inventory" className="text-xs text-[#1A6B5C] hover:underline flex items-center gap-1">
              View inventory <ArrowRight size={12} />
            </Link>
          </div>
        }>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={movementChartData} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #D6F0E8', fontSize: 12 }}
                formatter={(value) => [`${Number(value).toLocaleString()} units`, '']}
              />
              <Bar dataKey="units" radius={[6, 6, 0, 0]}>
                {movementChartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card header={
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#0D4035]">Compliance Breakdown</span>
            <Link to="/compliance" className="text-xs text-[#1A6B5C] hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
        }>
          {compliancePieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-[#64748B]">
              No compliance items recorded yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={compliancePieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={45}
                  paddingAngle={3}
                >
                  {compliancePieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #D6F0E8', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card header={<span className="text-sm font-semibold text-[#0D4035]">Top Dispensed Products (30 days)</span>} padding={false}>
          {!summary.movements.topDispensed.length ? (
            <div className="p-8 text-center text-sm text-[#64748B]">No dispensing data yet</div>
          ) : (
            <div className="divide-y divide-[#D6F0E8]">
              {summary.movements.topDispensed.map((item) => {
                const maxUnits = summary.movements.topDispensed[0].units;
                const pct = maxUnits > 0 ? Math.round((item.units / maxUnits) * 100) : 0;
                return (
                  <div key={item.name} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-[#0D4035] truncate flex-1">{item.name}</p>
                      <span className="text-sm font-bold text-[#1A6B5C] ml-3">{item.units.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-[#D6F0E8] rounded-full overflow-hidden">
                      <div className="h-full bg-[#1A6B5C] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card header={
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#0D4035]">Expiry Risk (batches)</span>
            <Link to="/inventory/expiry" className="text-xs text-[#1A6B5C] hover:underline flex items-center gap-1">
              View expiry <ArrowRight size={12} />
            </Link>
          </div>
        }>
          <div className="space-y-3 pt-2">
            {[
              { label: 'Expires today or tomorrow', key: 'days1', variant: 'danger', pulse: true },
              { label: 'Expires within 7 days', key: 'days7', variant: 'danger', pulse: false },
              { label: 'Expires within 30 days', key: 'days30', variant: 'warning', pulse: false },
              { label: 'Expires within 60 days', key: 'days60', variant: 'info', pulse: false },
              { label: 'Expires within 90 days', key: 'days90', variant: 'muted', pulse: false },
            ].map((row) => (
              <div key={row.key} className="flex items-center justify-between py-1">
                <span className="text-sm text-[#64748B]">{row.label}</span>
                <Badge
                  variant={row.variant as any}
                  size="sm"
                  className={row.pulse && (expiryRisk?.[row.key] ?? 0) > 0 ? 'animate-pulse' : ''}
                >
                  {expiryRisk?.[row.key] ?? 0} batches
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card header={<span className="text-sm font-semibold text-[#0D4035]">Storage Conditions</span>}>
        <div className="grid grid-cols-3 gap-4 pt-2">
          {[
            { label: 'Ambient', key: 'AMBIENT' as StorageKey, color: 'text-[#64748B]', bg: 'bg-[#EDF7F3]' },
            { label: 'Refrigerated', key: 'REFRIGERATED' as StorageKey, color: 'text-[#1A6B5C]', bg: 'bg-[#D6F0E8]' },
            { label: 'Frozen', key: 'FROZEN' as StorageKey, color: 'text-[#6D28D9]', bg: 'bg-[#EDE9FE]' },
          ].map((storage) => (
            <div key={storage.key} className={`${storage.bg} rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${storage.color}`}>
                {summary.inventory.storageBreakdown[storage.key] ?? 0}
              </p>
              <p className="text-xs text-[#64748B] mt-1">{storage.label}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="pb-2 text-center">
        <Link to="/forecasting" className="text-xs font-medium text-[#1A6B5C] hover:underline">
          Open forecasting workspace
        </Link>
      </div>
    </div>
  );
};

const KpiCard: React.FC<{
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  link: string;
}> = ({ label, value, sub, icon, color, link }) => (
  <Link to={link}>
    <div className="bg-white rounded-2xl border border-[#D6F0E8] p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm text-[#64748B] mb-1 truncate">{label}</p>
          <p className="text-xl font-bold text-[#0D4035] truncate">{value}</p>
          <p className="text-xs text-[#64748B] mt-1">{sub}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0 ml-3`}>
          {icon}
        </div>
      </div>
    </div>
  </Link>
);
