import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import type {
  VatInvoice,
  WholesaleCatalogueItem,
  WholesaleCreditLimit,
  WholesaleDemandInsights,
  WholesaleOrder,
  WholesaleReceivablesAging,
} from '@/types';
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
  const creditLimitsQuery = useQuery({
    queryKey: ['wholesale-credit-limits'],
    queryFn: () => api.get('/b2b/credit-limits').then((response) => response.data.data as WholesaleCreditLimit[]),
  });
  const receivablesQuery = useQuery({
    queryKey: ['wholesale-receivables-aging'],
    queryFn: () => api.get('/b2b/receivables-aging').then((response) => response.data.data as WholesaleReceivablesAging),
  });
  const demandInsightsQuery = useQuery({
    queryKey: ['wholesale-demand-insights'],
    queryFn: () => api.get('/b2b/demand-insights').then((response) => response.data.data as WholesaleDemandInsights),
  });

  return (
    <WholesaleShell>
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-4">
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
          <Card>
            <p className="text-sm text-[#64748B]">Open receivables</p>
            <p className="mt-2 text-3xl font-semibold text-[#0D4035]">Tsh {(receivablesQuery.data?.totalOpenAmount ?? 0).toLocaleString()}</p>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
          <Card header={<h2 className="text-lg font-semibold text-[#0D4035]">Demand insights</h2>}>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#D6F0E8] bg-[#F7FCFA] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">Current 30 days</p>
                  <p className="mt-2 text-2xl font-semibold text-[#0D4035]">{demandInsightsQuery.data?.windows.current30d.units ?? 0} units</p>
                  <p className="mt-1 text-sm text-[#64748B]">Tsh {(demandInsightsQuery.data?.windows.current30d.revenueTzs ?? 0).toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-[#D6F0E8] bg-[#F7FCFA] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">Previous 30 days</p>
                  <p className="mt-2 text-2xl font-semibold text-[#0D4035]">{demandInsightsQuery.data?.windows.previous30d.units ?? 0} units</p>
                  <p className="mt-1 text-sm text-[#64748B]">Tsh {(demandInsightsQuery.data?.windows.previous30d.revenueTzs ?? 0).toLocaleString()}</p>
                </div>
              </div>
              <div className="space-y-3">
                {(demandInsightsQuery.data?.topProducts ?? []).map((product) => (
                  <div key={product.productId} className="rounded-2xl border border-[#D6F0E8] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-[#0D4035]">{product.productName}</p>
                        <p className="text-sm text-[#64748B]">{product.units.toLocaleString()} units across {product.activeBuyers} buyers</p>
                      </div>
                      <p className="text-sm font-semibold text-[#0D4035]">Tsh {product.revenueTzs.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {(demandInsightsQuery.data?.topProducts?.length ?? 0) === 0 && <p className="text-sm text-[#64748B]">Demand insights will appear after confirmed wholesale orders land.</p>}
              </div>
            </div>
          </Card>

          <Card header={<h2 className="text-lg font-semibold text-[#0D4035]">Receivables aging</h2>}>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'Current', value: receivablesQuery.data?.buckets.current ?? 0 },
                  { label: '31-60 days', value: receivablesQuery.data?.buckets.days31To60 ?? 0 },
                  { label: '61-90 days', value: receivablesQuery.data?.buckets.days61To90 ?? 0 },
                  { label: '90+ days', value: receivablesQuery.data?.buckets.over90 ?? 0 },
                ].map((bucket) => (
                  <div key={bucket.label} className="rounded-2xl border border-[#D6F0E8] bg-[#F7FCFA] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">{bucket.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-[#0D4035]">Tsh {bucket.value.toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {(receivablesQuery.data?.invoices ?? []).slice(0, 5).map((invoice) => (
                  <div key={invoice.invoiceId} className="rounded-2xl border border-[#D6F0E8] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-[#0D4035]">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-[#64748B]">{invoice.buyerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#0D4035]">Tsh {invoice.openAmount.toLocaleString()}</p>
                        <p className="text-xs text-[#64748B]">{invoice.daysOutstanding} days outstanding</p>
                      </div>
                    </div>
                  </div>
                ))}
                {(receivablesQuery.data?.invoices?.length ?? 0) === 0 && <p className="text-sm text-[#64748B]">No open receivables yet.</p>}
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card header={<h2 className="text-lg font-semibold text-[#0D4035]">Open Orders</h2>}>
            <div className="space-y-3">
              {(ordersQuery.data ?? []).slice(0, 8).map((order) => (
                <div key={order.id} className="rounded-2xl border border-[#D6F0E8] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-[#0D4035]">{order.orderNumber}</p>
                      <p className="text-sm text-[#64748B]">{order.items.length} line items</p>
                      {order.scheduledDeliveryAt && (
                        <p className="text-xs text-[#64748B]">
                          Scheduled {new Date(order.scheduledDeliveryAt).toLocaleString()}
                          {order.deliveryWindowLabel ? ` · ${order.deliveryWindowLabel}` : ''}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-[#EDF7F3] px-3 py-1 text-xs font-semibold text-[#0D4035]">{order.status}</span>
                  </div>
                </div>
              ))}
              {ordersQuery.data?.length === 0 && <p className="text-sm text-[#64748B]">No B2B orders yet.</p>}
            </div>
          </Card>

          <div className="space-y-4">
            <Card header={<h2 className="text-lg font-semibold text-[#0D4035]">EFDMS invoice queue</h2>}>
              <div className="space-y-3">
                {(invoicesQuery.data ?? []).slice(0, 5).map((invoice) => (
                  <div key={invoice.id} className="rounded-2xl border border-[#D6F0E8] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-[#0D4035]">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-[#64748B]">Tsh {invoice.totalAmount.toLocaleString()}</p>
                      </div>
                      <span className="rounded-full bg-[#FFF7ED] px-3 py-1 text-xs font-semibold text-[#B45309]">{invoice.efdmsStatus ?? 'STUBBED'}</span>
                    </div>
                  </div>
                ))}
                {invoicesQuery.data?.length === 0 && <p className="text-sm text-[#64748B]">No VAT invoices issued yet.</p>}
              </div>
            </Card>

            <Card header={<h2 className="text-lg font-semibold text-[#0D4035]">Credit controls</h2>}>
              <div className="space-y-3">
                {(creditLimitsQuery.data ?? []).slice(0, 4).map((limit) => (
                  <div key={limit.id} className="rounded-2xl border border-[#D6F0E8] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-[#0D4035]">{limit.clientName ?? limit.clientPharmacyId}</p>
                        <p className="text-sm text-[#64748B]">Limit Tsh {limit.creditLimit.toLocaleString()} · Outstanding Tsh {limit.outstandingBalance.toLocaleString()}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${limit.blockNewOrders ? 'bg-[#FEF2F2] text-[#B91C1C]' : 'bg-[#EDF7F3] text-[#0D4035]'}`}>
                        {limit.blockNewOrders ? 'Blocked' : 'Open'}
                      </span>
                    </div>
                  </div>
                ))}
                {creditLimitsQuery.data?.length === 0 && <p className="text-sm text-[#64748B]">No client credit rules saved yet.</p>}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </WholesaleShell>
  );
};
