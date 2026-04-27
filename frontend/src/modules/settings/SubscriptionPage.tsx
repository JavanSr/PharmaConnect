import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { differenceInCalendarDays } from 'date-fns';
import { CheckCircle2, MessageCircle, Plus, Save, Smartphone, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { usePaymentMethodStore } from '@/stores/paymentMethodStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
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
  { tier: 'ADDO', monthly: 'TZS 20,000', annual: 'TZS 200,000', users: '2 users', features: ['Basic sale recording', 'Inventory and compliance', 'Knowledge Hub read access'] },
  { tier: 'STANDARD', monthly: 'TZS 55,000', annual: 'TZS 550,000', users: '4 users', features: ['Full dispensing workflow', 'Patient safety tools', 'Inventory, compliance, and reports'] },
  { tier: 'PREMIUM', monthly: 'TZS 75,000', annual: 'TZS 750,000', users: '6 users', features: ['Everything in Standard', 'Advanced analytics and forecasting', 'Priority support'] },
  { tier: 'WHOLESALE', monthly: 'TZS 100,000', annual: 'TZS 1,000,000', users: '8 users + delivery', features: ['Wholesale catalogue and B2B', 'Delivery workflow', 'Wholesale operations'] },
  { tier: 'ENTERPRISE', monthly: 'Negotiated', annual: 'Negotiated', users: 'Unlimited', features: ['Enterprise reporting', 'Multi-outlet visibility', 'Custom rollout support'] },
];

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
  const [paymentMethodsDraft, setPaymentMethodsDraft] = React.useState<PaymentMethodSetting[]>(
    () => normalizePaymentMethodConfig(null).methods,
  );
  const [paymentMethodsDirty, setPaymentMethodsDirty] = React.useState(false);

  const subscriptionQuery = useQuery({
    queryKey: ['subscription-settings'],
    queryFn: () => api.get('/settings/subscription').then((response) => response.data),
  });
  const paymentSettingsQuery = useQuery({
    queryKey: ['settings-config', PAYMENT_METHOD_CONFIG_KEY],
    queryFn: () => api.get(`/settings/config/${PAYMENT_METHOD_CONFIG_KEY}`).then((response) => response.data),
    enabled: canManagePaymentSettings,
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
                Convert a retail pharmacy into a hybrid retail + wholesale operation for TZS 130,000/month total.
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
