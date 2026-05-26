// frontend/src/pages/SubscriptionPage.tsx
//
// Drop-in subscription management page.
// Route it at /subscription in your React Router config.
//
// Required: TanStack Query (react-query) + fetch-based API client
// Tailwind CSS classes used throughout.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

// ── Types ─────────────────────────────────────────────────────────────────────

type SubscriptionTier = 'ADDO' | 'BASIC' | 'STANDARD' | 'PREMIUM' | 'WHOLESALE' | 'ENTERPRISE';
type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'CANCELLED';

interface Plan {
  tier:          SubscriptionTier;
  label:         string;
  amountTzs:     number;
  contactSales:  boolean;
}

interface SubscriptionSummary {
  tier:              SubscriptionTier;
  status:            SubscriptionStatus;
  trialEndsAt:       string | null;
  currentPeriodEnd:  string | null;
  gracePeriodEndsAt: string | null;
  daysRemaining:     number | null;
  amountTzs:         number;
  latestPayments:    {
    id: string;
    amountTzs: number;
    status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
    paidAt: string | null;
    paymentMethod: string | null;
  }[];
}

// ── API helpers ───────────────────────────────────────────────────────────────

const api = (path: string, opts?: RequestInit) =>
  fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...opts,
  }).then(async (r) => {
    const json = await r.json();
    if (!r.ok) throw new Error(json.error ?? 'Request failed');
    return json.data;
  });

// ── Plan definitions (mirrors backend TIER_PRICES) ───────────────────────────

const TIER_FEATURES: Record<SubscriptionTier, string[]> = {
  ADDO:       ['Dispensing log', 'Basic inventory', 'ADDO drug list', 'TMDA compliance basics'],
  BASIC:      ['Everything in ADDO', 'FEFO batch tracking', 'Low-stock alerts', 'Daily close reports'],
  STANDARD:   ['Everything in Basic', 'AWaRe antibiotic flags', 'Drug interaction checks', 'Patient safety counselling', 'NHIF claim support'],
  PREMIUM:    ['Everything in Standard', 'Demand forecasting', 'Seasonality analytics', 'Dead-stock insights', 'Cold chain logging'],
  WHOLESALE:  ['Everything in Premium', 'B2B order inbox', 'Credit limits & receivables', 'Delivery manifests', 'VAT-compliant invoicing', 'Per-client price overrides'],
  ENTERPRISE: ['Everything in Wholesale', 'Multi-outlet dashboard', 'Regional demand insights', 'API access', 'Dedicated support', 'Custom onboarding'],
};

const TIER_COLORS: Record<SubscriptionTier, string> = {
  ADDO:       'bg-slate-100 border-slate-300',
  BASIC:      'bg-blue-50 border-blue-300',
  STANDARD:   'bg-teal-50 border-teal-400',
  PREMIUM:    'bg-purple-50 border-purple-400',
  WHOLESALE:  'bg-amber-50 border-amber-400',
  ENTERPRISE: 'bg-gray-900 border-gray-700 text-white',
};

const TIER_BUTTON: Record<SubscriptionTier, string> = {
  ADDO:       'bg-slate-700 hover:bg-slate-800 text-white',
  BASIC:      'bg-blue-600 hover:bg-blue-700 text-white',
  STANDARD:   'bg-teal-600 hover:bg-teal-700 text-white',
  PREMIUM:    'bg-purple-600 hover:bg-purple-700 text-white',
  WHOLESALE:  'bg-amber-500 hover:bg-amber-600 text-white',
  ENTERPRISE: 'bg-white hover:bg-gray-100 text-gray-900',
};

