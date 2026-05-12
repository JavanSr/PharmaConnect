import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';

export const DailyClose: React.FC = () => {
  const toast = useNotificationStore((state) => state.toast);
  const [actualCashCounted, setActualCashCounted] = useState('');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<{
    expectedCash: number;
    actualCashCounted: number;
    discrepancy: number;
  } | null>(null);

  const closeMutation = useMutation({
    mutationFn: () =>
      api
        .post('/dispensing/daily-close', {
          actualCashCounted: Number(actualCashCounted),
          notes: notes.trim() || undefined,
        })
        .then((response) => response.data),
    onSuccess: (response) => {
      setResult(response.data);
      toast.success('Daily close recorded');
    },
    onError: (error: any) => {
      const code = error.response?.data?.error;
      toast.error(code === 'VARIANCE_NOTE_REQUIRED' ? 'Add a note when the cash variance is above TZS 5,000.' : (code || 'Daily close failed'));
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#0D4035]">Daily close</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Reconcile cash collections for today and capture any discrepancy before sign-off.
        </p>
      </div>

      <Card
        header={
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-[#1A6B5C]" />
            <span className="text-sm font-semibold text-[#0D4035]">Cash reconciliation</span>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Actual cash counted"
            type="number"
            min="0"
            value={actualCashCounted}
            onChange={(event) => setActualCashCounted(event.target.value)}
            placeholder="0"
          />
          <Input
            label="Notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Required above TZS 5,000 variance"
            hint="Notes become mandatory if the reconciliation variance is above TZS 5,000."
          />
        </div>

        <div className="mt-4">
          <Button
            onClick={() => closeMutation.mutate()}
            loading={closeMutation.isPending}
            disabled={!actualCashCounted}
          >
            Record daily close
          </Button>
        </div>

        {result && (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-[#EDF7F3] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-[#64748B]">Expected cash</p>
              <p className="mt-1 text-lg font-semibold text-[#0D4035]">
                TZS {result.expectedCash.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 border border-[#D6F0E8]">
              <p className="text-xs uppercase tracking-wide text-[#64748B]">Counted cash</p>
              <p className="mt-1 text-lg font-semibold text-[#0D4035]">
                TZS {result.actualCashCounted.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl bg-[#FFFBEB] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-[#64748B]">Discrepancy</p>
              <p className="mt-1 text-lg font-semibold text-[#92400E]">
                TZS {result.discrepancy.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
