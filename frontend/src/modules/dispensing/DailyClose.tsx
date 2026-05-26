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
      toast.error(code === 'VARIANCE_NOTE_REQUIRED' ? 'Add a note when the cash variance is above Tsh 5,000.' : (code || 'Daily close failed'));
    },
  });

  return (
    <div className="space-y-stack-lg">
      <div>
        <h1 className="text-headline-md text-on-surface">Daily close</h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Reconcile cash collections for today and capture any discrepancy before sign-off.
        </p>
      </div>

      <Card
        header={
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-[#1A6B5C]" />
            <span className="text-title-md text-on-surface">Cash reconciliation</span>
          </div>
        }
      >
        <div className="grid gap-gutter md:grid-cols-2">
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
            placeholder="Required above Tsh 5,000 variance"
            hint="Notes become mandatory if the reconciliation variance is above Tsh 5,000."
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
          <div className="mt-stack-md flex flex-wrap gap-3">
            <div className="rounded-full bg-surface-container px-4 py-2">
              <p className="text-label-md uppercase tracking-wide text-on-surface-variant">Expected cash</p>
              <p className="mt-1 text-title-lg text-on-surface">
                Tsh {result.expectedCash.toLocaleString()}
              </p>
            </div>
            <div className="rounded-full border border-outline-variant/30 bg-surface-container-lowest px-4 py-2">
              <p className="text-label-md uppercase tracking-wide text-on-surface-variant">Counted cash</p>
              <p className="mt-1 text-title-lg text-on-surface">
                Tsh {result.actualCashCounted.toLocaleString()}
              </p>
            </div>
            <div className="rounded-full bg-error-container px-4 py-2">
              <p className="text-label-md uppercase tracking-wide text-on-surface-variant">Discrepancy</p>
              <p className="mt-1 text-title-lg font-medium text-error">
                Tsh {result.discrepancy.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