function formatTzs(amount: number): string {
  return `Tsh ${amount.toLocaleString('en-TZ')}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Status banner ─────────────────────────────────────────────────────────────

function StatusBanner({ summary }: { summary: SubscriptionSummary }) {
  const banners: Record<SubscriptionStatus, { bg: string; text: string; message: string }> = {
    TRIALING:  { bg: 'bg-blue-600',  text: 'text-white', message: `Free trial — ${summary.daysRemaining ?? 0} day${summary.daysRemaining === 1 ? '' : 's'} remaining` },
    ACTIVE:    { bg: 'bg-green-600', text: 'text-white', message: `Active — renews ${formatDate(summary.currentPeriodEnd)}` },
    GRACE:     { bg: 'bg-amber-500', text: 'text-white', message: `Grace period — ${summary.daysRemaining ?? 0} day${summary.daysRemaining === 1 ? '' : 's'} left. Renew to avoid losing access.` },
    EXPIRED:   { bg: 'bg-red-600',   text: 'text-white', message: 'Subscription expired. Subscribe below to restore access.' },
    CANCELLED: { bg: 'bg-gray-600',  text: 'text-white', message: 'Subscription cancelled. Choose a plan below to reactivate.' },
  };

  const b = banners[summary.status];

  return (
    <div className={`${b.bg} ${b.text} rounded-lg px-4 py-3 text-sm font-medium`}>
      {b.message}
    </div>
  );
}

// ── Payment modal ─────────────────────────────────────────────────────────────

function PaymentModal({
  plan,
  onClose,
  onSuccess,
}: {
  plan: Plan;
  onClose: () => void;
  onSuccess: (url?: string) => void;
}) {
  const [phone, setPhone]           = useState('');
  const [billingMonths, setBilling] = useState(1);
  const [error, setError]           = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api('/subscriptions/initiate', {
        method: 'POST',
        body: JSON.stringify({
          tier:          plan.tier,
          buyerPhone:    phone,
          billingMonths,
        }),
      }),
    onSuccess: (data) => {
      onSuccess(data?.paymentGatewayUrl);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const total = plan.amountTzs * billingMonths;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Subscribe — {plan.label}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-5 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>{plan.label} × {billingMonths} month{billingMonths > 1 ? 's' : ''}</span>
            <span className="font-semibold text-gray-900">{formatTzs(total)}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile money phone number
            </label>
            <input
              type="tel"
              placeholder="255XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Works with Tigo Pesa, M-Pesa, Airtel Money, Halo Pesa
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Billing period</label>
            <select
              value={billingMonths}
              onChange={(e) => setBilling(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>Monthly — {formatTzs(plan.amountTzs)}</option>
              <option value={3}>Quarterly (3 months) — {formatTzs(plan.amountTzs * 3)}</option>
              <option value={12}>Annual (12 months) — {formatTzs(plan.amountTzs * 12)}</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        <button
          disabled={phone.length < 12 || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="mt-5 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {mutation.isPending ? 'Initiating payment…' : `Pay ${formatTzs(total)}`}
        </button>

        <p className="text-xs text-gray-400 text-center mt-3">
          You will receive a USSD prompt on your phone to confirm payment.
        </p>
      </div>
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  isCurrentTier,
  onSelect,
}: {
  plan: Plan;
  isCurrentTier: boolean;
  onSelect: (plan: Plan) => void;
}) {
  const features = TIER_FEATURES[plan.tier];
  const isEnterprise = plan.tier === 'ENTERPRISE';
  const colorClass = TIER_COLORS[plan.tier];
  const btnClass   = TIER_BUTTON[plan.tier];
  const isWhite    = plan.tier === 'ENTERPRISE';

  return (
    <div
      data-testid={`plan-card-${plan.tier}`}
      className={`relative border-2 rounded-2xl p-5 flex flex-col ${colorClass} ${isCurrentTier ? 'ring-4 ring-offset-2 ring-blue-500' : ''}`}
    >
      {isCurrentTier && (
        <span className="absolute -top-3 left-4 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
          Current plan
        </span>
      )}

      <div className="mb-3">
        <h3 className={`text-lg font-bold ${isWhite ? 'text-white' : 'text-gray-900'}`}>
          {plan.label}
        </h3>
        {isEnterprise ? (
          <p className={`text-2xl font-extrabold mt-1 ${isWhite ? 'text-white' : 'text-gray-900'}`}>
            Custom
          </p>
        ) : (
          <p className={`text-2xl font-extrabold mt-1 ${isWhite ? 'text-white' : 'text-gray-900'}`}>
            <span data-testid={`price-${plan.tier}`}>{formatTzs(plan.amountTzs)}</span>
            <span className={`text-sm font-normal ${isWhite ? 'text-gray-300' : 'text-gray-500'}`}> /month</span>
          </p>
        )}
      </div>

      <ul className="flex-1 space-y-1.5 mb-5">
        {features.map((f) => (
          <li key={f} className={`flex items-start gap-2 text-sm ${isWhite ? 'text-gray-300' : 'text-gray-600'}`}>
            <span className="mt-0.5 text-green-500 flex-shrink-0">✓</span>
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan)}
        className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors ${btnClass}`}
      >
        {isEnterprise ? 'Contact sales' : isCurrentTier ? 'Manage plan' : 'Subscribe'}
      </button>
    </div>
  );
}

