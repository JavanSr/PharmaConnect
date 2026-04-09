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
}

const StatCardEl: React.FC<StatCard> = ({ label, value, icon, color, link }) => (
  <Link to={link}>
    <div className="bg-white rounded-2xl border border-[#D6F0E8] p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#64748B] mb-1">{label}</p>
          <p className="text-2xl font-bold text-[#0D4035]">{value}</p>
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

  const { data: stockData } = useQuery({
    queryKey: ['dashboard-stock'],
    queryFn: () => api.get('/inventory/reports/stock-on-hand').then(r => r.data),
  });

  const { data: expiryData } = useQuery({
    queryKey: ['dashboard-expiry'],
    queryFn: () => api.get('/inventory/reports/expiry?days=30').then(r => r.data),
  });

  const { data: movementsData } = useQuery({
    queryKey: ['dashboard-movements'],
    queryFn: () => api.get('/inventory/movements?limit=8').then(r => r.data),
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data: todayData } = useQuery({
    queryKey: ['dashboard-today'],
    queryFn: () =>
      api
        .get(`/inventory/movements?dateFrom=${todayStart.toISOString()}&dateTo=${todayEnd.toISOString()}&limit=100`)
        .then(r => r.data),
  });

  const expiryBatches = expiryData?.data || [];
  const allProducts = stockData?.data || [];
  const lowStockCount = allProducts.filter((product: any) =>
    (product.currentStock || 0) < product.reorderLevel
  ).length;

  const lowStockProducts = [...allProducts]
    .filter((product: any) => (product.currentStock || 0) < product.reorderLevel)
    .sort((a: any, b: any) => {
      const aRatio = (a.currentStock || 0) / Math.max(a.reorderLevel || 1, 1);
      const bRatio = (b.currentStock || 0) / Math.max(b.reorderLevel || 1, 1);
      return aRatio - bRatio;
    })
    .slice(0, 6);

  const recentMovements = movementsData?.data || [];
  const todayMovements = todayData?.data || [];
  const todayDispensed = todayMovements
    .filter((movement: any) => movement.type === 'DISPENSED')
    .reduce((sum: number, movement: any) => sum + movement.quantity, 0);
  const todayReceived = todayMovements
    .filter((movement: any) => movement.type === 'RECEIVED')
    .reduce((sum: number, movement: any) => sum + movement.quantity, 0);
  const todayAdjustments = todayMovements.filter((movement: any) =>
    ['ADJUSTED', 'DAMAGED', 'EXPIRED_REMOVED'].includes(movement.type)
  ).length;
  const todayEvents = todayMovements.length;

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
          label="Total Products"
          value={allProducts.length || '--'}
          icon={<Package size={20} className="text-[#1A6B5C]" />}
          color="bg-[#D6F0E8]"
          link="/inventory/products"
        />
        <StatCardEl
          label="Low Stock Items"
          value={lowStockCount}
          icon={<AlertTriangle size={20} className="text-[#D97706]" />}
          color="bg-amber-50"
          link="/inventory"
        />
        <StatCardEl
          label="Expiring <=30 Days"
          value={expiryBatches.length}
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
            <div className="p-6 text-center text-sm text-[#64748B]">All stock levels are healthy</div>
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
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between p-3 bg-[#D6F0E8] rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#1A6B5C] rounded-xl flex items-center justify-center">
                  <TrendingDown size={15} className="text-white" />
                </div>
                <span className="text-sm text-[#0D4035]">Dispensed</span>
              </div>
              <span className="text-lg font-bold text-[#1A6B5C]">{todayDispensed}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#EDF7F3] rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#1D9E75] rounded-xl flex items-center justify-center">
                  <Package size={15} className="text-white" />
                </div>
                <span className="text-sm text-[#0D4035]">Received</span>
              </div>
              <span className="text-lg font-bold text-[#1D9E75]">{todayReceived}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#D97706] rounded-xl flex items-center justify-center">
                  <ArrowDownUp size={15} className="text-white" />
                </div>
                <span className="text-sm text-[#0D4035]">Adjustments</span>
              </div>
              <span className="text-lg font-bold text-[#D97706]">{todayAdjustments}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#EDF7F3] rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#64748B] rounded-xl flex items-center justify-center">
                  <Activity size={15} className="text-white" />
                </div>
                <span className="text-sm text-[#0D4035]">Total Events</span>
              </div>
              <span className="text-lg font-bold text-[#0D4035]">{todayEvents}</span>
            </div>
          </div>
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
