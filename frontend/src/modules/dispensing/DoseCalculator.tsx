import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';
import type { DoseMethodResult } from './types';

export const DoseCalculator: React.FC = () => {
  const toast = useNotificationStore((state) => state.toast);
  const [adultDoseMg, setAdultDoseMg] = useState('');
  const [ageYears, setAgeYears] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [recommendedMgPerKg, setRecommendedMgPerKg] = useState('');
  const [results, setResults] = useState<DoseMethodResult[]>([]);

  const calculateMutation = useMutation({
    mutationFn: () =>
      api
        .post('/patient-safety/calculate-dose', {
          adultDoseMg: Number(adultDoseMg),
          ageYears: ageYears ? Number(ageYears) : undefined,
          weightKg: weightKg ? Number(weightKg) : undefined,
          recommendedMgPerKg: recommendedMgPerKg ? Number(recommendedMgPerKg) : undefined,
        })
        .then((response) => response.data),
    onSuccess: (response) => {
      setResults(response.data);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Dose calculation failed');
    },
  });

  return (
    <Card
      header={
        <div className="flex items-center gap-2">
          <Calculator size={16} className="text-[#1A6B5C]" />
          <span className="text-sm font-semibold text-[#0D4035]">Dose calculator</span>
        </div>
      }
    >
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
          type="number"
          min="0"
          value={recommendedMgPerKg}
          onChange={(event) => setRecommendedMgPerKg(event.target.value)}
          placeholder="10"
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
                  {result.valueMg != null ? `${result.valueMg} mg` : 'Not supported'}
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