// ── Payment history ───────────────────────────────────────────────────────────

function PaymentHistory({ payments }: { payments: SubscriptionSummary['latestPayments'] }) {
  if (!payments.length) return null;

  const statusColors: Record<string, string> = {
    PAID:    'bg-green-100 text-green-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    FAILED:  'bg-red-100 text-red-700',
  };

  return (
    <div className="mt-8">
      <h3 className="text-base font-semibold text-gray-800 mb-3">Payment history</h3>
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2">Date</th>
              <th className="text-left px-4 py-2">Method</th>
              <th className="text-right px-4 py-2">Amount</th>
              <th className="text-center px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map((p) => (
              <tr key={p.id} className="bg-white">
                <td className="px-4 py-2 text-gray-600">{formatDate(p.paidAt)}</td>
                <td className="px-4 py-2 text-gray-600">{p.paymentMethod ?? '—'}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-800">{formatTzs(p.amountTzs)}</td>
                <td className="px-4 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ['subscription-plans'],
    queryFn:  () => api('/subscriptions/plans'),
  });

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery<SubscriptionSummary>({
    queryKey: ['subscription-me'],
    queryFn:  () => api('/subscriptions/me'),
  });

  const handlePlanSelect = (plan: Plan) => {
    if (plan.tier === 'ENTERPRISE') {
      window.location.href = 'mailto:support@apotekh.co.tz?subject=Enterprise Plan Enquiry';
      return;
    }
    setSelectedPlan(plan);
  };

  const handlePaymentSuccess = (gatewayUrl?: string) => {
    setSelectedPlan(null);
    if (gatewayUrl) {
      window.open(gatewayUrl, '_blank');
    } else {
      setSuccessMessage('Payment initiated! Check your phone for the USSD prompt. Your subscription will activate once payment is confirmed.');
    }
    setTimeout(() => refetchSummary(), 5000);
  };

  if (plansLoading || summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading subscription details…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage your APOTEKH plan and billing
        </p>
      </div>

      {/* Status banner */}
      {summary && (
        <div className="mb-6">
          <StatusBanner summary={summary} />
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          {successMessage}
        </div>
      )}

      {/* Plan grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {plans.map((plan) => (
          <PlanCard
            key={plan.tier}
            plan={plan}
            isCurrentTier={summary?.tier === plan.tier}
            onSelect={handlePlanSelect}
          />
        ))}
      </div>

      {/* Payment history */}
      {summary && <PaymentHistory payments={summary.latestPayments} />}

      {/* Contact footer */}
      <p className="text-xs text-gray-400 text-center mt-8">
        Questions about billing? Email{' '}
        <a href="mailto:support@apotekh.co.tz" className="underline hover:text-gray-600">
          support@apotekh.co.tz
        </a>
      </p>

      {/* Payment modal */}
      {selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
