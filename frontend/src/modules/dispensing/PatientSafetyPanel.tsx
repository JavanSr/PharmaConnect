import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { InteractionAlert } from './InteractionAlert';
import { NCDHints } from './NCDHints';
import type { DispensingCartItem, SafetyReviewResponse, SafetySessionPayload } from './types';

type OverrideDraft = {
  reason: string;
  pic_pin: string;
};

const normalizeReview = (raw: SafetyReviewResponse | null): SafetyReviewResponse | null => {
  if (!raw) return null;

  const interactions = raw.interactions ?? [];
  const contraindications = raw.contraindications ?? [];
  const precautions = raw.precautions ?? [];
  const alerts = [...interactions, ...contraindications, ...precautions];
  const severitySummary = raw.severitySummary ?? alerts.reduce(
    (summary, alert) => {
      const severity = alert.severity?.toUpperCase();
      if (severity === 'HIGH' || severity === 'MAJOR' || severity === 'SEVERE' || severity === 'CONTRAINDICATED') {
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
    requiresPicPin: false, // Override model: dispenser proceeds at own risk. No PIN gate.
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
  const [acknowledged, setAcknowledged] = useState(false);

  const requestPayload = useMemo(
    () => ({
      ...sessionPayload,
      productIds: cartItems.map((item) => item.product.id),
    }),
    [cartItems, sessionPayload],
  );

  const reviewQuery = useQuery({
    queryKey: ['patient-safety-session-review', requestPayload],
    queryFn: () =>
      api.post('/patient-safety/session-review', requestPayload).then((r) => r.data),
    enabled: enabled && cartItems.length > 0,
    staleTime: 10_000,
  });

  const review = normalizeReview((reviewQuery.data?.data ?? null) as SafetyReviewResponse | null);

  const hasAnyAlerts = Boolean(
    review && (
      review.interactions.length > 0 ||
      review.contraindications.length > 0 ||
      review.precautions.length > 0
    ),
  );

  const hasHighSeverityAlerts = Boolean(
    review && [...review.interactions, ...review.contraindications, ...review.precautions].some(
      (a) => {
        const s = a.severity?.toUpperCase() ?? '';
        return s === 'CONTRAINDICATED' || s === 'MAJOR' || s === 'HIGH' || s === 'SEVERE';
      },
    ),
  );

  // Reset acknowledgment when basket composition changes
  const alertSignature = useMemo(
    () => JSON.stringify([
      ...( review?.interactions ?? []).map((i) => i.id),
      ...( review?.contraindications ?? []).map((i) => i.id),
    ].sort()),
    [review],
  );

  useEffect(() => {
    setAcknowledged(false);
  }, [alertSignature]);

  useEffect(() => {
    if (!enabled || cartItems.length === 0) {
      onStatusChange({ review: null, requiresOverride: false });
      return;
    }
    // Dispensing is only blocked when there are HIGH-severity alerts AND the dispenser has not acknowledged them.
    // Per spec: no PIN required. Dispenser proceeds at own risk; override is logged.
    onStatusChange({
      review,
      requiresOverride: hasHighSeverityAlerts && !acknowledged,
    });
  }, [cartItems.length, enabled, onStatusChange, review, hasHighSeverityAlerts, acknowledged]);

  if (!enabled || cartItems.length === 0 || reviewQuery.isLoading) return null;
  // Hide panel if no alerts at all (and no error)
  if (!reviewQuery.isError && !hasAnyAlerts && (!review?.ncdHints?.length)) return null;

  return (
    <Card
      header={
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-[#1A6B5C]" />
          <span className="text-sm font-semibold text-[#0D4035]">Clinical safety check</span>
          {review && (
            <span className="ml-auto text-xs text-[#64748B]">
              {hasHighSeverityAlerts
                ? '⚠ High-risk — acknowledge before dispensing'
                : review.severitySummary?.moderate
                  ? '⚠ Moderate risk detected'
                  : 'Review notes below'}
            </span>
          )}
        </div>
      }
    >
      {reviewQuery.isError && (
        <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-5 text-sm text-[#991B1B]">
          Safety review could not be loaded. Check the connection — do not skip high-risk dispensing without it.
        </div>
      )}

      {review && (
        <div className="space-y-3">
          <InteractionAlert alerts={review.interactions} />
          <InteractionAlert alerts={review.contraindications} />
          <InteractionAlert alerts={review.precautions} />
          <NCDHints hints={review.ncdHints} />

          {/* Acknowledge and proceed — replaces PIN gate. Override is logged per spec. */}
          {hasHighSeverityAlerts && !acknowledged && (
            <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#DC2626]" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#991B1B]">
                    High-risk alert — dispenser must acknowledge before proceeding
                  </p>
                  <p className="mt-1 text-xs text-[#7F1D1D]">
                    You are dispensing at your own clinical responsibility. This override will be logged against your account.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAcknowledged(true)}
                    className="mt-3 rounded-lg bg-[#DC2626] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#B91C1C] active:bg-[#991B1B]"
                  >
                    I acknowledge — proceed with dispensing
                  </button>
                </div>
              </div>
            </div>
          )}

          {hasHighSeverityAlerts && acknowledged && (
            <div className="flex items-center gap-2 rounded-xl border border-[#D6F0E8] bg-[#EDF7F3] px-3 py-2 text-xs text-[#1A6B5C]">
              <ShieldCheck size={13} />
              Override acknowledged and will be logged against this session.
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
