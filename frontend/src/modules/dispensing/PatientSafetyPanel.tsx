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

type CounsellingTrigger = {
  rule: string;
  severity: string;
  drug: string;
  flags: string[];
};

const patientFlagLabels: Array<[keyof SafetySessionPayload, string]> = [
  ['pregnant', 'pregnant'],
  ['breastfeeding', 'breastfeeding'],
  ['renalImpairment', 'renal impairment'],
  ['hepaticImpairment', 'hepatic impairment'],
];

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
  const counsellingTriggers = useMemo<CounsellingTrigger[]>(() => {
    if (!review) {
      return [];
    }

    const flags = [
      ...patientFlagLabels
        .filter(([key]) => Boolean(sessionPayload[key]))
        .map(([, label]) => label),
      ...(sessionPayload.allergies ?? []).map((allergy) => `allergy: ${allergy}`),
      ...(sessionPayload.diagnoses ?? []).map((diagnosis) => `diagnosis: ${diagnosis}`),
    ];

    return [
      ...review.interactions.map((alert) => ({
        rule: alert.effectSummary || alert.management || 'Interaction alert',
        severity: alert.severity,
        drug: [alert.drugA, alert.drugB].filter(Boolean).join(' + ') || 'Selected medicines',
        flags,
      })),
      ...review.contraindications.map((alert) => ({
        rule: alert.message || alert.conditionValue || 'Contraindication alert',
        severity: alert.severity,
        drug: alert.drug || 'Selected medicine',
        flags,
      })),
      ...review.precautions.map((alert) => ({
        rule: alert.message || alert.ruleType || 'Precaution alert',
        severity: alert.severity,
        drug: alert.drug || 'Selected medicine',
        flags,
      })),
    ].filter((trigger) => trigger.rule.trim() && trigger.drug.trim());
  }, [review, sessionPayload]);

  const counsellingQuery = useQuery({
    queryKey: ['patient-safety-counselling-suggestions', counsellingTriggers],
    queryFn: () =>
      api
        .post('/patient-safety/counselling-suggestions', { triggers: counsellingTriggers })
        .then((response) => response.data),
    enabled: counsellingTriggers.length > 0,
    staleTime: 10_000,
  });
  const counsellingSuggestions = (counsellingQuery.data?.data ?? []) as CounsellingSuggestion[];
  const hasSafetyAlerts = Boolean(
    review &&
      (review.interactions.length > 0 ||
        review.contraindications.length > 0 ||
        review.precautions.length > 0 ||
        review.requiresPicPin),
  );
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
    return null;
  }

  if (cartItems.length === 0) {
    return null;
  }

  if (reviewQuery.isLoading) {
    return null;
  }

  if (!reviewQuery.isError && review && !hasSafetyAlerts) {
    return null;
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
          ) : null}
        </div>
      }
    >
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

          <InteractionAlert
            title="Interaction alerts"
            alerts={review.interactions}
          />

          <InteractionAlert
            title="Contraindication alerts"
            alerts={review.contraindications}
          />

          <InteractionAlert
            title="Precaution alerts"
            alerts={review.precautions}
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
