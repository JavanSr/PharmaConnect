import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Package, AlertTriangle, Clock, Plus, ArrowRight } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { usePharmacyStore } from '@/stores/pharmacyStore';

type DashboardSummary = {
  totalProducts?: number;
  lowStockCount?: number;
  expiryCount?: number;
};

type StatValue = number | string;

const getProductStock = (product: any) => {
  if (typeof product.currentStock === 'number') return product.currentStock;
  if (typeof product.totalQuantity === 'number') return product.totalQuantity;
  if (typeof product.quantityRemaining === 'number') return product.quantityRemaining;
  if (Array.isArray(product.batches)) {
    return product.batches.reduce((sum: number, batch: any) => sum + (Number(batch.quantityRemaining) || 0), 0);
  }
  return 0;
};

export const InventoryDashboardPage: React.FC = () => {
  const pharmacy = usePharmacyStore((state) => state.pharmacy);
  const { data: summaryData } = useQuery({ queryKey: ['inventory-dashboard-summary'], queryFn: () => api.get('/inventory/reports/dashboard-summary').then(r => r.data) });
  const { data: stockData } = useQuery({ queryKey: ['stock-on-hand'], queryFn: () => api.get('/inventory/reports/stock-on-hand').then(r => r.data) });
  const { data: expiryData } = useQuery({ queryKey: ['expiry-30'], queryFn: () => api.get('/inventory/reports/expiry?days=30').then(r => r.data) });
  const { data: lowStockData } = useQuery({ queryKey: ['low-stock'], queryFn: () => api.get('/inventory/reports/low-stock').then(r => r.data) });
  const isEnterprise = pharmacy?.subscriptionTier === 'ENTERPRISE';

  const summary: DashboardSummary | undefined = summaryData?.data;
  const products = useMemo(() => stockData?.data || [], [stockData?.data]);
  const expiryBatches = useMemo(() => expiryData?.data || [], [expiryData?.data]);
  const lowStock = useMemo(() => lowStockData?.data || [], [lowStockData?.data]);
  const totalUnits = useMemo(
    () => products.reduce((s: number, p: any) => s + getProductStock(p), 0),
    [products]
  );
  const stats = useMemo(
    () => [
      { label: 'Total SKUs', value: summary?.totalProducts ?? (stockData ? products.length : '-') as StatValue, icon: <Package size={20} />, color: 'bg-[#D6F0E8] text-[#1A6B5C]' },
      { label: 'Total Units', value: stockData ? totalUnits.toLocaleString() : '-', icon: <Package size={20} />, color: 'bg-[#D6F0E8] text-[#1A6B5C]' },
      { label: 'Low Stock', value: summary?.lowStockCount ?? (lowStockData ? lowStock.length : '-') as StatValue, icon: <AlertTriangle size={20} />, color: 'bg-amber-50 text-[#D97706]' },
      { label: 'Expiring <=30d', value: summary?.expiryCount ?? (expiryData ? expiryBatches.length : '-') as StatValue, icon: <Clock size={20} />, color: 'bg-red-50 text-[#DC2626]' },
    ],
    [expiryBatches, expiryData, lowStock, lowStockData, products, stockData, summary, totalUnits]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#0D4035]">Inventory</h1>
        <div className="flex gap-2 flex-wrap">
          <Link to="/inventory/receive"><Button leftIcon={<Plus size={16} />}>Receive Stock</Button></Link>
          <Link to="/inventory/adjust"><Button variant="secondary">Adjust Stock</Button></Link>
          <Link to="/inventory/products"><Button variant="secondary">Products / CSV</Button></Link>
          <Link to="/inventory/drug-master"><Button variant="secondary">Drug Catalogue</Button></Link>
          <Link to="/inventory/batches"><Button variant="secondary">Batches</Button></Link>
          <Link to="/inventory/conflicts"><Button variant="secondary">Conflicts</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#D6F0E8] p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[#64748B]">{s.label}</p>
                <p className="text-2xl font-bold text-[#0D4035] mt-0.5">{s.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center`}>{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-[#0D4035]">Drug Catalogue</p>
            <p className="mt-1 text-sm text-[#64748B]">
              A platform master list of medicines and reference details. It helps match local products when useful, but it is separate from the pharmacy stock list.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0D4035]">Stock work</p>
            <p className="mt-1 text-sm text-[#64748B]">
              Receive Stock adds batches, Batches shows expiry-level stock, and Adjust Stock creates owner-reviewed corrections.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0D4035]">Product setup</p>
            <p className="mt-1 text-sm text-[#64748B]">
              Products is where a pharmacy adds items manually or uploads a CSV to start using the system with its own stock list.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card header={
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-[#0D4035]">Low Stock Items</span>
            <div className="flex items-center gap-2">
              <Link to="/inventory/stock-orders/new?prefill=low-stock">
                <Button size="sm" variant="secondary">Prepare Restock Order</Button>
              </Link>
              <Link to="/inventory/products?filter=low-stock" className="text-xs text-[#1A6B5C] hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>
            </div>
          </div>
        } padding={false}>
          {lowStock.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#64748B]">All products adequately stocked</div>
          ) : (
            <div className="divide-y divide-[#D6F0E8]">
              {lowStock.slice(0, 6).map((p: any) => (
                <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#0D4035]">{p.genericName || p.name}</p>
                    <p className="text-xs text-[#64748B]">{p.dosageForm} {p.strength}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#DC2626]">{p.currentStock}</p>
                    <p className="text-xs text-[#64748B]">of {p.reorderLevel} min</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card header={
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#0D4035]">Expiring Soon</span>
            <Link to="/inventory/expiry" className="text-xs text-[#1A6B5C] hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>
          </div>
        } padding={false}>
          {expiryBatches.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#64748B]">No batches expiring within 30 days</div>
          ) : (
            <div className="divide-y divide-[#D6F0E8]">
              {expiryBatches.slice(0, 6).map((b: any) => {
                const days = differenceInDays(new Date(b.expiryDate), new Date());
                return (
                  <div key={b.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#0D4035]">{b.product?.name}</p>
                      <p className="text-xs text-[#64748B]">Batch {b.batchNumber} - {b.quantityRemaining} units</p>
                    </div>
                    <Badge variant={days <= 7 ? 'danger' : 'warning'} size="sm">
                      {days <= 0 ? 'EXPIRED' : `${days}d left`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#0D4035]">Enterprise logistics</p>
            <p className="text-sm text-[#64748B] mt-1">
              Multi-outlet visibility and inter-branch transfers are reserved for Enterprise pharmacies.
            </p>
          </div>
          {isEnterprise ? (
            <Badge variant="success" size="sm">Enterprise unlocked</Badge>
          ) : (
            <Link to="/settings/subscription">
              <Button>Upgrade to Enterprise</Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
};
