import React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, ExternalLink, MessageCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type { BillingCycle, SubscriptionTier } from '@/types';

const FOUNDER_WHATSAPP = '255764591374';

const TIER_LABEL: Record<string, string> = {
  ADDO: 'ADDO',
  ESSENTIAL: 'Basic',
  STANDARD: 'Standard',
  PREMIUM: 'Premium',
  WHOLESALE: 'Wholesale',
  ENTERPRISE: 'Enterprise',
};

// ADDO_PLUS is intentionally excluded — not a marketed tier
const TIER_OPTIONS = ['ADDO', 'ESSENTIAL', 'STANDARD', 'PREMIUM', 'WHOLESALE'] as const satisfies readonly SubscriptionTier[];
type PaymentRequestTier = (typeof TIER_OPTIONS)[number];

const isPaymentRequestTier = (tier?: string | null): tier is PaymentRequestTier =>
  Boolean(tier && TIER_OPTIONS.some((option) => option === tier));

const planPriceTable: Record<PaymentRequestTier, Record<BillingCycle, number>> = {
  ADDO: { MONTHLY: 15_000, ANNUAL: 150_000 },
  ESSENTIAL: { MONTHLY: 39_000, ANNUAL: 390_000 },
  STANDARD: { MONTHLY: 55_000, ANNUAL: 550_000 },
  PREMIUM: { MONTHLY: 75_000, ANNUAL: 750_000 },
  WHOLESALE: { MONTHLY: 100_000, ANNUAL: 1_000_000 },
};

