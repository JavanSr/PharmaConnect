import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { InteractionAlert } from './InteractionAlert';
import { NCDHints } from './NCDHints';
import type { DispensingCartItem, SafetyReviewResponse, SafetySessionPayload } from './types';

type OverrideDraft = {
  reason: string;
  pic_pin: string;
};

type CounsellingSuggestion = {
  id: string;
  suggestionText: string;
  severity?: string;
  drug?: string;
  cached?: boolean;
};

const normalizeReview = (raw: SafetyReviewResponse | null): SafetyReviewResponse | null => {
  if (!raw) {
    return null;
  }

  const interactions = raw.interactions ?? [];
  const contraindications = raw.contraindications ?? [];
  const precautions = raw.precautions ?? [];
  const alerts = [...interactions, ...contraindications, ...precautions];
  const severitySummary = raw.severitySummary ?? alerts.reduce(
    (summary, alert) => {
      const severity = alert.severity?.toUpperCase();
      if (severity === 'HIGH' || severity === 'MAJOR' || severity === 'SEVERE') {
        summary.high += 1;
      } else if (severity === 'MODERATE' || severity === 'MEDIUM') {
        summary.moderate += 1;
      } else {
        summary.informational += 1;
      }
      return summary;
    },
    { high: 0, moderate: 0, informational: 0 },
  );

  return {
    ...raw,
    resolvedDrugs: raw.resolvedDrugs ?? [],
    interactions,
    contraindications,
    precautions,
    severitySummary,
    diagnosisMatches: raw.diagnosisMatches ?? [],
    ncdHints: raw.ncdHints ?? [],
    dosageSuggestions: raw.dosageSuggestions ?? [],
    requiredPatientInputs: raw.requiredPatientInputs ?? [],
    requiresPicPin: raw.requiresPicPin ?? false,
  };
};

