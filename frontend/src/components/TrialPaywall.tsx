import React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type { BillingCycle, SubscriptionTier } from '@/types';

const FOUNDER_WHATSAPP = '255764591374';
const TIER_OPTIONS = ['ADDO', 'ESSENTIAL', 'ADDO_PLUS', 'STANDARD', 'PREMIUM', 'WHOLESALE'] as const satisfies readonly SubscriptionTier[];
type PaymentRequestTier = (typeof TIER_OPTIONS)[number];

const isPaymentRequestTier = (tier?: string | null): tier is PaymentRequestTier =>
  Boolean(tier && TIER_OPTIONS.some((option) => option === tier));

const planPriceTable: Record<PaymentRequestTier, Record<BillingCycle, number>> = {
  ADDO: { MONTHLY: 15_000, ANNUAL: 150_000 },
  ESSENTIAL: { MONTHLY: 39_000, ANNUAL: 390_000 },
  ADDO_PLUS: { MONTHLY: 45_000, ANNUAL: 450_000 },
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
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
};

const formatTsh = (amount: number | string) => `Tsh ${Number(amount).toLocaleString()}`;

const paymentStatusMessage = (request: SubscriptionPaymentRequest) => {
  if (request.status === 'REJECTED') {
    return request.reviewNote || 'Payment failed. Check balance, payment approval, or transaction details and try again.';
  }
  if (request.status === 'CONFIRMED') {
    return 'Payment confirmed. Refresh the app if access has not reopened yet.';
  }
  return 'Waiting for payment provider confirmation.';
};

