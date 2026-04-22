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
  rule: string;
  severity: string;
  drug: string;
  flags: string[];
  suggestionText: string;
  source: string;
  cached: boolean;
};

function buildCounsellingFlags(sessionPayload: SafetySessionPayload) {
  const flags: string[] = [];
  if (sessionPayload.pregnant) flags.push('pregnant');
  if (sessionPayload.breastfeeding) flags.push('breastfeeding');
  if (sessionPayload.renalImpairment) flags.push('renal impairment');
  if (sessionPayload.hepaticImpairment) flags.push('hepatic impairment');
  if ((sessionPayload.allergies ?? []).length > 0) flags.push(`allergies: ${(sessionPayload.allergies ?? []).join(', ')}`);
  if ((sessionPayload.diagnoses ?? []).length > 0) flags.push(`diagnoses: ${(sessionPayload.diagnoses ?? []).join(', ')}`);
  return flags;
}

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

  const review = (reviewQuery.data?.data ?? null) as SafetyReviewResponse | null;
  const counsellingTriggers = useMemo(() => {
    if (!review) {
      return [];
    }

    const flags = buildCounsellingFlags(sessionPayload);
    return [
      ...review.interactions.map((alert) => ({
        rule: alert.effectSummary || alert.management || 'Interaction rule triggered.',
        severity: alert.severity,
        drug: [alert.drugA, alert.drugB].filter(Boolean).join(' + '),
        flags,
      })),
      ...review.contraindications.map((alert) => ({
        rule: alert.message || `${alert.conditionType || 'Contraindication'} rule triggered.`,
        severity: alert.severity,
        drug: alert.drug || 'Unknown drug',
        flags,
      })),
    ].filter((trigger) => trigger.drug.trim() && trigger.rule.trim());
  }, [review, sessionPayload]);
  const counsellingQuery = useQuery({
    queryKey: ['patient-safety-counselling', counsellingTriggers],
    queryFn: () =>
      api
        .post('/patient-safety/counselling-suggestions', { triggers: counsellingTriggers })
        .then((response) => response.data),
    enabled: enabled && counsellingTriggers.length > 0,
    staleTime: 60_000,
  });
  const riskSignature = useMemo(() => {
    if (!review) {
      return 'none';
    }

    return JSON.stringify({
      interactions: review.interactions.filter((item) => item.requiresPicPin).map((item) => item.id).sort(),
      contraindications: review.contraindications.filter((item) => item.requiresPicPin).map((item) => item.id).sort(),
    });
  }, [review]);
  const counsellingSuggestions = (counsellingQuery.data?.data ?? []) as CounsellingSuggestion[];
  const fallbackCounsellingSuggestions = useMemo<CounsellingSuggestion[]>(
    () =>
      counsellingTriggers.map((trigger, index) => ({
        id: `fallback-${index}`,
        rule: trigger.rule,
        severity: trigger.severity,
        drug: trigger.drug,
        flags: trigger.flags,
        suggestionText: `Severity remains ${trigger.severity}. Use the triggered rule as the counselling source of truth: ${trigger.rule}`,
        source: 'RULE_ONLY',
        cached: false,
      })),
    [counsellingTriggers],
  );
  const displayedCounsellingSuggestions =
    counsellingQuery.isError || counsellingSuggestions.length === 0
      ? fallbackCounsellingSuggestions
      : counsellingSuggestions;

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
          Add medicines to start interaction checks, contraindication review, dosage suggestions, and NCD hints.
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
            <Badge variant="warning" size="sm">PIC override required</Badge>
          ) : (
            <Badge variant="success" size="sm">Reviewed</Badge>
          )}
        </div>
      }
    >
      {reviewQuery.isLoading && (
        <div className="rounded-2xl bg-[#F8FAFC] px-4 py-5 text-sm text-[#64748B]">
          Running interaction and contraindication checks...
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

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-[#EDF7F3] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-[#64748B]">Reviewed drugs</p>
              <p className="mt-1 text-lg font-semibold text-[#0D4035]">{review.resolvedDrugs.length}</p>
            </div>
            <div className="rounded-2xl bg-[#FEF2F2] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-[#64748B]">Interactions</p>
              <p className="mt-1 text-lg font-semibold text-[#991B1B]">{review.interactions.length}</p>
            </div>
            <div className="rounded-2xl bg-[#FFFBEB] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-[#64748B]">Contraindications</p>
              <p className="mt-1 text-lg font-semibold text-[#92400E]">{review.contraindications.length}</p>
            </div>
          </div>

          <InteractionAlert
            title="Interaction alerts"
            alerts={review.interactions}
            emptyMessage="No interaction alerts for the current basket."
          />

          <InteractionAlert
            title="Contraindication alerts"
            alerts={review.contraindications}
            emptyMessage="No contraindication alerts for the current patient flags."
          />

          {review.dosageSuggestions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#0D4035]">Dosage suggestions</h3>
              {review.dosageSuggestions.map((suggestion) => (
                <div key={suggestion.drugId} className="rounded-2xl border border-[#D6F0E8] bg-[#F8FAFC] px-4 py-3">
                  <p className="text-sm font-semibold text-[#0D4035]">{suggestion.genericName}</p>
                  <p className="mt-1 text-xs text-[#475569]">
                    Adult: {suggestion.adultDose || 'Not set'} | Paediatric: {suggestion.paediatric || 'Not set'} | Elderly: {suggestion.elderly || 'Not set'}
                  </p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    Route: {suggestion.route || 'Not set'} | Frequency: {suggestion.frequency || 'Not set'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {review.diagnosisMatches.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#0D4035]">Diagnosis guidance</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {review.diagnosisMatches.map((match) => (
                  <div key={match.id} className="rounded-2xl border border-[#D6F0E8] bg-white px-4 py-3">
                    <p className="text-sm font-semibold text-[#0D4035]">{match.genericName}</p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      {match.therapeuticCategory || 'General use'}
                    </p>
                    <p className="mt-2 text-xs text-[#475569]">
                      Standard adult dose: {match.standardAdultDose || 'Not set'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <NCDHints hints={review.ncdHints} />

          {displayedCounsellingSuggestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[#0D4035]">AI counselling suggestions</h3>
                {counsellingQuery.isError && (
                  <Badge variant="warning" size="sm">Rule-only fallback</Badge>
                )}
              </div>
              {displayedCounsellingSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="rounded-2xl border border-[#D6F0E8] bg-[#F8FAFC] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#0D4035]">{suggestion.drug}</p>
                      <p className="mt-1 text-xs text-[#64748B]">{suggestion.rule}</p>
                    </div>
                    <Badge variant={suggestion.severity === 'MAJOR' || suggestion.severity === 'CONTRAINDICATED' ? 'warning' : 'info'} size="sm">
                      {suggestion.severity}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-[#475569]">{suggestion.suggestionText}</p>
                  {suggestion.flags.length > 0 && (
                    <p className="mt-2 text-xs text-[#64748B]">Flags: {suggestion.flags.join(' • ')}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
