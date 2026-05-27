import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ClipboardList, Eye, PackageCheck, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { statusBadgeVariant, statusLabel, type StockOrder, type StockOrderStatus } from './stockOrderTypes';

const tabs: Array<{ label: string; value: StockOrderStatus | 'ALL' }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Receiving', value: 'PARTIALLY_RECEIVED' },
  { label: 'Received', value: 'RECEIVED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export const StockOrderListPage: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<StockOrderStatus | 'ALL'>('ALL');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['stock-orders', status],
    queryFn: () =>
      api
        .get('/stock-orders', { params: status === 'ALL' ? {} : { status } })
        .then((r) => r.data as { data: StockOrder[] }),
  });

  const orders = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0D4035]">Order Preparation</h1>
          <p className="text-sm text-[#64748B]">Prepare purchase orders for external suppliers before stock runs out.</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => navigate('/inventory/stock-orders/new')}>
          Prepare New Order
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatus(tab.value)}
            className={`h-9 rounded-lg border px-3 text-sm font-medium transition-colors ${
              status === tab.value
                ? 'border-[#1A6B5C] bg-[#1A6B5C] text-white'
                : 'border-[#D6F0E8] bg-white text-[#0D4035] hover:bg-[#EDF7F3]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#D6F0E8] text-sm">
            <thead className="bg-[#F8FCFA] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
              <tr>
                <th className="px-5 py-3">Order No.</th>
                <th className="px-5 py-3">Date created</th>
                <th className="px-5 py-3">Suppliers</th>
                <th className="px-5 py-3">Items</th>
                <th className="px-5 py-3">Expected by</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D6F0E8] bg-white">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-[#64748B]">Loading orders...</td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-red-500">
                    Could not load orders — check your connection and that the backend is running.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                      <ClipboardList size={28} className="text-[#1A6B5C]" />
                      <p className="text-sm font-medium text-[#0D4035]">No purchase orders yet</p>
                      <Button size="sm" onClick={() => navigate('/inventory/stock-orders/new')}>Prepare first order</Button>
                    </div>
                  </td>
                </tr>
              )}
              {orders.map((order) => {
                const actionPath =
                  order.status === 'DRAFT'
                    ? `/inventory/stock-orders/${order.id}/edit`
                    : `/inventory/stock-orders/${order.id}`;
                const actionLabel = order.status === 'DRAFT' ? 'Continue' : order.status === 'SUBMITTED' || order.status === 'PARTIALLY_RECEIVED' ? 'Receive' : 'View';
                return (
                  <tr key={order.id} className="hover:bg-[#F8FCFA]">
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#0D4035]">{order.orderNumber}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-[#475569]">{format(new Date(order.createdAt), 'dd MMM yyyy')}</td>
                    <td className="min-w-48 px-5 py-4 text-[#475569]">{order.supplierSummary || 'No supplier assigned'}</td>
                    <td className="px-5 py-4 text-[#475569]">{order.itemCount ?? 0}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-[#475569]">
                      {order.expectedBy ? format(new Date(order.expectedBy), 'dd MMM yyyy') : '-'}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={statusBadgeVariant(order.status)}>{statusLabel(order.status)}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Link to={`/inventory/stock-orders/${order.id}`} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-[#1A6B5C] hover:bg-[#EDF7F3]">
                          <Eye size={14} /> View
                        </Link>
                        <Button
                          size="sm"
                          variant={order.status === 'DRAFT' ? 'secondary' : 'primary'}
                          leftIcon={order.status === 'SUBMITTED' || order.status === 'PARTIALLY_RECEIVED' ? <PackageCheck size={14} /> : undefined}
                          onClick={() => navigate(actionPath)}
                        >
                          {actionLabel}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
