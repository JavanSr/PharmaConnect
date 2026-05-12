import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, BarChart3, PackageSearch, TrendingUp } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

type AnalyticsFeatures = {
  tier: 'ADDO' | 'ESSENTIAL' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE' | 'WHOLESALE' | null;
  stockout: boolean;
  forecast: boolean;
  seasonality: boolean;
  deadStock: boolean;
};

type StockoutForecastItem = {
  productId: string;
  productName: string;
  currentStock: number;
  avgDailyDemand: number;
  leadTimeDays: number;
  daysUntilStockout: number | null;
  estimatedStockoutDate: string | null;
  valueTzs: number;
  status: 'OUT' | 'RISK' | 'OK';
};

type SeasonalityPoint = {
  key: string;
  label: string;
  dispensedUnits: number;
  revenueTzs: number;
};

type DeadStockItem = {
  productId: string;
  productName: string;
  currentStock: number;
  valueTzs: number;
  daysSinceSale: number;
  deadStockScore: number;
  lastSaleAt: string | null;
};

type RegionalStub = {
  enabled: boolean;
  status: 'disabled' | 'stub';
  message: string;
};

const TZS = (value: number) =>
  new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
  }).format(value);

export const ForecastingPage: React.FC = () => {
  const featuresQuery = useQuery<{ data: AnalyticsFeatures }>({
    queryKey: ['analytics-features'],
    queryFn: () => api.get('/analytics/features').then((response) => response.data),
    staleTime: 60_000,
  });
  const stockoutQuery = useQuery<{ data: StockoutForecastItem[] }>({
    queryKey: ['forecasting-stockout'],
    queryFn: () => api.get('/forecasting/stockout').then((response) => response.data),
    staleTime: 60_000,
  });
  const seasonalityQuery = useQuery<{ data: SeasonalityPoint[] }>({
    queryKey: ['forecasting-seasonality'],
    queryFn: () => api.get('/forecasting/seasonality').then((response) => response.data),
    enabled: featuresQuery.data?.data.seasonality === true,
    staleTime: 60_000,
  });
  const deadStockQuery = useQuery<{ data: DeadStockItem[] }>({
    queryKey: ['forecasting-dead-stock'],
    queryFn: () => api.get('/forecasting/dead-stock').then((response) => response.data),
    enabled: featuresQuery.data?.data.deadStock === true,
    staleTime: 60_000,
  });
  const regionalQuery = useQuery<{ data: RegionalStub }>({
    queryKey: ['forecasting-regional'],
    queryFn: () => api.get('/forecasting/regional').then((response) => response.data),
    enabled: featuresQuery.data?.data.forecast === true,
    staleTime: 60_000,
  });

  const features = featuresQuery.data?.data;

  return (
    <div className="space-y-6">
      {/* Early preview banner */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Early preview — indicative data only</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Forecasting engines are being calibrated. Figures shown are based on available stock movement history and may not yet reflect full accuracy. Full forecasting launches in Phase 2.
          </p>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link to="/analytics" className="inline-flex items-center gap-2 text-sm text-[#1A6B5C] hover:underline">
            <ArrowLeft size={15} />
            Back to analytics
          </Link>
          <h1 className="mt-2 text-xl font-bold text-[#0D4035]">Forecasting</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Deterministic forecasting only: moving averages, lead times, 12-month seasonality, and dead-stock scoring.
          </p>
        </div>
        {features?.tier && <Badge variant="info" size="sm">{features.tier} tier</Badge>}
      </div>

      <Card
        header={
          <div className="flex items-center gap-2">
            <PackageSearch size={16} className="text-[#1A6B5C]" />
            <span className="text-sm font-semibold text-[#0D4035]">Stockout forecast</span>
          </div>
        }
      >
        {stockoutQuery.isLoading ? (
          <div className="flex items-center justify-center h-44">
            <div className="w-8 h-8 border-3 border-[#1A6B5C] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : stockoutQuery.isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#DC2626]">
            Stockout forecasting could not be loaded.
          </div>
        ) : (
          <div className="space-y-3">
            {stockoutQuery.data?.data.map((item) => (
              <div key={item.productId} className="rounded-2xl border border-[#D6F0E8] bg-[#F8FAFC] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#0D4035]">{item.productName}</p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      Current stock {item.currentStock} • Avg/day {item.avgDailyDemand.toFixed(1)} • Lead time {item.leadTimeDays} days
                    </p>
                  </div>
                  <Badge variant={item.status === 'OUT' ? 'danger' : item.status === 'RISK' ? 'warning' : 'success'} size="sm">
                    {item.status}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-[#64748B]">Stockout in</p>
                    <p className="font-semibold text-[#0D4035]">{item.daysUntilStockout ?? 'N/A'} days</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B]">Estimated date</p>
                    <p className="font-semibold text-[#0D4035]">{item.estimatedStockoutDate ? new Date(item.estimatedStockoutDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B]">At-risk value</p>
                    <p className="font-semibold text-[#0D4035]">{TZS(item.valueTzs)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {features?.seasonality ? (
        <Card
          header={
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-[#1A6B5C]" />
              <span className="text-sm font-semibold text-[#0D4035]">Seasonality (12 months)</span>
            </div>
          }
        >
          {seasonalityQuery.isLoading ? (
            <div className="flex items-center justify-center h-52">
              <div className="w-8 h-8 border-3 border-[#1A6B5C] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={seasonalityQuery.data?.data ?? []}>
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #D6F0E8', fontSize: 12 }}
                  formatter={(value, name) => [
                    name === 'revenueTzs' ? TZS(Number(value)) : Number(value).toLocaleString(),
                    name === 'revenueTzs' ? 'Revenue' : 'Dispensed units',
                  ]}
                />
                <Area type="monotone" dataKey="dispensedUnits" stroke="#1A6B5C" fill="#D6F0E8" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      ) : (
        <Card>
          <div className="flex items-start gap-3 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] px-4 py-4 text-sm text-[#92400E]">
            <AlertTriangle size={16} className="mt-0.5" />
            <div>
              <p className="font-semibold text-[#7C2D12]">Seasonality is a Premium feature</p>
              <p className="mt-1">Upgrade the active outlet to Premium or Enterprise to unlock 12-month monthly seasonality.</p>
            </div>
          </div>
        </Card>
      )}

      {features?.deadStock ? (
        <Card
          header={
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-[#1A6B5C]" />
              <span className="text-sm font-semibold text-[#0D4035]">Dead stock ranking</span>
            </div>
          }
        >
          {deadStockQuery.isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-3 border-[#1A6B5C] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-3">
                {deadStockQuery.data?.data.map((item) => (
                  <div key={item.productId} className="rounded-2xl border border-[#D6F0E8] bg-[#F8FAFC] px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#0D4035]">{item.productName}</p>
                        <p className="mt-1 text-xs text-[#64748B]">
                          {item.currentStock} units on hand • {item.daysSinceSale} days since sale
                        </p>
                      </div>
                      <Badge variant="warning" size="sm">{TZS(item.deadStockScore)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={(deadStockQuery.data?.data ?? []).slice(0, 8)}>
                  <XAxis dataKey="productName" hide />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #D6F0E8', fontSize: 12 }}
                    formatter={(value) => [TZS(Number(value)), 'Dead-stock score']}
                  />
                  <Bar dataKey="deadStockScore" fill="#D97706" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      ) : null}

      {features?.forecast && (
        <Card
          header={
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-[#1A6B5C]" />
              <span className="text-sm font-semibold text-[#0D4035]">Regional demand insights</span>
            </div>
          }
        >
          <div className="rounded-2xl border border-[#D6F0E8] bg-[#F8FAFC] px-4 py-4 text-sm text-[#475569]">
            {regionalQuery.data?.data.message ?? 'Loading regional forecasting status...'}
          </div>
        </Card>
      )}
    </div>
  );
};