export const TrialPaywall: React.FC<{ currentTier?: string | null }> = ({ currentTier }) => {
  const user = useAuthStore((state) => state.user);
  const toast = useNotificationStore((state) => state.toast);
  const canManageSubscription = ['OWNER', 'SUPER_ADMIN'].includes(user?.role || '');
  const [draft, setDraft] = React.useState<{
    requestedTier: PaymentRequestTier;
    billingCycle: BillingCycle;
    amount: string;
    paymentMethod: string;
    transactionRef: string;
    payerPhone: string;
    note: string;
  }>({
    requestedTier: isPaymentRequestTier(currentTier) ? currentTier : 'STANDARD',
    billingCycle: 'MONTHLY',
    amount: '',
    paymentMethod: 'M-Pesa',
    transactionRef: '',
    payerPhone: '',
    note: '',
  });
  const [checkoutDraft, setCheckoutDraft] = React.useState<{
    requestedTier: PaymentRequestTier;
    billingCycle: BillingCycle;
    payerPhone: string;
  }>({
    requestedTier: isPaymentRequestTier(currentTier) ? currentTier : 'STANDARD',
    billingCycle: 'MONTHLY',
    payerPhone: '',
  });
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
    `I would like to upgrade APOTEKH to ${currentTier || 'STANDARD'}`,
  );
  const submitPaymentRequestMutation = useMutation({
    mutationFn: () => api.post('/settings/subscription/payment-requests', {
      ...draft,
      amount: Number(draft.amount),
    }),
    onSuccess: () => {
      toast.success('Payment request submitted. Access will reopen after confirmation.');
      setDraft((current) => ({
        ...current,
        transactionRef: '',
        payerPhone: '',
        note: '',
      }));
    },
    onError: (error: any) => {
      const code = error.response?.data?.error;
      toast.error(code === 'PAYMENT_REFERENCE_ALREADY_SUBMITTED'
        ? 'This transaction reference was already submitted.'
        : code || 'Could not submit payment request');
    },
  });
  const createCheckoutMutation = useMutation({
    mutationFn: () => api.post('/settings/subscription/checkout', checkoutDraft).then((response) => response.data),
    onSuccess: async () => {
      toast.success('Checkout created. Complete payment with the reference shown.');
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
            Access is paused until payment is confirmed. {canManageSubscription
              ? 'You can still open the subscription page to review plans and message the founder directly.'
              : 'Ask the owner to renew or request an extension.'}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#D6F0E8] bg-[#EDF7F3] p-4">
              <p className="text-xs uppercase tracking-wide text-[#64748B]">M-Pesa</p>
              <p className="mt-2 text-sm font-semibold text-[#0D4035]">+255 764 591 374</p>
              <p className="mt-1 text-xs text-[#475569]">Use your pharmacy name as the reference.</p>
            </div>
            <div className="rounded-2xl border border-[#D6F0E8] bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-[#64748B]">Bank transfer</p>
              <p className="mt-2 text-sm font-semibold text-[#0D4035]">Request current bank details via WhatsApp</p>
              <p className="mt-1 text-xs text-[#475569]">
                Access is restored within 24 hours after confirmation.
              </p>
            </div>
          </div>

          {canManageSubscription && (
            <div className="mt-6 space-y-5">
              <div className="rounded-2xl border border-[#BFE7DC] bg-[#EDF7F3] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#0D4035]">Pay and reopen access</p>
                    <p className="mt-1 text-xs text-[#64748B]">Create a checkout reference. Access reopens automatically after provider confirmation.</p>
                  </div>
                  <Badge variant="success" size="sm">Self-service</Badge>
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
                      {TIER_OPTIONS.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
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
                  <p className="text-sm font-semibold text-[#0D4035]">{formatTsh(checkoutAmount)}</p>
                  <Button
                    loading={createCheckoutMutation.isPending}
                    disabled={checkoutDraft.payerPhone.trim().length < 7}
                    onClick={() => createCheckoutMutation.mutate()}
                  >
                    Create checkout
                  </Button>
                </div>
                {latestCheckout && (
                  <div className={`mt-4 rounded-xl border p-3 ${latestCheckout.status === 'REJECTED' ? 'border-red-200 bg-red-50' : 'border-[#D6F0E8] bg-white'}`}>
                    <p className="text-xs uppercase tracking-wide text-[#64748B]">Latest checkout</p>
                    <p className="mt-1 text-sm font-semibold text-[#0D4035]">Ref {latestCheckout.transactionRef}</p>
                    <p className="mt-1 text-xs text-[#64748B]">{formatTsh(latestCheckout.amount)} · {latestCheckout.status}</p>
                    <p className={`mt-2 text-xs font-medium ${latestCheckout.status === 'REJECTED' ? 'text-red-700' : 'text-[#64748B]'}`}>
                      {paymentStatusMessage(latestCheckout)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {latestCheckout.checkoutUrl && (
                        <a href={latestCheckout.checkoutUrl} target="_blank" rel="noreferrer">
                          <Button variant="secondary" size="sm">Open payment</Button>
                        </a>
                      )}
                      <Button variant="secondary" size="sm" onClick={() => paymentRequestsQuery.refetch()}>
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

              <div className="rounded-2xl border border-[#D6F0E8] bg-[#F8FAFC] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#0D4035]">Submit payment details</p>
                    <p className="mt-1 text-xs text-[#64748B]">Use this after paying by M-Pesa or bank transfer.</p>
                  </div>
                  <Badge variant="warning" size="sm">Founder review</Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#0D4035]">Requested tier</label>
                    <select
                      value={draft.requestedTier}
                      onChange={(event) => {
                        const nextTier = event.target.value;
                        if (isPaymentRequestTier(nextTier)) {
                          setDraft((current) => ({ ...current, requestedTier: nextTier }));
                        }
                      }}
                      className="h-10 w-full rounded-xl border border-[#D6F0E8] bg-white px-3 text-sm text-[#0D4035] outline-none focus:border-[#1A6B5C] focus:ring-2 focus:ring-[#1A6B5C]/20"
                    >
                      {TIER_OPTIONS.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#0D4035]">Billing cycle</label>
                    <select
                      value={draft.billingCycle}
                      onChange={(event) => setDraft((current) => ({
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
                    label="Amount paid (Tsh)"
                    type="number"
                    min="1"
                    value={draft.amount}
                    onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
                    placeholder="55000"
                  />
                  <Input
                    label="Transaction reference"
                    value={draft.transactionRef}
                    onChange={(event) => setDraft((current) => ({ ...current, transactionRef: event.target.value }))}
                    placeholder="Receipt/reference number"
                  />
                  <Input
                    label="Payment method"
                    value={draft.paymentMethod}
                    onChange={(event) => setDraft((current) => ({ ...current, paymentMethod: event.target.value }))}
                    placeholder="M-Pesa, bank transfer"
                  />
                  <Input
                    label="Payer phone"
                    value={draft.payerPhone}
                    onChange={(event) => setDraft((current) => ({ ...current, payerPhone: event.target.value }))}
                    placeholder="+255..."
                  />
                </div>
                <div className="mt-4">
                  <Button
                    loading={submitPaymentRequestMutation.isPending}
                    disabled={!draft.amount || !draft.transactionRef.trim()}
                    onClick={() => submitPaymentRequestMutation.mutate()}
                  >
                    Submit for confirmation
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href={`https://wa.me/${FOUNDER_WHATSAPP}?text=${message}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex"
                >
                  <Button variant="secondary" className="w-full sm:w-auto">Contact founder on WhatsApp</Button>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
