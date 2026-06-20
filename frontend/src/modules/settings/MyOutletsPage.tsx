// frontend/src/modules/settings/MyOutletsPage.tsx
//
// "My Locations" settings page — lets an OWNER view all their pharmacies/ADDOs
// and add a new one without creating a new account.
// ADDO owners can add unlimited ADDO outlets at Tsh 15,000/month each —
// each additional outlet starts SUSPENDED until payment is confirmed by founder.

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { differenceInCalendarDays } from 'date-fns';
import { Building2, Plus, Clock, CheckCircle, AlertTriangle, X, Hourglass } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';

// ── Types ─────────────────────────────────────────────────────────────────────

type PharmacyStatus = 'TRIAL' | 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'SUSPENDED';
type PharmacyType   = 'ADDO' | 'RETAIL' | 'WHOLESALE';

interface OutletSummary {
  pharmacyId: string;
  role: string;
  pharmacy: {
    id: string;
    name: string;
    region: string;
    pharmacyType: PharmacyType;
    subscriptionTier: string;
    status: PharmacyStatus;
    trialActive: boolean;
    trialEndsAt: string | null;
    isActive: boolean;
    createdAt: string;
  };
}

// ── Form schemas ──────────────────────────────────────────────────────────────

const baseOutletSchema = {
  name:          z.string().trim().min(2, 'Name is required'),
  pharmacyType:  z.enum(['ADDO', 'RETAIL']),
  region:        z.string().trim().min(1, 'Region is required'),
  address:       z.string().trim().min(2, 'Address is required'),
  licenceNumber: z.string().trim().optional(),
};

const addOutletSchema = z.object(baseOutletSchema);

const addAddonOutletSchema = z.object({
  ...baseOutletSchema,
  payerPhone: z.string().trim().min(7, 'Phone number is required for payment'),
});

type AddOutletForm      = z.infer<typeof addOutletSchema>;
type AddAddonOutletForm = z.infer<typeof addAddonOutletSchema>;

