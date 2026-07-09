import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Circle,
  ClipboardList,
  CreditCard,
  FileText,
  Package,
  PackagePlus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useNotificationStore } from '@/stores/notificationStore';
import type {
  VatInvoice,
  WholesaleBackorder,
  WholesaleCatalogueItem,
  WholesaleCreditLimit,
  WholesaleDemandInsights,
  WholesaleOrder,
  WholesaleReceivablesAging,
} from '@/types';
import { WholesaleShell } from './WholesaleShell';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', SUBMITTED: 'Submitted', CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled', PACKED: 'Packed', DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered', COMPLETED: 'Completed', DISPUTED: 'Disputed',
};

const STATUS_STYLE: Record<string, string> = {
  SUBMITTED: 'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-blue-50 text-blue-700',
  PACKED: 'bg-[#EDF7F3] text-[#1A6B5C]',
  DISPATCHED: 'bg-purple-50 text-purple-700',
  DELIVERED: 'bg-green-50 text-green-700',
  COMPLETED: 'bg-[#D6F0E8] text-[#0D4035]',
  DISPUTED: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
  DRAFT: 'bg-slate-100 text-slate-600',
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-TZ', { day: '2-digit', month: 'short' });
}

export const WholesaleDashboardPage: React.FC = () => {
  const toast = useNotificationStore((s) => s.toast);
  const queryClient = useQueryClient();
  const catalogueQuery = useQuery({
    queryKey: ['wholesale-catalogue'],
    queryFn: () => api.get('/b2b/catalogue').then((r) => r.data.data as WholesaleCatalogueItem[]),
  });
  const ordersQuery = useQuery({
    queryKey: ['wholesale-orders'],
    queryFn: () => api.get('/b2b/orders').then((r) => r.data.data as WholesaleOrder[]),
  });
  const invoicesQuery = useQuery({
    queryKey: ['wholesale-invoices'],
    queryFn: () => api.get('/b2b/invoices').then((r) => r.data.data as VatInvoice[]),
  });
  const creditLimitsQuery = useQuery({
    queryKey: ['wholesale-credit-limits'],
    queryFn: () => api.get('/b2b/credit-limits').then((r) => r.data.data as WholesaleCreditLimit[]),
  });
  const receivablesQuery = useQuery({
    queryKey: ['wholesale-receivables-aging'],
    queryFn: () => api.get('/b2b/receivables-aging').then((r) => r.data.data as WholesaleReceivablesAging),
  });
  const demandInsightsQuery = useQuery({
    queryKey: ['wholesale-demand-insights'],
    queryFn: () => api.get('/b2b/demand-insights').then((r) => r.data.data as WholesaleDemandInsights),
  });
  const backordersQuery = useQuery({
    queryKey: ['wholesale-backorders'],
    queryFn: () => api.get('/b2b/backorders', { params: { side: 'seller', status: 'OPEN' } }).then((r) => r.data.data as WholesaleBackorder[]),
  });
  const fulfilBackorderMutation = useMutation({
    mutationFn: (backorderId: string) => api.post(`/b2b/backorders/${backorderId}/fulfil`),
    onSuccess: () => {
      toast.success('Backorder placed as a new order');
      queryClient.invalidateQueries({ queryKey: ['wholesale-backorders'] });
      queryClient.invalidateQueries({ queryKey: ['wholesale-orders'] });
    },
    onError: (error: any) => {
      const code = error?.response?.data?.error;
      toast.error(code === 'INSUFFICIENT_STOCK' ? 'Still not enough stock to fulfil this backorder' : code ?? 'Could not fulfil backorder');
    },
  });

  const hasCatalogue = (catalogueQuery.data?.length ?? 0) > 0;
  const allLoaded = !catalogueQuery.isLoading && !ordersQuery.isLoading;
  const showChecklist = allLoaded && !hasCatalogue;

  const SETUP_STEPS = [
    {
      done: hasCatalogue,
      label: 'Add products to your wholesale catalogue',
      description: 'Set base and tier prices so buyer pharmacies can see and order your products.',
      href: '/wholesale/settings',
      cta: 'Go to Settings → Catalogue',
    },
    {
      done: false,
      label: 'Invite delivery and counter staff',
      description: 'Add team members with DELIVERY_STAFF or WHOLESALE_COUNTER_STAFF roles to assign manifests and handle picking.',
      href: '/settings/team',
      cta: 'Open Team settings',
    },
    {
      done: false,
      label: 'Set credit terms for your buyers',
      description: 'Define payment terms and credit limits per buyer pharmacy so orders are automatically validated.',
      href: '/wholesale/settings',
      cta: 'Go to Settings → Credit controls',
    },
  ];

  const orders = ordersQuery.data ?? [];
  const activeOrders = orders.filter((o) => !['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(o.status));
  const needsAction = orders.filter((o) => o.status === 'SUBMITTED');
  const inProgress = orders.filter((o) => ['CONFIRMED', 'PACKED', 'DISPATCHED'].includes(o.status));

  const curr30 = demandInsightsQuery.data?.windows.current30d;
  const prev30 = demandInsightsQuery.data?.windows.previous30d;
  const revenueDelta = curr30 && prev30 && prev30.revenueTzs > 0
    ? Math.round(((curr30.revenueTzs - prev30.revenueTzs) / prev30.revenueTzs) * 100)
    : null;

  const blockedClients = (creditLimitsQuery.data ?? []).filter((l) => l.blockNewOrders);

  const kpiCards = [
    {
      label: 'Active orders',
      value: activeOrders.length,
      sub: needsAction.length > 0 ? `${needsAction.length} need confirmation` : 'All orders moving',
      subColor: needsAction.length > 0 ? 'text-amber-600' : 'text-[#64748B]',
      icon: <ClipboardList size={20} />,
      color: 'bg-primary text-on-primary',
      iconColor: 'bg-white/20',
      href: '/wholesale/orders',
    },
    {
      label: 'Revenue — 30 days',
      value: `Tsh ${(curr30?.revenueTzs ?? 0).toLocaleString()}`,
      sub: revenueDelta !== null
        ? `${revenueDelta >= 0 ? '+' : ''}${revenueDelta}% vs previous 30d`
        : 'No prior-period data',
      subColor: revenueDelta !== null && revenueDelta >= 0 ? 'text-[#1A6B5C]' : 'text-[#B45309]',
      icon: revenueDelta !== null && revenueDelta >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />,
      color: 'bg-surface-container-low',
      iconColor: 'bg-[#D6F0E8] text-[#1A6B5C]',
      href: '/wholesale/invoices',
    },
    {
      label: 'VAT invoices',
      value: (invoicesQuery.data?.length ?? 0),
      sub: `Total Tsh ${(invoicesQuery.data ?? []).reduce((s, i) => s + i.totalAmount, 0).toLocaleString()}`,
      subColor: 'text-[#64748B]',
      icon: <FileText size={20} />,
      color: 'bg-surface-container-low',
      iconColor: 'bg-[#D6F0E8] text-[#1A6B5C]',
      href: '/wholesale/invoices',
    },
    {
      label: 'Open receivables',
      value: `Tsh ${(receivablesQuery.data?.totalOpenAmount ?? 0).toLocaleString()}`,
      sub: (receivablesQuery.data?.overdueCount ?? 0) > 0
        ? `${receivablesQuery.data!.overdueCount} overdue · Tsh ${receivablesQuery.data!.overdueAmount.toLocaleString()}`
        : blockedClients.length > 0 ? `${blockedClients.length} client${blockedClients.length > 1 ? 's' : ''} blocked` : 'No clients blocked',
      subColor: (receivablesQuery.data?.overdueCount ?? 0) > 0 || blockedClients.length > 0 ? 'text-red-600' : 'text-[#64748B]',
      icon: <CreditCard size={20} />,
      color: 'bg-surface-container-low',
      iconColor: (receivablesQuery.data?.totalOpenAmount ?? 0) > 0 ? 'bg-amber-50 text-amber-700' : 'bg-[#D6F0E8] text-[#1A6B5C]',
      href: '/wholesale/collections',
    },
  ];

  return (
    <WholesaleShell>
      <div className="space-y-stack-lg">

        {/* ── Setup checklist ───────────────────────────────────────── */}
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
                    {step.done ? <CheckCircle2 size={18} className="text-[#1A6B5C]" /> : <Circle size={18} className="text-[#94A3B8]" />}
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

        {/* ── Needs action ─────────────────────────────────────────── */}
        {needsAction.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-800">
                  {needsAction.length} order{needsAction.length > 1 ? 's' : ''} waiting for confirmation
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {needsAction.slice(0, 4).map((o) => (
                    <span key={o.id} className="rounded-full border border-amber-200 bg-white px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      {o.orderNumber}{o.buyerName ? ` · ${o.buyerName}` : ''}
                    </span>
                  ))}
                  {needsAction.length > 4 && (
                    <span className="text-xs text-amber-700">+{needsAction.length - 4} more</span>
                  )}
                </div>
              </div>
              <Link to="/wholesale/orders?status=SUBMITTED" className="shrink-0 text-sm font-semibold text-amber-700 hover:text-amber-900">
                Review →
              </Link>
            </div>
          </div>
        )}

        {/* ── KPI cards ─────────────────────────────────────────────── */}
        <div className="grid gap-gutter sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((card) => (
            <Link key={card.label} to={card.href} className={`group block rounded-xl border border-outline-variant/30 shadow-sm transition-shadow hover:shadow-md ${card.color === 'bg-primary text-on-primary' ? 'bg-primary' : 'bg-surface-container-low'}`}>
              <div className="p-stack-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={`text-label-lg ${card.color === 'bg-primary text-on-primary' ? 'text-on-primary/80' : 'text-on-surface-variant'}`}>{card.label}</p>
                    <p className={`mt-1 text-title-lg font-semibold truncate ${card.color === 'bg-primary text-on-primary' ? 'text-on-primary' : 'text-on-surface'}`}>{card.value}</p>
                    <p className={`mt-0.5 text-xs ${card.color === 'bg-primary text-on-primary' ? 'text-on-primary/70' : card.subColor}`}>{card.sub}</p>
                  </div>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.iconColor}`}>
                    {card.icon}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">

          {/* ── Demand insights ───────────────────────────────────────── */}
          <Card header={<h2 className="text-title-md text-on-surface">Demand insights</h2>}>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-outline-variant/30 bg-surface-container-high p-4">
                  <p className="text-label-md uppercase tracking-[0.2em] text-on-surface-variant">Current 30 days</p>
                  <p className="mt-2 text-title-lg font-semibold text-on-surface">{curr30?.units.toLocaleString() ?? 0} units</p>
                  <p className="mt-0.5 text-body-md text-on-surface-variant">Tsh {(curr30?.revenueTzs ?? 0).toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-outline-variant/30 bg-surface-container-high p-4">
                  <p className="text-label-md uppercase tracking-[0.2em] text-on-surface-variant">Previous 30 days</p>
                  <p className="mt-2 text-title-lg font-semibold text-on-surface">{prev30?.units.toLocaleString() ?? 0} units</p>
                  <p className="mt-0.5 text-body-md text-on-surface-variant">Tsh {(prev30?.revenueTzs ?? 0).toLocaleString()}</p>
                </div>
              </div>
              {(demandInsightsQuery.data?.topProducts ?? []).length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#64748B]">Top products</p>
                  {(demandInsightsQuery.data?.topProducts ?? []).map((product, i) => (
                    <div key={product.productId} className="flex items-center gap-3 rounded-xl border border-[#D6F0E8] p-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EDF7F3] text-xs font-bold text-[#1A6B5C]">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#0D4035]">{product.productName}</p>
                        <p className="text-xs text-[#64748B]">{product.units.toLocaleString()} units · {product.activeBuyers} buyer{product.activeBuyers !== 1 ? 's' : ''}</p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-[#0D4035]">Tsh {product.revenueTzs.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#64748B]">Demand insights appear after completed wholesale orders.</p>
              )}
            </div>
          </Card>

          {/* ── Right column ─────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Receivables aging */}
            <Card header={
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#0D4035]">Receivables aging</h2>
                <Link to="/wholesale/collections" className="flex items-center gap-1 text-xs text-[#1A6B5C] hover:underline">
                  View all <ArrowRight size={11} />
                </Link>
              </div>
            }>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Current', value: receivablesQuery.data?.buckets.current ?? 0, color: 'text-[#0D4035]' },
                  { label: '31–60 days', value: receivablesQuery.data?.buckets.days31To60 ?? 0, color: 'text-amber-700' },
                  { label: '61–90 days', value: receivablesQuery.data?.buckets.days61To90 ?? 0, color: 'text-orange-700' },
                  { label: '90+ days', value: receivablesQuery.data?.buckets.over90 ?? 0, color: 'text-red-700' },
                ].map((bucket) => (
                  <div key={bucket.label} className="rounded-xl border border-[#D6F0E8] bg-[#F7FCFA] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#64748B]">{bucket.label}</p>
                    <p className={`mt-1.5 text-base font-semibold ${bucket.color}`}>Tsh {bucket.value.toLocaleString()}</p>
                  </div>
                ))}
              </div>
              {(receivablesQuery.data?.invoices ?? []).length > 0 && (
                <div className="mt-3 space-y-2">
                  {(receivablesQuery.data?.invoices ?? []).slice(0, 3).map((inv) => (
                    <div key={inv.invoiceId} className="flex items-center justify-between gap-3 rounded-xl border border-[#D6F0E8] px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-[#0D4035]">{inv.buyerName}</p>
                        <p className="text-[10px] text-[#94A3B8]">
                          {inv.invoiceNumber} · {inv.daysOutstanding}d
                          {inv.isOverdue && (
                            <span className="ml-1 font-semibold text-red-600">· {inv.daysOverdue}d overdue</span>
                          )}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs font-semibold text-[#0D4035]">Tsh {inv.openAmount.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Open backorders */}
            {(backordersQuery.data ?? []).length > 0 && (
              <Card header={
                <div className="flex items-center gap-2">
                  <PackagePlus size={16} className="text-amber-600" />
                  <h2 className="text-base font-semibold text-[#0D4035]">Backorders awaiting stock</h2>
                </div>
              }>
                <div className="space-y-2">
                  {(backordersQuery.data ?? []).map((backorder) => (
                    <div key={backorder.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-[#0D4035]">
                          {backorder.productName} × {backorder.quantity}
                        </p>
                        <p className="text-[10px] text-[#64748B]">
                          {backorder.counterpartName ?? 'Buyer'} · order {backorder.orderNumber} · {fmt(backorder.createdAt)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => fulfilBackorderMutation.mutate(backorder.id)}
                        loading={fulfilBackorderMutation.isPending}
                      >
                        Fulfil now
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-[#94A3B8]">
                  Fulfilling creates a new order for the outstanding quantity. You'll be notified when stock intake covers a backordered product.
                </p>
              </Card>
            )}

            {/* In-progress orders */}
            <Card header={
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#0D4035]">In progress</h2>
                <Link to="/wholesale/orders" className="flex items-center gap-1 text-xs text-[#1A6B5C] hover:underline">
                  All orders <ArrowRight size={11} />
                </Link>
              </div>
            }>
              {inProgress.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-6">
                  <Package size={28} className="text-[#AFDFD3]" />
                  <p className="text-sm text-[#64748B]">No orders currently in progress.</p>
                </div>
              )}
              <div className="space-y-2">
                {inProgress.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center gap-3 rounded-xl border border-[#D6F0E8] px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#0D4035]">{order.orderNumber}</p>
                      {order.buyerName && <p className="text-[10px] text-[#64748B]">{order.buyerName}</p>}
                      {order.scheduledDeliveryAt && (
                        <p className="text-[10px] text-[#94A3B8]">Delivery {fmt(order.scheduledDeliveryAt)}</p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

          </div>
        </div>

        {/* ── Catalogue product count ───────────────────────────────── */}
        <div className="rounded-xl border border-[#D6F0E8] bg-[#F7FCFA] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#0D4035]">
                {hasCatalogue
                  ? `${catalogueQuery.data?.length} product${(catalogueQuery.data?.length ?? 0) !== 1 ? 's' : ''} in wholesale catalogue`
                  : 'Catalogue is empty'}
              </p>
              <p className="text-xs text-[#64748B] mt-0.5">
                {hasCatalogue
                  ? 'Buyer pharmacies can see and order these products at their tier-adjusted prices.'
                  : 'Add products and tier prices so buyers can discover and order your stock.'}
              </p>
            </div>
            <Link to="/wholesale/settings" className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#1A6B5C] bg-white px-4 py-2 text-sm font-semibold text-[#1A6B5C] hover:bg-[#EDF7F3]">
              {hasCatalogue ? 'Manage catalogue' : 'Add products'} <ArrowRight size={13} />
            </Link>
          </div>
        </div>

      </div>
    </WholesaleShell>
  );
};