export const PatientSafetyPanel: React.FC<{
  enabled: boolean;
  cartItems: DispensingCartItem[];
  sessionPayload: SafetySessionPayload;
  onStatusChange: (status: {
    review: SafetyReviewResponse | null;
    requiresOverride: boolean;
    overrideDraft?: OverrideDraft;
  }) => void;
}> = ({ enabled, cartItems, sessionPayload, onStatusChange }) => {
  const [overrideReason, setOverrideReason] = useState('');
  const [overridePin, setOverridePin] = useState('');
  const requestPayload = useMemo(
    () => ({
      ...sessionPayload,
      productIds: cartItems.map((item) => item.product.id),
    }),
    [cartItems, sessionPayload],
  );

  const reviewQuery = useQuery({
    queryKey: ['patient-safety-session-review', requestPayload],
    queryFn: () => api.post('/patient-safety/session-review', requestPayload).then((response) => response.data),
    enabled: enabled && cartItems.length > 0,
    staleTime: 10_000,
  });

  const review = normalizeReview((reviewQuery.data?.data ?? null) as SafetyReviewResponse | null);
  const counsellingQuery = useQuery({
    queryKey: ['patient-safety-counselling-suggestions', review, sessionPayload],
    queryFn: () =>
      api
        .post('/patient-safety/counselling-suggestions', {
          review,
          flags: sessionPayload,
        })
        .then((response) => response.data),
    enabled:
      Boolean(review) &&
      (Boolean(review?.interactions.length) ||
        Boolean(review?.contraindications.length) ||
        Boolean(review?.precautions.length) ||
        Boolean(review?.requiredPatientInputs.length)),
    staleTime: 10_000,
  });
  const counsellingSuggestions = (counsellingQuery.data?.data ?? []) as CounsellingSuggestion[];
  const riskSignature = useMemo(() => {
    if (!review) {
      return 'none';
    }

    return JSON.stringify({
      interactions: review.interactions.filter((item) => item.requiresPicPin).map((item) => item.id).sort(),
      contraindications: review.contraindications.filter((item) => item.requiresPicPin).map((item) => item.id).sort(),
    });
  }, [review]);

  useEffect(() => {
    setOverrideReason('');
    setOverridePin('');
  }, [riskSignature]);

  useEffect(() => {
    if (!enabled || cartItems.length === 0) {
      onStatusChange({ review: null, requiresOverride: false });
      return;
    }

    onStatusChange({
      review,
      requiresOverride: Boolean(review?.requiresPicPin),
      overrideDraft:
        review?.requiresPicPin && overrideReason.trim() && overridePin.trim()
          ? {
              reason: overrideReason.trim(),
              pic_pin: overridePin.trim(),
            }
          : undefined,
    });
  }, [cartItems.length, enabled, onStatusChange, overridePin, overrideReason, review]);

  if (!enabled) {
    return (
      <Card>
        <div className="rounded-2xl border border-dashed border-[#D6F0E8] bg-[#F8FAFC] px-4 py-6 text-sm text-[#64748B]">
          Patient safety tools are available on Standard, Premium, and Enterprise retail pharmacies only.
        </div>
      </Card>
    );
  }

  if (cartItems.length === 0) {
    return (
      <Card
        header={
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#1A6B5C]" />
            <span className="text-sm font-semibold text-[#0D4035]">Patient safety</span>
          </div>
        }
      >
        <p className="text-sm text-[#64748B]">
          Add medicines to start interaction checks, contraindication review, and precaution alerts.
        </p>
      </Card>
    );
  }

  return (
    <Card
      header={
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#1A6B5C]" />
            <span className="text-sm font-semibold text-[#0D4035]">Patient safety</span>
          </div>
          {review?.requiresPicPin ? (
            <Badge variant="warning" size="sm">
              PIC override required
            </Badge>
          ) : (
            <Badge variant="success" size="sm">
              Reviewed
            </Badge>
          )}
        </div>
      }
    >
      {reviewQuery.isLoading && (
        <div className="rounded-2xl bg-[#F8FAFC] px-4 py-5 text-sm text-[#64748B]">
          Running interaction, contraindication, and precaution checks...
        </div>
      )}

      {reviewQuery.isError && (
        <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-5 text-sm text-[#991B1B]">
          Patient safety review could not be loaded right now.
        </div>
      )}

      {review && (
        <div className="space-y-4">
          {review.requiresPicPin && (
            <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-4">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 text-[#D97706]" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#92400E]">
                    Dispensing is blocked until a PIC override reason and PIN are entered.
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Input
                      label="Override reason"
                      value={overrideReason}
                      onChange={(event) => setOverrideReason(event.target.value)}
                      placeholder="Clinical reason for proceeding"
                    />
                    <Input
                      label="PIC PIN"
                      type="password"
                      value={overridePin}
                      onChange={(event) => setOverridePin(event.target.value)}
                      placeholder="Enter PIC PIN"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-[#EDF7F3] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-[#64748B]">Reviewed drugs</p>
              <p className="mt-1 text-lg font-semibold text-[#0D4035]">{review.resolvedDrugs.length}</p>
            </div>
            <div className="rounded-2xl bg-[#FEF2F2] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-[#64748B]">High alerts</p>
              <p className="mt-1 text-lg font-semibold text-[#991B1B]">{review.severitySummary.high}</p>
            </div>
            <div className="rounded-2xl bg-[#FFFBEB] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-[#64748B]">Moderate alerts</p>
              <p className="mt-1 text-lg font-semibold text-[#92400E]">{review.severitySummary.moderate}</p>
            </div>
            <div className="rounded-2xl bg-[#EFF6FF] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-[#64748B]">Informational</p>
              <p className="mt-1 text-lg font-semibold text-[#1D4ED8]">{review.severitySummary.informational}</p>
            </div>
          </div>

          <InteractionAlert
            title="Interaction alerts"
            alerts={review.interactions}
            emptyMessage="No approved interaction alerts for the current basket."
          />

          <InteractionAlert
            title="Contraindication alerts"
            alerts={review.contraindications}
            emptyMessage="No approved contraindication alerts for the current patient flags."
          />

          <InteractionAlert
            title="Precaution alerts"
            alerts={review.precautions}
            emptyMessage="No approved precaution alerts for the current patient flags."
          />

          <NCDHints hints={review.ncdHints} />

          {counsellingSuggestions.length > 0 && (
            <div className="rounded-2xl border border-[#D6F0E8] bg-[#F8FAFC] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#0D4035]">AI counselling suggestions</p>
                {counsellingSuggestions.some((suggestion) => suggestion.cached) && (
                  <Badge variant="info" size="sm">Cached</Badge>
                )}
              </div>
              <div className="mt-3 space-y-2">
                {counsellingSuggestions.map((suggestion) => (
                  <p key={suggestion.id} className="text-sm text-[#475569]">
                    {suggestion.suggestionText}
                  </p>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </Card>
  );
};
