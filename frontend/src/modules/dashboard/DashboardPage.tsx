import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  Clock,
  Plus,
  ArrowRight,
  TrendingDown,
  ArrowDownUp,
  Activity,
  Wallet,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

interface StatCard {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  link: string;
  children?: React.ReactNode;
}

const formatTsh = (value: number | string | null | undefined) =>
  `Tsh ${Number(value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const RevenueSparkline: React.FC<{ data?: Array<{ date: string; revenue: number }> }> = ({ data }) => {
  const values = data?.map((point) => Number(point.revenue || 0)) ?? [];
  const hasTrend = values.filter((value) => value > 0).length >= 2;
  if (!hasTrend) return null;

  const width = 150;
  const height = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return null;

  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / (max - min)) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-8 w-full max-w-[150px]" aria-hidden="true" focusable="false">
      <polyline points={points} fill="none" stroke="#1A6B5C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const StatCardEl: React.FC<StatCard> = ({ label, value, icon, color, link, children }) => (
  <Link to={link}>
    <div className="bg-white rounded-2xl border border-[#D6F0E8] p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#64748B] mb-1">{label}</p>
          <p className="text-2xl font-bold text-[#0D4035]">{value}</p>
          {children}
        </div>
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  </Link>
);

export const DashboardPage: React.FC = () => {
  const user = useAuthStore(s => s.user);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data: summaryData } = useQuery({
    queryKey: ['dashboard-summary', todayStart.toISOString(), todayEnd.toISOString()],
    queryFn: () =>
      api
        .get(`/inventory/reports/dashboard-summary?dateFrom=${todayStart.toISOString()}&dateTo=${todayEnd.toISOString()}`)
        .then(r => r.data),
  });

  const summary = summaryData?.data;
  const expiryBatches = summary?.expiryBatches || [];
  const lowStockProducts = summary?.lowStockProducts || [];
  const recentMovements = summary?.recentMovements || [];
  const todayStats = summary?.today || {};
  const todayActivityTotal =
    Number(todayStats.dispensed ?? 0) +
    Number(todayStats.received ?? 0) +
    Number(todayStats.adjustments ?? 0) +
    Number(todayStats.events ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D4035]">{greeting}, {user?.firstName}!</h1>
          <p className="text-[#64748B] mt-1">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/dispensing">
            <Button leftIcon={<Plus size={16} />}>Dispense</Button>
          </Link>
          <Link to="/inventory/receive">
            <Button variant="secondary" leftIcon={<Plus size={16} />}>Receive Stock</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCardEl
          label="Today's Revenue"
          value={formatTsh(todayStats.revenue)}
          icon={<Wallet size={20} className="text-[#1A6B5C]" />}
          color="bg-[#D6F0E8]"
          link="/reports"
        >
          <RevenueSparkline data={todayStats.revenueLast7Days} />
        </StatCardEl>
        <StatCardEl
          label="Low Stock Items"
          value={summary?.lowStockCount ?? '--'}
          icon={<AlertTriangle size={20} className="text-[#D97706]" />}
          color="bg-amber-50"
          link="/inventory"
        />
        <StatCardEl
          label="Expiring <=30 Days"
          value={summary?.expiryCount ?? '--'}
          icon={<Clock size={20} className="text-[#DC2626]" />}
          color="bg-red-50"
          link="/inventory/expiry"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card
          header={
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#0D4035]">Low Stock Alerts</span>
              <Link to="/inventory" className="text-xs text-[#1A6B5C] hover:underline flex items-center gap-1">
                Manage <ArrowRight size={12} />
              </Link>
            </div>
          }
          padding={false}
        >
          {lowStockProducts.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#64748B]">No low-stock products right now</div>
          ) : (
            <div className="divide-y divide-[#D6F0E8]">
              {lowStockProducts.map((product: any) => {
                const reorderLevel = Math.max(product.reorderLevel || 1, 1);
                const currentStock = product.currentStock || 0;
                const pct = Math.min(100, Math.round((currentStock / reorderLevel) * 100));
                const critical = currentStock === 0;

                return (
                  <div key={product.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-[#0D4035] truncate flex-1">{product.name}</p>
                      <Badge variant={critical ? 'danger' : 'warning'} size="sm" className="ml-2 shrink-0">
                        {critical ? 'OUT' : `${currentStock}/${product.reorderLevel}`}
                      </Badge>
                    </div>
                    <div className="h-1.5 bg-[#D6F0E8] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${critical ? 'bg-[#DC2626]' : 'bg-[#D97706]'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card
          header={
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#0D4035]">Recent Movements</span>
              <Link to="/inventory" className="text-xs text-[#1A6B5C] hover:underline flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            </div>
          }
          padding={false}
        >
          {recentMovements.length === 0 ? (
            <div className="p-6 text-center text-sm text-[#64748B]">No movements recorded yet</div>
          ) : (
            <div className="divide-y divide-[#D6F0E8]">
              {recentMovements.map((movement: any) => {
                const typeColor: Record<string, string> = {
                  RECEIVED: 'success',
                  DISPENSED: 'info',
                  ADJUSTED: 'warning',
                  DAMAGED: 'danger',
                  EXPIRED_REMOVED: 'danger',
                  RETURNED: 'muted',
                };
                const sign = movement.type === 'RECEIVED' ? '+' : '-';

                return (
                  <div key={movement.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0D4035] truncate">{movement.product?.name}</p>
                      <p className="text-xs text-[#64748B]">
                        {movement.user?.firstName} {movement.user?.lastName}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={(typeColor[movement.type] || 'muted') as any} size="sm">
                        {movement.type.replace(/_/g, ' ')}
                      </Badge>
                      <p className="text-xs font-semibold text-[#0D4035] mt-1">
                        {sign}{movement.quantity} units
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card header={<span className="text-sm font-semibold text-[#0D4035]">Today's Activity</span>}>
          {todayActivityTotal === 0 ? (
            <div className="p-8 text-center text-sm text-[#64748B]">No activity recorded today yet.</div>
          ) : (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between p-3 bg-[#D6F0E8] rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#1A6B5C] rounded-xl flex items-center justify-center">
                    <TrendingDown size={15} className="text-white" />
                  </div>
                  <span className="text-sm text-[#0D4035]">Dispensed</span>
                </div>
                <span className="text-lg font-bold text-[#1A6B5C]">{todayStats.dispensed ?? 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#EDF7F3] rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#1D9E75] rounded-xl flex items-center justify-center">
                    <Package size={15} className="text-white" />
                  </div>
                  <span className="text-sm text-[#0D4035]">Received</span>
                </div>
                <span className="text-lg font-bold text-[#1D9E75]">{todayStats.received ?? 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#D97706] rounded-xl flex items-center justify-center">
                    <ArrowDownUp size={15} className="text-white" />
                  </div>
                  <span className="text-sm text-[#0D4035]">Adjustments</span>
                </div>
                <span className="text-lg font-bold text-[#D97706]">{todayStats.adjustments ?? 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#EDF7F3] rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#64748B] rounded-xl flex items-center justify-center">
                    <Activity size={15} className="text-white" />
                  </div>
                  <span className="text-sm text-[#0D4035]">Total Events</span>
                </div>
                <span className="text-lg font-bold text-[#0D4035]">{todayStats.events ?? 0}</span>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card
        header={
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#0D4035]">Expiry Countdown</span>
            <Link to="/inventory/expiry" className="text-xs text-[#1A6B5C] hover:underline flex items-center gap-1">
              All expiry <ArrowRight size={12} />
            </Link>
          </div>
        }
        padding={false}
      >
        {expiryBatches.length === 0 ? (
          <div className="p-8 text-center text-[#64748B] text-sm">No batches expiring within 30 days</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#D6F0E8]">
            {expiryBatches.slice(0, 6).map((batch: any) => {
              const days = differenceInDays(new Date(batch.expiryDate), new Date());

              return (
                <div key={batch.id} className="px-5 py-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0D4035] truncate">{batch.product?.name || 'Unknown'}</p>
                    <p className="text-xs text-[#64748B]">Batch {batch.batchNumber} - {batch.quantityRemaining} units</p>
                  </div>
                  <Badge variant={days <= 0 ? 'danger' : days <= 7 ? 'danger' : 'warning'} size="sm" className="ml-3 shrink-0">
                    {days <= 0 ? 'EXPIRED' : `${days}d left`}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
