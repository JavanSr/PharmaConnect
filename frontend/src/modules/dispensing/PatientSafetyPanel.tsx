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
          Add medicines to start interaction checks, contraindication review, precaution alerts, dosage suggestions,
          and NCD hints.
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

        </div>
      )}
    </Card>
  );
};