interface OutletLimitError {
  error: 'OUTLET_LIMIT_REACHED';
  message: string;
  currentTier: string;
  currentCount: number;
  limit: number;
  upgradeTo: string | null;
  upgradePrice: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADDO_OUTLET_PRICE = 15_000;

const TIER_LABELS: Record<string, string> = {
  ADDO: 'ADDO', ESSENTIAL: 'Basic', STANDARD: 'Standard',
  PREMIUM: 'Premium', WHOLESALE: 'Wholesale', ENTERPRISE: 'Enterprise',
};

const REGIONS = [
  'Arusha', 'Dar es Salaam', 'Dodoma', 'Geita', 'Iringa', 'Kagera', 'Katavi',
  'Kigoma', 'Kilimanjaro', 'Lindi', 'Manyara', 'Mara', 'Mbeya', 'Morogoro',
  'Mtwara', 'Mwanza', 'Njombe', 'Pemba North', 'Pemba South', 'Pwani',
  'Rukwa', 'Ruvuma', 'Shinyanga', 'Simiyu', 'Singida', 'Songwe', 'Tabora',
  'Tanga', 'Unguja North', 'Unguja South', 'Zanzibar',
];

function statusBadge(pharmacy: OutletSummary['pharmacy']) {
  if (pharmacy.status === 'SUSPENDED' && !pharmacy.isActive) {
    return <Badge variant="muted" size="sm"><Hourglass size={11} className="mr-1 inline" />Pending activation</Badge>;
  }
  if (pharmacy.status === 'TRIAL' || pharmacy.trialActive) {
    const daysLeft = pharmacy.trialEndsAt
      ? Math.max(0, differenceInCalendarDays(new Date(pharmacy.trialEndsAt), new Date()))
      : 0;
    return <Badge variant="warning" size="sm"><Clock size={11} className="mr-1 inline" />Trial — {daysLeft}d left</Badge>;
  }
  if (pharmacy.status === 'ACTIVE') {
    return <Badge variant="success" size="sm"><CheckCircle size={11} className="mr-1 inline" />Active</Badge>;
  }
  if (pharmacy.status === 'GRACE') {
    return <Badge variant="warning" size="sm"><AlertTriangle size={11} className="mr-1 inline" />Grace period</Badge>;
  }
  return <Badge variant="muted" size="sm">{pharmacy.status}</Badge>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const MyOutletsPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [limitError, setLimitError] = useState<OutletLimitError | null>(null);
  const toast = useNotificationStore(s => s.toast);
  const qc = useQueryClient();
  const currentPharmacy = usePharmacyStore(s => s.pharmacy);
  const isAddo = currentPharmacy?.subscriptionTier === 'ADDO';

  const { data, isLoading } = useQuery({
    queryKey: ['my-pharmacies'],
    queryFn: () => api.get('/me/pharmacies').then(r => r.data.data as OutletSummary[]),
    staleTime: 30_000,
  });

  const outlets = data ?? [];
  const activeOutletCount = outlets.filter(o => o.pharmacy.isActive || o.pharmacy.status === 'SUSPENDED').length;
  // ADDO addon path: ADDO owner who already has at least one outlet
  const isAddonPath = isAddo && activeOutletCount >= 1;

  const standardForm = useForm<AddOutletForm>({ resolver: zodResolver(addOutletSchema) });
  const addonForm    = useForm<AddAddonOutletForm>({ resolver: zodResolver(addAddonOutletSchema) });

  const resetForms = () => { standardForm.reset(); addonForm.reset(); };

  const addMutation = useMutation({
    mutationFn: (payload: AddOutletForm | AddAddonOutletForm) =>
      api.post('/me/pharmacies/add-outlet', payload).then(r => r.data.data),
    onSuccess: (result) => {
      if (result.pendingPayment) {
        const msg = result.instructions ?? `${result.name} created — awaiting payment confirmation.`;
        toast.success(msg, 8000);
      } else {
        const msg = result.sharedTrial && result.trialEndsAt
          ? `${result.name} added — trial ends ${new Date(result.trialEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} with your other locations`
          : `${result.name} added and active`;
        toast.success(msg);
      }
      setShowForm(false);
      resetForms();
      void qc.invalidateQueries({ queryKey: ['my-pharmacies'] });
    },
    onError: (e: any) => {
      const body = e.response?.data;
      if (body?.error === 'OUTLET_LIMIT_REACHED') {
        setLimitError(body as OutletLimitError);
        setShowForm(false);
      } else {
        toast.error(body?.message || body?.error || 'Could not add location');
      }
    },
  });

  const onSubmitStandard = (d: AddOutletForm) => addMutation.mutate(d);
  const onSubmitAddon    = (d: AddAddonOutletForm) => addMutation.mutate(d);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#0D4035]">My Locations</h2>
          <p className="text-sm text-[#64748B] mt-1">
            {isAddo
              ? 'Each ADDO location is Tsh 15,000/month. Add as many as you need.'
              : 'Each location has its own 14-day trial. After the trial, subscribe independently for that location.'}
          </p>
        </div>
        {!showForm && (
          <Button
            size="sm"
            leftIcon={<Plus size={15} />}
            onClick={() => { setShowForm(true); setLimitError(null); }}
          >
            Add location
          </Button>
        )}
      </div>

      {/* ── Existing outlets ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 border-4 border-[#1A6B5C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {outlets.map(({ pharmacyId, pharmacy, role }) => (
            <div
              key={pharmacyId}
              className="flex items-start justify-between gap-4 rounded-xl border border-[#D6F0E8] bg-white px-5 py-4"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-xl bg-[#EDF7F3] flex items-center justify-center">
                  <Building2 size={16} className="text-[#1A6B5C]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0D4035] truncate">{pharmacy.name}</p>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {pharmacy.region} · {pharmacy.pharmacyType} · {TIER_LABELS[pharmacy.subscriptionTier] ?? pharmacy.subscriptionTier}
                  </p>
                  {pharmacy.status === 'SUSPENDED' && !pharmacy.isActive && (
                    <p className="text-xs text-[#94A3B8] mt-0.5">Awaiting founder payment confirmation</p>
                  )}
                  {role !== 'OWNER' && (
                    <p className="text-xs text-[#94A3B8] mt-0.5">Your role: {role}</p>
                  )}
                </div>
              </div>
              <div className="shrink-0">{statusBadge(pharmacy)}</div>
            </div>
          ))}

          {outlets.length === 0 && !isLoading && (
            <div className="rounded-xl border border-dashed border-[#D6F0E8] bg-[#F8FCFA] py-10 text-center">
              <Building2 size={24} className="mx-auto text-[#AFDFD3] mb-2" />
              <p className="text-sm text-[#64748B]">No locations yet.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tier upgrade prompt (non-ADDO) ── */}
      {limitError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 space-y-2">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">{limitError.message}</p>
              {limitError.upgradeTo && (
                <p className="text-sm text-amber-700 mt-1">
                  Upgrade to <strong>{TIER_LABELS[limitError.upgradeTo] ?? limitError.upgradeTo}</strong> to add more locations
                  {limitError.upgradePrice > 0
                    ? ` — Tsh ${limitError.upgradePrice.toLocaleString()}/month.`
                    : '. Contact us for Enterprise pricing.'}
                </p>
              )}
            </div>
            <button onClick={() => setLimitError(null)} className="text-amber-500 hover:text-amber-700">
              <X size={16} />
            </button>
          </div>
          <a href="/settings/subscription" className="inline-block text-sm font-medium text-amber-800 underline underline-offset-2">
            Go to Subscription → upgrade plan
          </a>
        </div>
      )}

