import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import type { VatInvoice, WholesaleCatalogueItem, WholesaleOrder } from '@/types';
import { WholesaleShell } from './WholesaleShell';

export const WholesaleDashboardPage: React.FC = () => {
  const catalogueQuery = useQuery({
    queryKey: ['wholesale-catalogue'],
    queryFn: () => api.get('/b2b/catalogue').then((response) => response.data.data as WholesaleCatalogueItem[]),
  });

  const ordersQuery = useQuery({
    queryKey: ['wholesale-orders'],
    queryFn: () => api.get('/b2b/orders').then((response) => response.data.data as WholesaleOrder[]),
  });

  const invoicesQuery = useQuery({
    queryKey: ['wholesale-invoices'],
    queryFn: () => api.get('/b2b/invoices').then((response) => response.data.data as VatInvoice[]),
  });

  return (
    <WholesaleShell>
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
    </WholesaleShell>
  );
};
