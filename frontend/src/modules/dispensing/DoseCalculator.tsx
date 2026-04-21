import React, { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';
import type { DoseMethodResult } from './types';

export const DoseCalculator: React.FC<{
  patientAgeYears?: string;
  patientWeightKg?: string;
  pediatricWeightRequired?: boolean;
  onRequestWeight?: () => void;
}> = ({ patientAgeYears, patientWeightKg, pediatricWeightRequired = false, onRequestWeight }) => {
  const toast = useNotificationStore((state) => state.toast);
  const [enabled, setEnabled] = useState(false);
  const [adultDoseMg, setAdultDoseMg] = useState('');
  const [ageYears, setAgeYears] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [recommendedMgPerKg, setRecommendedMgPerKg] = useState('');
  const [results, setResults] = useState<DoseMethodResult[]>([]);

  useEffect(() => {
    setAgeYears(patientAgeYears ?? '');
  }, [patientAgeYears]);

  useEffect(() => {
    setWeightKg(patientWeightKg ?? '');
  }, [patientWeightKg]);

  const calculateMutation = useMutation({
    mutationFn: () =>
      api
        .post('/patient-safety/calculate-dose', {
          adultDoseMg: Number(adultDoseMg),
          ageYears: ageYears ? Number(ageYears) : undefined,
          weightKg: weightKg ? Number(weightKg) : undefined,
          recommendedMgPerKg: recommendedMgPerKg.trim() || undefined,
        })
        .then((response) => response.data),
    onSuccess: (response) => {
      setResults(response.data);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Dose calculation failed');
    },
  });

  if (!enabled) {
    return (
      <Card
        header={
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calculator size={16} className="text-[#1A6B5C]" />
              <span className="text-sm font-semibold text-[#0D4035]">Dose calculator</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setEnabled(true)}>
              Enable dose calculator
            </Button>
          </div>
        }
      >
        {pediatricWeightRequired ? (
          <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-4">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 text-[#D97706]" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#92400E]">
                  Pediatric patient detected without recorded weight.
                </p>
                <p className="mt-1 text-xs text-[#92400E]">
                  Add weight before using dose support for safer pediatric calculations.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={onRequestWeight}>
                    Add weight
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setEnabled(true)}>
                    Open calculator
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#64748B]">
            Dose calculator is off by default. Turn it on when you need Clark&apos;s, Young&apos;s, or weight-based working.
          </p>
        )}
      </Card>
    );
  }

  return (
    <Card
      header={
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-[#1A6B5C]" />
            <span className="text-sm font-semibold text-[#0D4035]">Dose calculator</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEnabled(false)}>
            Hide
          </Button>
        </div>
      }
    >
      {pediatricWeightRequired && (
        <div className="mb-4 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs text-[#92400E]">
          Weight is required for pediatric dose support.
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label="Adult dose (mg)"
          type="number"
          min="0"
          value={adultDoseMg}
          onChange={(event) => setAdultDoseMg(event.target.value)}
          placeholder="500"
        />
        <Input
          label="Age (years)"
          type="number"
          min="0"
          value={ageYears}
          onChange={(event) => setAgeYears(event.target.value)}
          placeholder="8"
        />
        <Input
          label="Weight (kg)"
          type="number"
          min="0"
          value={weightKg}
          onChange={(event) => setWeightKg(event.target.value)}
          placeholder="28"
        />
        <Input
          label="Recommended mg/kg"
          value={recommendedMgPerKg}
          onChange={(event) => setRecommendedMgPerKg(event.target.value)}
          placeholder="e.g. 15 mg/kg/dose or 25-50 mg/kg/day"
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button
          onClick={() => calculateMutation.mutate()}
          loading={calculateMutation.isPending}
          disabled={!adultDoseMg}
        >
          Calculate
        </Button>
        <p className="text-xs text-[#64748B]">
          Shows full working for Clark&apos;s, Young&apos;s, and weight-based methods.
        </p>
      </div>

      {results.length > 0 && (
        <div className="mt-4 space-y-3">
          {results.map((result) => (
            <div key={result.method} className="rounded-2xl border border-[#D6F0E8] bg-[#F8FAFC] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#0D4035]">{result.method}</p>
                <p className="text-sm font-bold text-[#1A6B5C]">
                  {result.displayValue ?? (result.valueMg != null ? `${result.valueMg} mg` : 'Not supported')}
                </p>
              </div>
              <p className="mt-2 text-xs text-[#475569]">{result.working}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
