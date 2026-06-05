// frontend/src/modules/settings/MyOutletsPage.tsx
//
// "My Locations" settings page — lets an OWNER view all their pharmacies/ADDOs
// and add a new one without creating a new account.
// Each new location starts its own 14-day free trial.

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { differenceInCalendarDays } from 'date-fns';
import { Building2, Plus, Clock, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';

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

// ── Form schema ───────────────────────────────────────────────────────────────

const addOutletSchema = z.object({
  name:          z.string().trim().min(2, 'Name is required'),
  pharmacyType:  z.enum(['ADDO', 'RETAIL']),
  region:        z.string().trim().min(1, 'Region is required'),
  address:       z.string().trim().min(2, 'Address is required'),
  licenceNumber: z.string().trim().optional(),
});
type AddOutletForm = z.infer<typeof addOutletSchema>;

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

const TIER_LABELS: Record<string, string> = {
  ADDO: 'ADDO', ESSENTIAL: 'Essential', ADDO_PLUS: 'ADDO Plus',
  STANDARD: 'Standard', PREMIUM: 'Premium', WHOLESALE: 'Wholesale', ENTERPRISE: 'Enterprise',
};

const REGIONS = [
  'Arusha', 'Dar es Salaam', 'Dodoma', 'Geita', 'Iringa', 'Kagera', 'Katavi',
  'Kigoma', 'Kilimanjaro', 'Lindi', 'Manyara', 'Mara', 'Mbeya', 'Morogoro',
  'Mtwara', 'Mwanza', 'Njombe', 'Pemba North', 'Pemba South', 'Pwani',
  'Rukwa', 'Ruvuma', 'Shinyanga', 'Simiyu', 'Singida', 'Songwe', 'Tabora',
  'Tanga', 'Unguja North', 'Unguja South', 'Zanzibar',
];

function statusBadge(pharmacy: OutletSummary['pharmacy']) {
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

  const { data, isLoading } = useQuery({
    queryKey: ['my-pharmacies'],
    queryFn: () => api.get('/me/pharmacies').then(r => r.data.data as OutletSummary[]),
    staleTime: 30_000,
  });

  const outlets = data ?? [];

  const {
    register, handleSubmit, reset,
    formState: { errors },
  } = useForm<AddOutletForm>({ resolver: zodResolver(addOutletSchema) });

  const addMutation = useMutation({
    mutationFn: (payload: AddOutletForm) =>
      api.post('/me/pharmacies/add-outlet', payload).then(r => r.data.data),
    onSuccess: (result) => {
      const msg = result.sharedTrial && result.trialEndsAt
        ? `${result.name} added — trial ends ${new Date(result.trialEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} with your other locations`
        : `${result.name} added and active`;
      toast.success(msg);
      setShowForm(false);
      reset();
      void qc.invalidateQueries({ queryKey: ['my-pharmacies'] });
    },
    onError: (e: any) => {
      const body = e.response?.data;
      if (body?.error === 'OUTLET_LIMIT_REACHED') {
        setLimitError(body as OutletLimitError);
        setShowForm(false);
      } else {
        toast.error(body?.error || 'Could not add location');
      }
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#0D4035]">My Locations</h2>
          <p className="text-sm text-[#64748B] mt-1">
            Each location has its own 14-day trial. After the trial, subscribe
            independently for that location.
          </p>
        </div>
        {!showForm && (
          <Button
            size="sm"
            leftIcon={<Plus size={15} />}
            onClick={() => setShowForm(true)}
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

      {/* ── Tier upgrade prompt ── */}
      {limitError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 space-y-2">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">{limitError.message}</p>
              {limitError.upgradeTo && (
                <p className="text-sm text-amber-700 mt-1">
                  Upgrade to <strong>{limitError.upgradeTo}</strong> to add more locations
                  {limitError.upgradePrice > 0
                    ? ` — Tsh ${limitError.upgradePrice.toLocaleString()}/month.`
                    : '. Contact us for Enterprise pricing.'}
                </p>
              )}
            </div>
            <button
              onClick={() => setLimitError(null)}
              className="text-amber-500 hover:text-amber-700"
            >
              <X size={16} />
            </button>
          </div>
          <a
            href="/settings/subscription"
            className="inline-block text-sm font-medium text-amber-800 underline underline-offset-2"
          >
            Go to Subscription → upgrade plan
          </a>
        </div>
      )}

      {/* ── Add new location form ── */}
      {showForm && (
        <Card
          header={
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#0D4035]">Add new location</span>
              <button
                onClick={() => { setShowForm(false); reset(); }}
                className="text-[#94A3B8] hover:text-[#64748B]"
              >
                <X size={16} />
              </button>
            </div>
          }
        >
          <form onSubmit={handleSubmit(d => addMutation.mutate(d))} className="space-y-4">

            <Input
              label="Pharmacy / ADDO name"
              placeholder="e.g. Baraka Pharmacy Kijenge"
              {...register('name')}
              error={errors.name?.message}
              required
            />

            <Select
              label="Type"
              options={[
                { value: 'ADDO',   label: 'ADDO (duka la dawa)' },
                { value: 'RETAIL', label: 'Retail Pharmacy' },
              ]}
              {...register('pharmacyType')}
              error={errors.pharmacyType?.message}
            />

            <Select
              label="Region"
              options={[
                { value: '', label: 'Select region…' },
                ...REGIONS.map(r => ({ value: r, label: r })),
              ]}
              {...(register('region') as any)}
              error={errors.region?.message}
            />

            <Input
              label="Physical address"
              placeholder="e.g. Sokoine Road, near the market"
              {...register('address')}
              error={errors.address?.message}
              required
            />

            <Input
              label="Licence number (optional — can be added later)"
              placeholder="TFDA/ADDO/2025/…"
              {...register('licenceNumber')}
              error={errors.licenceNumber?.message}
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
              <Button type="button" variant="secondary" onClick={() => { setShowForm(false); reset(); }}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};
