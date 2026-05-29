import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import type {
  Supplier,
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

  const suppliersQuery = useQuery({
    queryKey: ['b2b-suppliers'],
    queryFn: () => api.get('/b2b/suppliers').then((r) => r.data.data as Supplier[]),
  });

  const hasCatalogue = (catalogueQuery.data?.length ?? 0) > 0;
  const hasSuppliers = (suppliersQuery.data?.length ?? 0) > 0;
  const hasOrders = (ordersQuery.data?.length ?? 0) > 0;
  const allLoaded = !catalogueQuery.isLoading && !suppliersQuery.isLoading && !ordersQuery.isLoading;
  const showChecklist = allLoaded && (!hasCatalogue || !hasSuppliers);

  const SETUP_STEPS = [
    {
      done: hasCatalogue,
      label: 'Add products to your wholesale catalogue',
      description: 'Set base and tier prices so buyer pharmacies can see and order your products.',
      href: '/wholesale/settings',
      cta: 'Go to Settings → Catalogue',
    },
    {
      done: hasSuppliers,
      label: 'Add your suppliers',
      description: 'Register the manufacturers or distributors you buy stock from. Required for purchase orders.',
      href: '/wholesale/settings',
      cta: 'Go to Settings → Your suppliers',
    },
    {
      done: false,
      label: 'Invite delivery staff',
      description: 'Add a team member with the DELIVERY_STAFF role so you can assign delivery manifests.',
      href: '/settings/team',
      cta: 'Open Team settings',
    },
  ];

  return (
    <WholesaleShell>
      <div className="space-y-stack-lg">
        {showChecklist && (
          <Card header={
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-[#0D4035]">Getting started</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                {SETUP_STEPS.filter((s) => !s.done).length} remaining
              </span>
            </div>
          }>
            <div className="space-y-3">
              {SETUP_STEPS.map((step) => (
                <div key={step.label} className={`flex gap-3 rounded-2xl border p-4 ${step.done ? 'border-[#AFDFD3] bg-[#EDF7F3] opacity-60' : 'border-[#D6F0E8]'}`}>
                  <div className="mt-0.5 shrink-0">
                    {step.done
                      ? <CheckCircle2 size={18} className="text-[#1A6B5C]" />
                      : <Circle size={18} className="text-[#94A3B8]" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${step.done ? 'line-through text-[#94A3B8]' : 'text-[#0D4035]'}`}>{step.label}</p>
                    {!step.done && (
                      <>
                        <p className="mt-0.5 text-xs text-[#64748B]">{step.description}</p>
                        <Link to={step.href} className="mt-2 inline-block text-xs font-semibold text-[#1A6B5C] hover:underline">
                          {step.cta} →
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid gap-gutter sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-primary text-on-primary">
            <p className="text-label-lg text-on-primary/80">Catalogue lines</p>
            <p className="mt-2 text-headline-md">{catalogueQuery.data?.length ?? 0}</p>
          </Card>
          <Card>
            <p className="text-label-lg text-on-surface-variant">Orders in view</p>
            <p className="mt-2 text-headline-md text-on-surface">{ordersQuery.data?.length ?? 0}</p>
          </Card>
          <Card>
            <p className="text-label-lg text-on-surface-variant">VAT invoices</p>
            <p className="mt-2 text-headline-md text-on-surface">{invoicesQuery.data?.length ?? 0}</p>
          </Card>
          <Card>
            <p className="text-label-lg text-on-surface-variant">Open receivables</p>
            <p className="mt-2 text-title-lg text-on-surface">Tsh {(receivablesQuery.data?.totalOpenAmount ?? 0).toLocaleString()}</p>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
          <Card header={<h2 className="text-title-md text-on-surface">Demand insights</h2>}>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-outline-variant/30 bg-surface-container-high p-4">
                  <p className="text-label-md uppercase tracking-[0.2em] text-on-surface-variant">Current 30 days</p>
                  <p className="mt-2 text-title-lg text-on-surface">{demandInsightsQuery.data?.windows.current30d.units ?? 0} units</p>
                  <p className="mt-1 text-body-md text-on-surface-variant">Tsh {(demandInsightsQuery.data?.windows.current30d.revenueTzs ?? 0).toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-outline-variant/30 bg-surface-container-high p-4">
                  <p className="text-label-md uppercase tracking-[0.2em] text-on-surface-variant">Previous 30 days</p>
                  <p className="mt-2 text-title-lg text-on-surface">{demandInsightsQuery.data?.windows.previous30d.units ?? 0} units</p>
                  <p className="mt-1 text-body-md text-on-surface-variant">Tsh {(demandInsightsQuery.data?.windows.previous30d.revenueTzs ?? 0).toLocaleString()}</p>
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
