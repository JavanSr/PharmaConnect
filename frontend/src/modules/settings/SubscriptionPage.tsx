import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { differenceInCalendarDays } from 'date-fns';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { usePharmacyStore } from '@/stores/pharmacyStore';

const FOUNDER_WHATSAPP = '255764591374';

const plans = [
  { tier: 'ADDO', monthly: 'TZS 20,000', annual: 'TZS 200,000', users: '2 users', features: ['Basic sale recording', 'Inventory and compliance', 'Knowledge Hub read access'] },
  { tier: 'STANDARD', monthly: 'TZS 55,000', annual: 'TZS 550,000', users: '4 users', features: ['Full dispensing workflow', 'Patient safety tools', 'Inventory, compliance, and reports'] },
  { tier: 'PREMIUM', monthly: 'TZS 95,000', annual: 'TZS 950,000', users: '6 users', features: ['Everything in Standard', 'Courses and CPD tracker', 'Advanced analytics'] },
  { tier: 'WHOLESALE', monthly: 'TZS 180,000', annual: 'TZS 1,800,000', users: '8 users + delivery', features: ['Wholesale catalogue and B2B', 'Delivery workflow', 'Wholesale operations'] },
  { tier: 'ENTERPRISE', monthly: 'Negotiated', annual: 'Negotiated', users: 'Unlimited', features: ['Enterprise reporting', 'Multi-outlet visibility', 'Custom rollout support'] },
];

export const SubscriptionPage: React.FC = () => {
  const setPharmacy = usePharmacyStore((state) => state.setPharmacy);
  const pharmacy = usePharmacyStore((state) => state.pharmacy);

  const subscriptionQuery = useQuery({
    queryKey: ['subscription-settings'],
    queryFn: () => api.get('/settings/subscription').then((response) => response.data),
  });

  const subscription = subscriptionQuery.data?.data;
  React.useEffect(() => {
    if (!subscription) {
      return;
    }

    const changed =
      !pharmacy ||
      Object.entries(subscription).some(([key, value]) => ((pharmacy as unknown as Record<string, unknown>)[key] !== value));

    if (changed) {
      setPharmacy({ ...(pharmacy ?? {}), ...subscription });
    }
  }, [pharmacy, setPharmacy, subscription]);

  const daysRemaining =
    subscription?.trialEndsAt
      ? Math.max(0, differenceInCalendarDays(new Date(subscription.trialEndsAt), new Date()))
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0D4035]">Subscription</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Review your current tier, trial status, and upgrade path. Payments are confirmed manually after M-Pesa or bank transfer.
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

        <div className="mt-5 rounded-2xl border border-[#D6F0E8] bg-[#F8FAFC] px-4 py-4">
          <p className="text-sm font-semibold text-[#0D4035]">Manual payment flow</p>
          <p className="mt-2 text-sm text-[#475569]">
            Send payment by M-Pesa or request bank transfer details from the founder. Once payment is confirmed, access is restored within 24 hours.
          </p>
          <p className="mt-2 text-sm font-medium text-[#0D4035]">M-Pesa contact: +255 764 591 374</p>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {plans.map((plan) => {
          const message = encodeURIComponent(`I would like to upgrade PharmaConnect to ${plan.tier}`);
          const isCurrent = subscription?.subscriptionTier === plan.tier;

          return (
            <Card key={plan.tier}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#0D4035]">{plan.tier}</p>
                  <p className="mt-1 text-xs text-[#64748B]">{plan.users}</p>
                </div>
                {isCurrent ? <Badge variant="success" size="sm">Current plan</Badge> : null}
              </div>
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
              <div className="mt-5 flex flex-wrap gap-3">
                <a href={`https://wa.me/${FOUNDER_WHATSAPP}?text=${message}`} target="_blank" rel="noreferrer">
                  <Button leftIcon={<MessageCircle size={16} />}>Contact us to upgrade</Button>
                </a>
              </div>
            </Card>
          );
        })}
      </div>

      {(subscription?.pharmacyType === 'RETAIL' || subscription?.pharmacyType === 'ADDO') && (
        <Card>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#0D4035]">Hybrid add-on</p>
              <p className="mt-1 text-sm text-[#475569]">
                Convert a retail pharmacy into a hybrid retail + wholesale operation for TZS 230,000/month total.
              </p>
            </div>
            <a
              href={`https://wa.me/${FOUNDER_WHATSAPP}?text=${encodeURIComponent('I would like to upgrade PharmaConnect to HYBRID ADD-ON')}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="secondary">Ask about hybrid add-on</Button>
            </a>
          </div>
        </Card>
      )}
    </div>
  );
};
