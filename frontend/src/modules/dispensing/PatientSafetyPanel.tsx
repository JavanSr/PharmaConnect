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

const HIGH_SEVERITY = new Set(['CONTRAINDICATED', 'MAJOR']);

const normalizeReview = (raw: SafetyReviewResponse | null): SafetyReviewResponse | null => {
  if (!raw) return null;

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
    queryFn: () =>
      api.post('/patient-safety/session-review', requestPayload).then((r) => r.data),
    enabled: enabled && cartItems.length > 0,
    staleTime: 10_000,
  });

  const review = normalizeReview((reviewQuery.data?.data ?? null) as SafetyReviewResponse | null);

  const hasHighSeverityAlerts = Boolean(
    review &&
      (
        [...review.interactions, ...review.contraindications, ...review.precautions].some(
          (a) => HIGH_SEVERITY.has(a.severity?.toUpperCase() ?? ''),
        ) || review.requiresPicPin
      ),
  );

  const riskSignature = useMemo(() => {
    if (!review) return 'none';
    return JSON.stringify({
      interactions: review.interactions.filter((i) => i.requiresPicPin).map((i) => i.id).sort(),
      contraindications: review.contraindications.filter((i) => i.requiresPicPin).map((i) => i.id).sort(),
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
          ? { reason: overrideReason.trim(), pic_pin: overridePin.trim() }
          : undefined,
    });
  }, [cartItems.length, enabled, onStatusChange, overridePin, overrideReason, review]);

  if (!enabled || cartItems.length === 0 || reviewQuery.isLoading) return null;
  if (!reviewQuery.isError && review && !hasHighSeverityAlerts) return null;

  return (
    <Card
      header={
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#1A6B5C]" />
            <span className="text-sm font-semibold text-[#0D4035]">Patient safety</span>
          </div>
          {review?.requiresPicPin && (
            <Badge variant="warning" size="sm">PIC override required</Badge>
          )}
        </div>
      }
    >
      {reviewQuery.isError && (
        <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-5 text-sm text-[#991B1B]">
          Patient safety review could not be loaded right now. Check the connection and try again before high-risk dispensing.
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
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Clinical reason for proceeding"
                    />
                    <Input
                      label="PIC PIN"
                      type="password"
                      value={overridePin}
                      onChange={(e) => setOverridePin(e.target.value)}
                      placeholder="Enter PIC PIN"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <InteractionAlert title="Interaction alerts" alerts={review.interactions} />
          <InteractionAlert title="Contraindication alerts" alerts={review.contraindications} />
          <InteractionAlert title="Precaution alerts" alerts={review.precautions} />
          <NCDHints hints={review.ncdHints} />
        </div>
      )}
    </Card>
  );
};
