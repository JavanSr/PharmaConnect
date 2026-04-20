import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import type { VatInvoice, WholesaleCatalogueItem, WholesaleOrder } from '@/types';

const ALLOWED_ROLES = ['OWNER', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF', 'DELIVERY_STAFF', 'SUPER_ADMIN'];

export const WholesaleDashboardPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const allowed = !!user?.role && ALLOWED_ROLES.includes(user.role);

  const catalogueQuery = useQuery({
    queryKey: ['wholesale-catalogue'],
    queryFn: () => api.get('/b2b/catalogue').then((response) => response.data.data as WholesaleCatalogueItem[]),
    enabled: allowed,
  });

  const ordersQuery = useQuery({
    queryKey: ['wholesale-orders'],
    queryFn: () => api.get('/b2b/orders').then((response) => response.data.data as WholesaleOrder[]),
    enabled: allowed,
  });

  const invoicesQuery = useQuery({
    queryKey: ['wholesale-invoices'],
    queryFn: () => api.get('/b2b/invoices').then((response) => response.data.data as VatInvoice[]),
    enabled: allowed,
  });

  if (!allowed) {
    return (
      <Card className="max-w-3xl">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B45309]">403</p>
          <h1 className="text-2xl font-semibold text-[#0D4035]">Wholesale access is restricted</h1>
          <p className="text-sm text-[#4B5563]">
            This route is reserved for wholesale operations roles. Dispensing roles can stay in the retail workflow, but they cannot access the wholesale dashboard.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <p className="text-sm text-[#64748B]">Catalogue lines</p>
          <p className="mt-2 text-3xl font-semibold text-[#0D4035]">{catalogueQuery.data?.length ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-[#64748B]">Orders in view</p>
          <p className="mt-2 text-3xl font-semibold text-[#0D4035]">{ordersQuery.data?.length ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-[#64748B]">VAT invoices</p>
          <p className="mt-2 text-3xl font-semibold text-[#0D4035]">{invoicesQuery.data?.length ?? 0}</p>
        </Card>
      </div>

      <Card header={<h2 className="text-lg font-semibold text-[#0D4035]">Open Orders</h2>}>
        <div className="space-y-3">
          {(ordersQuery.data ?? []).slice(0, 8).map((order) => (
            <div key={order.id} className="rounded-2xl border border-[#D6F0E8] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-[#0D4035]">{order.orderNumber}</p>
                  <p className="text-sm text-[#64748B]">{order.items.length} line items</p>
                </div>
                <span className="rounded-full bg-[#EDF7F3] px-3 py-1 text-xs font-semibold text-[#0D4035]">{order.status}</span>
              </div>
            </div>
          ))}
          {ordersQuery.data?.length === 0 && <p className="text-sm text-[#64748B]">No B2B orders yet.</p>}
        </div>
      </Card>
    </div>
  );
};