type SubscriptionPaymentRequest = {
  id: string;
  requestedTier: string;
  billingCycle: string;
  amount: string | number;
  paymentMethod: string;
  transactionRef: string;
  checkoutUrl?: string | null;
  payerPhone?: string | null;
  reviewNote?: string | null;
  paidUntil?: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
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

export const TrialPaywall: React.FC<{ currentTier?: string | null }> = ({ currentTier }) => {
  const user = useAuthStore((state) => state.user);
  const toast = useNotificationStore((state) => state.toast);
  const canManageSubscription = ['OWNER', 'SUPER_ADMIN'].includes(user?.role || '');
  const [checkoutDraft, setCheckoutDraft] = React.useState<{
    requestedTier: PaymentRequestTier;
    billingCycle: BillingCycle;
    payerPhone: string;
  }>({
    requestedTier: isPaymentRequestTier(currentTier) ? currentTier : 'STANDARD',
    billingCycle: 'MONTHLY',
    payerPhone: '',
  });
  const [checkoutResult, setCheckoutResult] = React.useState<{
    reference: string;
    amount: number;
    checkoutUrl: string | null;
    collectionPhone: string | null;
    instructions: string;
    stkSent: boolean;
  } | null>(null);

  const paymentRequestsQuery = useQuery<{ data: SubscriptionPaymentRequest[] }>({
    queryKey: ['subscription-payment-requests', 'trial-paywall'],
    queryFn: () => api.get('/settings/subscription/payment-requests').then((response) => response.data),
    enabled: canManageSubscription,
  });
  const latestCheckout = React.useMemo(
    () => (paymentRequestsQuery.data?.data ?? []).find((request) => request.paymentMethod === 'SELF_SERVICE_CHECKOUT') ?? null,
    [paymentRequestsQuery.data?.data],
  );
  const checkoutAmount = planPriceTable[checkoutDraft.requestedTier][checkoutDraft.billingCycle];
  const message = encodeURIComponent(
    `I would like to subscribe to APOTEKH ${TIER_LABEL[currentTier ?? ''] ?? currentTier ?? 'Standard'}`,
  );

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
    setCheckoutResult(null);
  };

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#EDF7F3] px-4 py-6">
      <div className="mx-auto flex min-h-full max-w-3xl items-center justify-center">
        <div className="w-full rounded-[28px] bg-white p-6 shadow-2xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#1A6B5C]">
            Trial ended
          </p>
          <h2 className="mt-3 text-3xl font-bold text-[#0D4035]">
            Your 14-day trial has ended
          </h2>
          <p className="mt-3 text-sm text-[#475569]">
            Access is paused until payment is confirmed.{' '}
            {canManageSubscription
              ? 'Use the mobile money checkout below — access reopens automatically once payment goes through.'
              : 'Ask the owner to renew the subscription.'}
          </p>

          {canManageSubscription && (
            <div className="mt-6 space-y-5">
              <div className="rounded-2xl border border-[#BFE7DC] bg-[#EDF7F3] p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#0D4035]">Pay with mobile money</p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      Enter your M-Pesa number and we send an STK push. Approve on your phone — access activates automatically within seconds.
                    </p>
                  </div>
                  <Badge variant="success" size="sm">Instant activation</Badge>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
                      {TIER_OPTIONS.map((tier) => (
                        <option key={tier} value={tier}>{TIER_LABEL[tier] ?? tier}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#0D4035]">Cycle</label>
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

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-lg font-bold text-[#0D4035]">{formatTsh(checkoutAmount)}</p>
                  <Button
                    loading={createCheckoutMutation.isPending}
                    disabled={checkoutDraft.payerPhone.trim().length < 7}
                    onClick={() => createCheckoutMutation.mutate()}
                  >
                    Create checkout
                  </Button>
                </div>

                {checkoutResult && (
                  <div className="mt-4 rounded-xl border-2 border-[#1A6B5C] bg-[#EDF7F3] p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#1A6B5C]" />
                      <div className="flex-1">
                        {checkoutResult.stkSent ? (
                          <>
                            <p className="text-sm font-bold text-[#0D4035]">Check your phone now</p>
                            <p className="mt-1 text-sm text-[#475569]">
                              A payment request for <span className="font-semibold">{formatTsh(checkoutResult.amount)}</span> has been sent to your mobile number. Open M-PESA and enter your PIN to confirm.
                            </p>
                            <div className="mt-3 rounded-lg border border-[#AFDFD3] bg-white px-3 py-2">
                              <p className="text-xs uppercase tracking-wide text-[#64748B]">Reference</p>
                              <p className="mt-0.5 font-mono text-sm font-bold text-[#0D4035]">{checkoutResult.reference}</p>
                            </div>
                            <p className="mt-2 text-xs text-[#64748B]">Access activates automatically once payment is confirmed — no need to do anything else.</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-bold text-[#0D4035]">Reference created — here is how to pay</p>
                            <div className="mt-3 rounded-lg border border-[#AFDFD3] bg-white px-3 py-2">
                              <p className="text-xs uppercase tracking-wide text-[#64748B]">Your payment reference</p>
                              <p className="mt-1 font-mono text-base font-bold tracking-wider text-[#0D4035]">{checkoutResult.reference}</p>
                            </div>
                            {checkoutResult.checkoutUrl ? (
                              <a href={checkoutResult.checkoutUrl} target="_blank" rel="noreferrer" className="mt-3 block">
                                <Button className="w-full">
                                  <ExternalLink size={15} />
                                  Open payment link
                                </Button>
                              </a>
                            ) : (
                              <div className="mt-3 space-y-1 text-sm text-[#0D4035]">
                                {checkoutResult.collectionPhone ? (
                                  <>
                                    <p>1. Open M-PESA on your phone</p>
                                    <p>2. Send <span className="font-semibold">{formatTsh(checkoutResult.amount)}</span> to <span className="font-semibold">{checkoutResult.collectionPhone}</span></p>
                                    <p>3. Use <span className="font-mono font-semibold">{checkoutResult.reference}</span> as the reference</p>
                                    <p>4. Access activates once payment is confirmed</p>
                                  </>
                                ) : (
                                  <p className="text-[#64748B]">{checkoutResult.instructions}</p>
                                )}
                              </div>
                            )}
                          </>
                        )}
                        <p className="mt-3 text-xs text-[#64748B]">
                          Questions? WhatsApp{' '}
                          <a href={`https://wa.me/${FOUNDER_WHATSAPP}`} target="_blank" rel="noreferrer" className="font-medium text-[#1A6B5C] underline underline-offset-2">
                            +{FOUNDER_WHATSAPP}
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {latestCheckout && !checkoutResult && (
                  <div className={`mt-4 rounded-xl border p-3 ${latestCheckout.status === 'REJECTED' ? 'border-red-200 bg-red-50' : 'border-[#D6F0E8] bg-white'}`}>
                    <p className="text-xs uppercase tracking-wide text-[#64748B]">Latest checkout</p>
                    <p className="mt-1 text-sm font-semibold text-[#0D4035]">
                      Ref {latestCheckout.transactionRef} · {formatTsh(latestCheckout.amount)} · {latestCheckout.status}
                    </p>
                    <p className={`mt-1 text-xs font-medium ${latestCheckout.status === 'REJECTED' ? 'text-red-700' : 'text-[#64748B]'}`}>
                      {paymentStatusMessage(latestCheckout)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {latestCheckout.checkoutUrl && (
                        <a href={latestCheckout.checkoutUrl} target="_blank" rel="noreferrer">
                          <Button variant="secondary" size="sm">
                            <ExternalLink size={14} />
                            Open payment
                          </Button>
                        </a>
                      )}
                      <Button variant="secondary" size="sm" onClick={() => paymentRequestsQuery.refetch()}>
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
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href={`https://wa.me/${FOUNDER_WHATSAPP}?text=${message}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex"
                >
                  <Button variant="secondary" className="w-full sm:w-auto">
                    <MessageCircle size={16} />
                    Contact us on WhatsApp
                  </Button>
                </a>
                <a href="/settings/subscription" className="inline-flex">
                  <Button variant="ghost" className="w-full sm:w-auto">View all plans</Button>
                </a>
              </div>
            </div>
          )}

          {!canManageSubscription && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#D6F0E8] bg-[#EDF7F3] p-4">
                <p className="text-xs uppercase tracking-wide text-[#64748B]">M-Pesa</p>
                <p className="mt-2 text-sm font-semibold text-[#0D4035]">+255 764 591 374</p>
                <p className="mt-1 text-xs text-[#475569]">Use your pharmacy name as the reference.</p>
              </div>
              <div className="rounded-2xl border border-[#D6F0E8] bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-[#64748B]">Need help?</p>
                <p className="mt-2 text-sm font-semibold text-[#0D4035]">Ask the pharmacy owner</p>
                <p className="mt-1 text-xs text-[#475569]">The owner can renew from the Subscription settings page.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
