import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { differenceInCalendarDays } from 'date-fns';
import { CheckCircle2, ExternalLink, MessageCircle, Plus, RefreshCw, Save, Smartphone, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { usePaymentMethodStore } from '@/stores/paymentMethodStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import type { BillingCycle, SubscriptionTier } from '@/types';
import {
  createMobileMoneyDraft,
  normalizePaymentMethodConfig,
  PAYMENT_METHOD_CONFIG_KEY,
  serializePaymentMethodConfig,
  toDispensingPaymentMethodOptions,
  type PaymentMethodSetting,
} from './paymentMethodConfig';
import { SettingsNav } from './SettingsNav';

const FOUNDER_WHATSAPP = '255764591374';

const plans = [
  { tier: 'ADDO', monthly: 'Tsh 15,000', annual: 'Tsh 150,000', users: '3 users', bestFor: '1 outlet · DLDM / ADDO shops', description: 'Full POS, safety, dashboard, barcode scanning, DLDM compliance, and TMDA bulletins.', features: ['1 outlet · 3 users · 14-day trial', 'Owner Dashboard + Clinical Decision Support included', 'Barcode scanning and offline-first POS'] },
  { tier: 'ESSENTIAL', monthly: 'Tsh 39,000', annual: 'Tsh 390,000', users: '5 users', bestFor: '2 outlets · Single retail pharmacies', description: 'Multi-outlet Owner Dashboard, roles & permissions, void/reissue workflow, and full pharmacy compliance tracker.', features: ['Up to 2 outlets · 5 users · 14-day trial', 'Roles & permissions · void/reissue workflow with audit trail', 'Full compliance tracker (TMDA + PC licence types)'] },
  { tier: 'ADDO_PLUS', monthly: 'Tsh 45,000', annual: 'Tsh 450,000', users: '7 users', bestFor: 'ADDO shops preparing to expand', description: 'A step above ADDO with stronger stock, reports, and team controls.', features: ['Expanded ADDO operations', 'More users and reporting controls', 'Ready for retail pharmacy upgrade'] },
  { tier: 'STANDARD', monthly: 'Tsh 55,000', annual: 'Tsh 550,000', users: '10 users', bestFor: '3 outlets · Small multi-outlet teams', description: 'Up to 3 outlets with accounting, customer history, Patient Ordering Portal, and full Knowledge Hub.', features: ['Up to 3 outlets · 10 users · 14-day trial', 'Accounting module · customer purchase history & loyalty', 'Patient Ordering Portal + Knowledge Hub full access'] },
  { tier: 'PREMIUM', monthly: 'Tsh 75,000', annual: 'Tsh 750,000', users: '20 users', bestFor: '5 outlets · Growing retail groups', description: 'Up to 5 outlets with demand forecasting, dead-stock scoring, peer benchmarking, and revenue projections.', features: ['Up to 5 outlets · 20 users · 14-day trial', 'Demand forecasting · dead stock risk scoring', 'Peer benchmarking · revenue trend projection'] },
  { tier: 'WHOLESALE', monthly: 'Tsh 100,000', annual: 'Tsh 1,000,000', users: '10+ users', bestFor: 'Wholesale distributors', description: 'Structured wholesale workflow — order inbox, catalogue pricing, credit limits, delivery scheduling, and VAT invoices.', features: ['Order inbox from APOTEKH retail network', 'Credit limits per buyer · receivables dashboard', 'VAT-compliant invoice generation on order confirmation'] },
{ tier: 'ENTERPRISE', monthly: 'Negotiated', annual: 'Negotiated', users: 'Unlimited', bestFor: '6+ outlets · Large operators', description: '6+ outlets, unlimited users, all Premium features, custom reporting, and dedicated implementation support.', features: ['6+ outlets · unlimited users', 'All Premium retail features', 'Negotiated support and contract'] },
];

type SubscriptionPaymentRequest = {
  id: string;
  requestedTier: string;
  billingCycle: string;
  amount: string | number;
  paymentMethod: string;
  transactionRef: string;
  provider?: string | null;
  providerReference?: string | null;
  checkoutUrl?: string | null;
  payerPhone?: string | null;
  note?: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  reviewedAt?: string | null;
  reviewNote?: string | null;
  paidUntil?: string | null;
  createdAt: string;
};

const tierOptions = ['ADDO', 'ESSENTIAL', 'ADDO_PLUS', 'STANDARD', 'PREMIUM', 'WHOLESALE'] as const satisfies readonly SubscriptionTier[];
type PaymentRequestTier = (typeof tierOptions)[number];

const isPaymentRequestTier = (tier?: string | null): tier is PaymentRequestTier =>
  Boolean(tier && tierOptions.some((option) => option === tier));

const planPriceTable: Record<PaymentRequestTier, Record<BillingCycle, number>> = {
  ADDO: { MONTHLY: 15_000, ANNUAL: 150_000 },
  ESSENTIAL: { MONTHLY: 39_000, ANNUAL: 390_000 },
  ADDO_PLUS: { MONTHLY: 45_000, ANNUAL: 450_000 },
  STANDARD: { MONTHLY: 55_000, ANNUAL: 550_000 },
  PREMIUM: { MONTHLY: 75_000, ANNUAL: 750_000 },
  WHOLESALE: { MONTHLY: 100_000, ANNUAL: 1_000_000 },
};

const formatTsh = (amount: number | string) => `Tsh ${Number(amount).toLocaleString()}`;

const paymentStatusMessage = (request: SubscriptionPaymentRequest) => {
  if (request.status === 'REJECTED') {
    return request.reviewNote || 'Payment failed. Check balance, payment approval, or transaction details and try again.';
  }
  if (request.status === 'CONFIRMED') {
    return request.paidUntil
      ? `Confirmed. Access is paid through ${new Date(request.paidUntil).toLocaleDateString()}.`
      : 'Confirmed. Access is active.';
  }
  return 'Waiting for payment provider confirmation.';
};

export const SubscriptionPage: React.FC = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const toast = useNotificationStore((state) => state.toast);
  const cachePaymentMethods = usePaymentMethodStore((state) => state.setMethods);
  const setPharmacy = usePharmacyStore((state) => state.setPharmacy);
  const pharmacy = usePharmacyStore((state) => state.pharmacy);
  const pharmacyRef = React.useRef(pharmacy);
  React.useLayoutEffect(() => { pharmacyRef.current = pharmacy; }, [pharmacy]);
  const canManagePaymentSettings = ['OWNER', 'SUPER_ADMIN'].includes(user?.role || '');
  const canManageSubscription = ['OWNER', 'SUPER_ADMIN'].includes(user?.role || '');
  const [paymentMethodsDraft, setPaymentMethodsDraft] = React.useState<PaymentMethodSetting[]>(
    () => normalizePaymentMethodConfig(null).methods,
  );
  const [paymentMethodsDirty, setPaymentMethodsDirty] = React.useState(false);
  const [checkoutDraft, setCheckoutDraft] = React.useState<{
    requestedTier: PaymentRequestTier;
    billingCycle: BillingCycle;
    payerPhone: string;
  }>({
    requestedTier: isPaymentRequestTier(pharmacy?.subscriptionTier) ? pharmacy.subscriptionTier : 'STANDARD',
    billingCycle: 'MONTHLY',
    payerPhone: '',
  });
  const checkoutSectionRef = React.useRef<HTMLDivElement>(null);

  const selectPlanAndScroll = (tier: PaymentRequestTier) => {
    setCheckoutDraft(c => ({ ...c, requestedTier: tier }));
    setTimeout(() => checkoutSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const [checkoutResult, setCheckoutResult] = React.useState<{
    reference: string;
    amount: number;
    checkoutUrl: string | null;
    collectionPhone: string | null;
    instructions: string;
    stkSent: boolean;
  } | null>(null);

  const subscriptionQuery = useQuery({
    queryKey: ['subscription-settings'],
    queryFn: () => api.get('/settings/subscription').then((response) => response.data),
  });
  const paymentSettingsQuery = useQuery({
    queryKey: ['settings-config', PAYMENT_METHOD_CONFIG_KEY],
    queryFn: () => api.get(`/settings/config/${PAYMENT_METHOD_CONFIG_KEY}`).then((response) => response.data),
    enabled: canManagePaymentSettings,
  });
  const paymentRequestsQuery = useQuery<{ data: SubscriptionPaymentRequest[] }>({
    queryKey: ['subscription-payment-requests'],
    queryFn: () => api.get('/settings/subscription/payment-requests').then((response) => response.data),
    enabled: canManageSubscription,
  });

  const subscription = subscriptionQuery.data?.data;
  const paymentMethodConfig = React.useMemo(
    () => normalizePaymentMethodConfig(paymentSettingsQuery.data?.data?.value),
    [paymentSettingsQuery.data?.data?.value],
  );

  React.useEffect(() => {
    if (!subscription) return;
    const prev = pharmacyRef.current;
    const changed = !prev || Object.entries(subscription).some(
      ([key, value]) => (prev as unknown as Record<string, unknown>)[key] !== value
    );
    if (changed) {
      setPharmacy({ ...(prev ?? {}), ...subscription } as any);
    }
  }, [setPharmacy, subscription]);
  React.useEffect(() => {
    if (paymentMethodsDirty) {
      return;
    }

    setPaymentMethodsDraft(paymentMethodConfig.methods);
    if (pharmacy?.id) {
      cachePaymentMethods(pharmacy.id, toDispensingPaymentMethodOptions(paymentMethodConfig, 'config'));
    }
  }, [cachePaymentMethods, paymentMethodConfig, paymentMethodConfig.methods, paymentMethodsDirty, pharmacy?.id]);

  const daysRemaining =
    subscription?.trialEndsAt
      ? Math.max(0, differenceInCalendarDays(new Date(subscription.trialEndsAt), new Date()))
      : null;
  const latestCheckout = React.useMemo(
    () => (paymentRequestsQuery.data?.data ?? []).find((request) => request.paymentMethod === 'SELF_SERVICE_CHECKOUT') ?? null,
    [paymentRequestsQuery.data?.data],
  );
  const checkoutAmount = planPriceTable[checkoutDraft.requestedTier][checkoutDraft.billingCycle];

  const savePaymentSettingsMutation = useMutation({
    mutationFn: async () => {
      const mobileMoneyMethods = paymentMethodsDraft.filter((method) => method.type === 'MOBILE_MONEY');

      if (mobileMoneyMethods.some((method) => !method.label.trim() || !method.phoneNumber.trim())) {
        throw new Error('Each mobile money method needs both a name and a number.');
      }

      const value = serializePaymentMethodConfig(paymentMethodsDraft);
      const response = await api.put(`/settings/config/${PAYMENT_METHOD_CONFIG_KEY}`, { value });
      return response.data;
    },
    onSuccess: (response) => {
      const normalized = normalizePaymentMethodConfig(response.data?.value);
      setPaymentMethodsDraft(normalized.methods);
      setPaymentMethodsDirty(false);
      queryClient.setQueryData(['settings-config', PAYMENT_METHOD_CONFIG_KEY], response);
      if (pharmacy?.id) {
        cachePaymentMethods(pharmacy.id, toDispensingPaymentMethodOptions(normalized, 'config'));
      }
      toast.success('Payment methods saved');
    },
    onError: (error: any) => {
      toast.error(error?.message || error?.response?.data?.error || 'Could not save payment methods');
    },
  });

  const createCheckoutMutation = useMutation({
    mutationFn: () => api.post('/settings/subscription/checkout', checkoutDraft).then((response) => response.data),
    onSuccess: async (response) => {
      const d = response.data ?? {};
      setCheckoutResult({
        reference: d.reference ?? d.request?.transactionRef ?? '',
        amount: d.amount ?? 0,
        checkoutUrl: d.checkoutUrl ?? null,
        collectionPhone: d.collectionPhone ?? null,
        instructions: d.instructions ?? '',
        stkSent: Boolean(d.stkSent),
      });
      await paymentRequestsQuery.refetch();
      await subscriptionQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Could not create checkout');
    },
  });

  const retryCheckout = (request: SubscriptionPaymentRequest) => {
    setCheckoutDraft((current) => ({
      requestedTier: isPaymentRequestTier(request.requestedTier) ? request.requestedTier : current.requestedTier,
      billingCycle: request.billingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY',
      payerPhone: request.payerPhone || current.payerPhone,
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateMobileMoneyMethod = (code: string, patch: Partial<PaymentMethodSetting>) => {
    setPaymentMethodsDirty(true);
    setPaymentMethodsDraft((current) =>
      current.map((method) =>
        method.code === code && method.type === 'MOBILE_MONEY'
          ? { ...method, ...patch }
          : method,
      ),
    );
  };

  const addMobileMoneyMethod = () => {
    setPaymentMethodsDirty(true);
    setPaymentMethodsDraft((current) => [
      ...current,
      createMobileMoneyDraft(current.filter((method) => method.type === 'MOBILE_MONEY').length),
    ]);
  };

  const removeMobileMoneyMethod = (code: string) => {
    setPaymentMethodsDirty(true);
    setPaymentMethodsDraft((current) => current.filter((method) => method.code !== code));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <h1 className="text-xl font-bold text-[#0D4035]">Subscription</h1>
          <SettingsNav />
          <p className="mt-1 text-sm text-[#64748B]">
            Review your current tier and trial status{canManageSubscription ? ', then subscribe below' : ''}. Use the mobile money checkout for instant automatic activation.
          </p>
        </div>
        {subscription && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info" size="sm">{subscription.subscriptionTier}</Badge>
            <Badge variant={subscription.status === 'TRIAL' ? 'warning' : 'success'} size="sm">
              {subscription.status}
            </Badge>
          </div>
        )}
      </div>

      <Card>
        {subscriptionQuery.isLoading && (
          <p className="text-sm text-[#64748B]">Loading subscription details...</p>
        )}

        {subscription && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-[#EDF7F3] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-[#64748B]">Current tier</p>
              <p className="mt-1 text-lg font-semibold text-[#0D4035]">{subscription.subscriptionTier}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 border border-[#D6F0E8]">
              <p className="text-xs uppercase tracking-wide text-[#64748B]">Billing cycle</p>
              <p className="mt-1 text-lg font-semibold text-[#0D4035]">{subscription.billingCycle}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 border border-[#D6F0E8]">
              <p className="text-xs uppercase tracking-wide text-[#64748B]">Trial status</p>
              <p className="mt-1 text-lg font-semibold text-[#0D4035]">
                {subscription.trialActive ? 'Active' : 'Ended'}
              </p>
            </div>
            <div className="rounded-2xl bg-[#FFFBEB] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-[#64748B]">Trial countdown</p>
              <p className="mt-1 text-lg font-semibold text-[#92400E]">
                {daysRemaining != null ? `${daysRemaining} days` : 'N/A'}
              </p>
            </div>
          </div>
        )}

        {subscription?.trialActive && daysRemaining != null && daysRemaining <= 14 && (
          <div className={`mt-5 rounded-2xl px-4 py-4 border ${daysRemaining <= 3 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
            <p className={`text-sm font-semibold ${daysRemaining <= 3 ? 'text-red-800' : 'text-amber-800'}`}>
              {daysRemaining === 0 ? 'Trial expires today' : `Trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`}
            </p>
            <p className={`mt-1 text-sm ${daysRemaining <= 3 ? 'text-red-700' : 'text-amber-700'}`}>
              Subscribe below to keep your access — activation is automatic once payment is confirmed.
            </p>
          </div>
        )}
        {!subscription?.trialActive && subscription?.status === 'GRACE' && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
            <p className="text-sm font-semibold text-red-800">Access in grace period</p>
            <p className="mt-1 text-sm text-red-700">Subscribe below to restore full access before the grace period ends.</p>
          </div>
        )}
      </Card>

      {canManageSubscription && (
        <div ref={checkoutSectionRef}>
        <Card
          header={(
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#0D4035]">Pay with mobile money</h2>
                <p className="mt-1 text-sm text-[#64748B]">
                  Enter your M-Pesa number and we send an STK push. Approve on your phone — access activates automatically within seconds.
                </p>
              </div>
              <Badge variant="success" size="sm">Instant activation</Badge>
            </div>
          )}
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#0D4035]">Tier</label>
                <select
                  value={checkoutDraft.requestedTier}
                  onChange={(event) => {
                    const nextTier = event.target.value;
                    if (isPaymentRequestTier(nextTier)) {
                      setCheckoutDraft((current) => ({ ...current, requestedTier: nextTier }));
                    }
                  }}
                  className="h-10 w-full rounded-xl border border-[#D6F0E8] bg-white px-3 text-sm text-[#0D4035] outline-none focus:border-[#1A6B5C] focus:ring-2 focus:ring-[#1A6B5C]/20"
                >
                  {tierOptions.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#0D4035]">Billing cycle</label>
                <select
                  value={checkoutDraft.billingCycle}
                  onChange={(event) => setCheckoutDraft((current) => ({
                    ...current,
                    billingCycle: event.target.value === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY',
                  }))}
                  className="h-10 w-full rounded-xl border border-[#D6F0E8] bg-white px-3 text-sm text-[#0D4035] outline-none focus:border-[#1A6B5C] focus:ring-2 focus:ring-[#1A6B5C]/20"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="ANNUAL">Annual</option>
                </select>
              </div>
              <Input
                label="Payment phone"
                value={checkoutDraft.payerPhone}
                onChange={(event) => setCheckoutDraft((current) => ({ ...current, payerPhone: event.target.value }))}
                placeholder="+255..."
              />
            </div>

            <div className="rounded-2xl border border-[#D6F0E8] bg-[#F8FAFC] p-4">
              <p className="text-xs uppercase tracking-wide text-[#64748B]">Amount due</p>
              <p className="mt-1 text-2xl font-bold text-[#0D4035]">{formatTsh(checkoutAmount)}</p>
              <Button
                className="mt-4 w-full"
                onClick={() => createCheckoutMutation.mutate()}
                loading={createCheckoutMutation.isPending}
                disabled={checkoutDraft.payerPhone.trim().length < 7}
              >
                Create checkout
              </Button>
            </div>
          </div>

          {/* Post-checkout payment instructions — shown immediately after checkout creation */}
          {checkoutResult && (
            <div className="mt-5 rounded-2xl border-2 border-[#1A6B5C] bg-[#EDF7F3] p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-[#1A6B5C]" />
                <div className="flex-1">
                  {checkoutResult.stkSent ? (
                    <>
                      <p className="text-sm font-bold text-[#0D4035]">Check your phone now</p>
                      <p className="mt-1 text-sm text-[#475569]">
                        A payment request for <span className="font-semibold">{formatTsh(checkoutResult.amount)}</span> has been sent to your mobile number. Open M-PESA (or your network's app) and enter your PIN to confirm.
                      </p>
                      <div className="mt-3 rounded-xl border border-[#AFDFD3] bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-[#64748B]">Reference</p>
                        <p className="mt-0.5 font-mono text-sm font-bold text-[#0D4035]">{checkoutResult.reference}</p>
                      </div>
                      <p className="mt-2 text-xs text-[#64748B]">Your subscription activates automatically once the payment is confirmed — no need to do anything else.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-[#0D4035]">Reference created — here is how to pay</p>
                      <div className="mt-3 rounded-xl border border-[#AFDFD3] bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-[#64748B]">Your payment reference</p>
                        <p className="mt-1 font-mono text-lg font-bold tracking-wider text-[#0D4035]">{checkoutResult.reference}</p>
                      </div>
                      {checkoutResult.checkoutUrl ? (
                        <a href={checkoutResult.checkoutUrl} target="_blank" rel="noreferrer" className="mt-3 block">
                          <Button className="w-full">
                            <ExternalLink size={15} />
                            Open payment link
                          </Button>
                        </a>
                      ) : (
                        <div className="mt-3 space-y-1.5 text-sm text-[#0D4035]">
                          {checkoutResult.collectionPhone ? (
                            <>
                              <p>1. Open M-PESA on your phone</p>
                              <p>2. Send <span className="font-semibold">{formatTsh(checkoutResult.amount)}</span> to <span className="font-semibold">{checkoutResult.collectionPhone}</span></p>
                              <p>3. Use <span className="font-mono font-semibold">{checkoutResult.reference}</span> as the reference / reason</p>
                              <p>4. Your access activates once we confirm the payment</p>
                            </>
                          ) : (
                            <p className="text-[#64748B]">{checkoutResult.instructions}</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  <p className="mt-3 text-xs text-[#64748B]">
                    Questions? WhatsApp us on{' '}
                    <a href={`https://wa.me/${FOUNDER_WHATSAPP}`} target="_blank" rel="noreferrer" className="font-medium text-[#1A6B5C] underline underline-offset-2">
                      +{FOUNDER_WHATSAPP}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}

          {latestCheckout && !checkoutResult && (
            <div className={`mt-5 rounded-2xl border p-4 ${latestCheckout.status === 'REJECTED' ? 'border-red-200 bg-red-50' : 'border-[#D6F0E8] bg-white'}`}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#0D4035]">Latest checkout</p>
                  <p className="mt-1 text-sm text-[#475569]">
                    Ref {latestCheckout.transactionRef} · {formatTsh(latestCheckout.amount)} · {latestCheckout.status}
                  </p>
                  <p className={`mt-2 text-sm ${latestCheckout.status === 'REJECTED' ? 'text-red-700' : 'text-[#64748B]'}`}>
                    {paymentStatusMessage(latestCheckout)}
                  </p>
                  {latestCheckout.provider && (
                    <p className="mt-1 text-xs text-[#64748B]">Provider: {latestCheckout.provider}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {latestCheckout.checkoutUrl && (
                    <a href={latestCheckout.checkoutUrl} target="_blank" rel="noreferrer">
                      <Button variant="secondary" size="sm">
                        <ExternalLink size={14} />
                        Open payment
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      await paymentRequestsQuery.refetch();
                      await subscriptionQuery.refetch();
                    }}
                  >
                    <RefreshCw size={14} />
                    Refresh status
                  </Button>
                  {latestCheckout.status === 'REJECTED' && (
                    <Button size="sm" onClick={() => retryCheckout(latestCheckout)}>
                      Try again
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
        </div>
      )}

      <Card>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-[#0D4035]">How tiers work</p>
            <p className="mt-1 text-sm text-[#64748B]">Tiers are based on pharmacy size and operating model, not just feature names.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0D4035]">Retail path</p>
            <p className="mt-1 text-sm text-[#64748B]">ADDO covers smaller shops. Standard and Premium cover full retail pharmacy workflows.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0D4035]">Wholesale path</p>
            <p className="mt-1 text-sm text-[#64748B]">Wholesale is for B2B and delivery operations. Enterprise is for chains or custom rollouts.</p>
          </div>
        </div>
      </Card>

      {canManagePaymentSettings && (
        <Card
          header={(
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-[#EDF7F3] p-3 text-[#1A6B5C]">
                  <Wallet size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#0D4035]">Dispensing payment methods</h2>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Cash always stays enabled. Add mobile money options here so dispensing can move off hardcoded methods next.
                  </p>
                </div>
              </div>
              <Badge variant="info" size="sm">Owner config</Badge>
            </div>
          )}
          footer={(
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#475569]">
                Cash always stays enabled for offline fallback.
              </p>
              <Button
                onClick={() => savePaymentSettingsMutation.mutate()}
                loading={savePaymentSettingsMutation.isPending}
                disabled={paymentSettingsQuery.isLoading}
                leftIcon={<Save size={16} />}
              >
                Save payment methods
              </Button>
            </div>
          )}
        >
          {paymentSettingsQuery.isLoading ? (
            <p className="text-sm text-[#64748B]">Loading payment method settings...</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#D6F0E8] bg-[#F8FAFC] px-4 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#0D4035]">Cash</p>
                    <p className="mt-1 text-sm text-[#64748B]">
                      Required fallback when connectivity or mobile money confirmation is unavailable.
                    </p>
                  </div>
                  <Badge variant="success" size="sm">Always on</Badge>
                </div>
              </div>

              {paymentMethodsDraft
                .filter((method) => method.type === 'MOBILE_MONEY')
                .map((method, index) => (
                  <div key={method.code} className="rounded-2xl border border-[#D6F0E8] bg-white px-4 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-[#FFF7ED] p-3 text-[#D97706]">
                          <Smartphone size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#0D4035]">Mobile money {index + 1}</p>
                          <p className="mt-1 text-sm text-[#64748B]">
                            Name, till number, active state, and cashier note.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant={method.active ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => updateMobileMoneyMethod(method.code, { active: !method.active })}
                        >
                          {method.active ? 'Active' : 'Inactive'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMobileMoneyMethod(method.code)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <Input
                        label="Mobile money name"
                        value={method.label}
                        onChange={(event) => updateMobileMoneyMethod(method.code, { label: event.target.value })}
                        placeholder="M-Pesa, Airtel Money, Tigo Pesa"
                      />
                      <Input
                        label="Mobile money number"
                        value={method.phoneNumber}
                        onChange={(event) => updateMobileMoneyMethod(method.code, { phoneNumber: event.target.value })}
                        placeholder="+2557..."
                      />
                    </div>

                    <div className="mt-3">
                      <label
                        htmlFor={`payment-method-note-${method.code}`}
                        className="mb-1 block text-sm font-medium text-[#0D4035]"
                      >
                        Cashier note
                      </label>
                      <textarea
                        id={`payment-method-note-${method.code}`}
                        value={method.note}
                        onChange={(event) => updateMobileMoneyMethod(method.code, { note: event.target.value })}
                        rows={3}
                        className="w-full rounded-2xl border border-[#D6F0E8] px-3 py-2.5 text-sm text-[#0D4035] outline-none transition-colors focus:border-[#1A6B5C] focus:ring-2 focus:ring-[#1A6B5C]/20"
                        placeholder="Optional guidance, for example Send to owner till and enter the transaction reference."
                      />
                    </div>
                  </div>
                ))}

              {paymentSettingsQuery.isError && (
                <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
                  Saved payment settings could not be loaded from the server, so this page is showing the local default draft.
                </div>
              )}

              <Button type="button" variant="secondary" leftIcon={<Plus size={16} />} onClick={addMobileMoneyMethod}>
                Add mobile money
              </Button>
            </div>
          )}
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {plans.map((plan) => {
          const message = encodeURIComponent(`I would like to upgrade APOTEKH to ${plan.tier}`);
          const isCurrent = subscription?.subscriptionTier === plan.tier;

          return (
            <Card key={plan.tier}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#0D4035]">{plan.tier}</p>
                  <p className="mt-1 text-xs text-[#64748B]">{plan.bestFor} | {plan.users}</p>
                   </div>
                {isCurrent ? <Badge variant="success" size="sm">Current plan</Badge> : null}
              </div>
              <p className="mt-3 text-sm text-[#475569]">{plan.description}</p>
              <div className="mt-4">
                <p className="text-2xl font-bold text-[#0D4035]">{plan.monthly}</p>
                <p className="text-xs text-[#64748B]">Annual: {plan.annual}</p>
              </div>
              <div className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2 text-sm text-[#475569]">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#1A6B5C]" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              {canManageSubscription && !isCurrent && isPaymentRequestTier(plan.tier) && (
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button onClick={() => selectPlanAndScroll(plan.tier as PaymentRequestTier)}>
                    Subscribe to {plan.tier}
                  </Button>
                </div>
              )}
              {canManageSubscription && !isCurrent && !isPaymentRequestTier(plan.tier) && (
                <div className="mt-5">
                  <a href={`https://wa.me/${FOUNDER_WHATSAPP}?text=${message}`} target="_blank" rel="noreferrer">
                    <Button leftIcon={<MessageCircle size={16} />}>Contact us to upgrade</Button>
                  </a>
                </div>
              )}
              {isCurrent && (
                <div className="mt-5">
                  <p className="text-sm text-[#1A6B5C] font-medium">✓ This is your current plan</p>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