      {/* ── Add new location form ── */}
      {showForm && (
        <Card
          header={
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#0D4035]">
                {isAddonPath ? 'Add another ADDO' : 'Add new location'}
              </span>
              <button
                onClick={() => { setShowForm(false); resetForms(); }}
                className="text-[#94A3B8] hover:text-[#64748B]"
              >
                <X size={16} />
              </button>
            </div>
          }
        >
          {isAddonPath ? (
            /* ── ADDO addon form — AzamPay STK push ── */
            <form onSubmit={addonForm.handleSubmit(onSubmitAddon)} className="space-y-4">
              <div className="rounded-lg bg-[#EDF7F3] px-4 py-3 text-xs text-[#1A6B5C] space-y-1">
                <p className="font-semibold">Tsh {ADDO_OUTLET_PRICE.toLocaleString()}/month per ADDO</p>
                <p>Enter your mobile money number below. A payment request will be sent to your phone — approve it with your PIN and the ADDO activates automatically.</p>
              </div>

              <Input
                label="ADDO name"
                placeholder="e.g. Baraka Duka la Dawa Kijenge"
                {...addonForm.register('name')}
                error={addonForm.formState.errors.name?.message}
                required
              />

              <input type="hidden" value="ADDO" {...addonForm.register('pharmacyType')} />

              <Select
                label="Region"
                options={[
                  { value: '', label: 'Select region…' },
                  ...REGIONS.map(r => ({ value: r, label: r })),
                ]}
                {...(addonForm.register('region') as any)}
                error={addonForm.formState.errors.region?.message}
              />

              <Input
                label="Physical address"
                placeholder="e.g. Sokoine Road, near the market"
                {...addonForm.register('address')}
                error={addonForm.formState.errors.address?.message}
                required
              />

              <Input
                label="PC Registration Number (optional)"
                placeholder="e.g. PC/2025/XXXXX"
                {...addonForm.register('licenceNumber')}
                error={addonForm.formState.errors.licenceNumber?.message}
              />

              <div className="border-t border-[#D6F0E8] pt-4">
                <Input
                  label="Mobile money number"
                  placeholder="+255 7xx xxx xxx"
                  {...addonForm.register('payerPhone')}
                  error={addonForm.formState.errors.payerPhone?.message}
                  required
                />
                <p className="mt-1.5 text-xs text-[#64748B]">
                  Supports M-Pesa, Tigo Pesa, Airtel Money, Halopesa — we detect the network automatically.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <Button type="submit" loading={addMutation.isPending} leftIcon={<Plus size={15} />}>
                  Pay Tsh {ADDO_OUTLET_PRICE.toLocaleString()} and create
                </Button>
                <Button type="button" variant="secondary" onClick={() => { setShowForm(false); resetForms(); }}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            /* ── Standard outlet form ── */
            <form onSubmit={standardForm.handleSubmit(onSubmitStandard)} className="space-y-4">
              <Input
                label="Pharmacy / ADDO name"
                placeholder="e.g. Baraka Pharmacy Kijenge"
                {...standardForm.register('name')}
                error={standardForm.formState.errors.name?.message}
                required
              />

              <Select
                label="Type"
                options={[
                  { value: 'ADDO',   label: 'ADDO (duka la dawa)' },
                  { value: 'RETAIL', label: 'Retail Pharmacy' },
                ]}
                {...standardForm.register('pharmacyType')}
                error={standardForm.formState.errors.pharmacyType?.message}
              />

              <Select
                label="Region"
                options={[
                  { value: '', label: 'Select region…' },
                  ...REGIONS.map(r => ({ value: r, label: r })),
                ]}
                {...(standardForm.register('region') as any)}
                error={standardForm.formState.errors.region?.message}
              />

              <Input
                label="Physical address"
                placeholder="e.g. Sokoine Road, near the market"
                {...standardForm.register('address')}
                error={standardForm.formState.errors.address?.message}
                required
              />

              <Input
                label="PC Registration Number (optional — can be added later)"
                placeholder="e.g. PC/2025/XXXXX"
                {...standardForm.register('licenceNumber')}
                error={standardForm.formState.errors.licenceNumber?.message}
              />

              <div className="rounded-lg bg-[#EDF7F3] px-4 py-3 text-xs text-[#1A6B5C] space-y-1">
                {outlets.some(o => o.pharmacy.trialActive) ? (
                  <>
                    <p><strong>Shared trial</strong> — this location joins your existing trial.</p>
                    <p>
                      All your locations expire together on{' '}
                      <strong>
                        {new Date(outlets.find(o => o.pharmacy.trialActive)!.pharmacy.trialEndsAt!).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </strong>. One payment covers all of them.
                    </p>
                  </>
                ) : (
                  <p>This location joins your active subscription immediately — no separate trial.</p>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <Button type="submit" loading={addMutation.isPending} leftIcon={<Plus size={15} />}>
                  Create location
                </Button>
                <Button type="button" variant="secondary" onClick={() => { setShowForm(false); resetForms(); }}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}
    </div>
  );
};
