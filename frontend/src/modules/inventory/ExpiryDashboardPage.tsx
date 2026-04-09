import React, { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { differenceInDays, format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import type { Batch } from '@/types';

const FILTERS = [1, 7, 30, 60, 90] as const;
type ExpiryThreshold = (typeof FILTERS)[number];
const FILTER_LABELS: Record<ExpiryThreshold, string> = {
  1: '1 day',
  7: '7 days',
  30: '30 days',
  60: '60 days',
  90: '90 days',
};

function getExpiryBadge(days: number): {
  variant: 'success' | 'warning' | 'danger';
  label: string;
  className?: string;
} {
  if (days <= 1) {
    return { variant: 'danger', label: 'CRITICAL', className: 'animate-pulse' };
  }

  if (days <= 7) {
    return { variant: 'danger', label: 'RED' };
  }

  if (days <= 30) {
    return { variant: 'warning', label: 'AMBER' };
  }

  return { variant: 'success', label: 'OK' };
}

type ExpiryDashboardRowProps = {
  batch: Batch;
};

const ExpiryDashboardRow = React.memo(function ExpiryDashboardRow({
  batch,
}: ExpiryDashboardRowProps) {
  const days = differenceInDays(new Date(batch.expiryDate), new Date());
  const badge = getExpiryBadge(days);

  return (
    <tr className="hover:bg-[#EDF7F3]">
      <td className="px-5 py-3">
        <p className="text-sm font-medium text-[#0D4035]">{batch.product?.genericName || batch.product?.name}</p>
        <p className="text-xs text-[#64748B]">{batch.product?.dosageForm} {batch.product?.strength}</p>
      </td>
      <td className="px-5 py-3 text-sm text-[#64748B] font-mono">{batch.batchNumber}</td>
      <td className="px-5 py-3 text-sm text-[#0D4035]">{format(new Date(batch.expiryDate), 'dd MMM yyyy')}</td>
      <td className="px-5 py-3 text-sm font-bold text-[#0D4035]">{days <= 0 ? 'Expired' : `${days}d`}</td>
      <td className="px-5 py-3 text-sm text-[#0D4035]">{batch.quantityRemaining}</td>
      <td className="px-5 py-3">
        <Badge variant={badge.variant} size="sm" className={badge.className}>
          {badge.label}
        </Badge>
      </td>
    </tr>
  );
});

export const ExpiryDashboardPage: React.FC = () => {
  const [threshold, setThreshold] = useState<ExpiryThreshold>(30);

  const { data, isLoading } = useQuery({
    queryKey: ['expiry', threshold],
    queryFn: () => api.get(`/inventory/reports/expiry?days=${threshold}`).then(r => r.data),
  });

  const batches: Batch[] = useMemo(() => data?.data || [], [data?.data]);
  const sorted = useMemo(
    () => [...batches].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()),
    [batches]
  );

  const handleThresholdChange = useCallback((nextThreshold: ExpiryThreshold) => {
    setThreshold(nextThreshold);
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#0D4035]">Expiry Dashboard</h1>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => handleThresholdChange(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
              threshold === f ? 'bg-[#1A6B5C] text-white border-[#1A6B5C]' : 'bg-white text-[#64748B] border-[#D6F0E8] hover:bg-[#EDF7F3]'
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
        <span className="ml-auto text-sm text-[#64748B] self-center">{sorted.length} batches</span>
      </div>

      <Card padding={false}>
        {isLoading ? (
          <div className="p-8 text-center text-[#64748B]">Loading...</div>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center text-[#64748B]">No batches found for this filter</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#D6F0E8]">
                  {['Product', 'Batch', 'Expiry Date', 'Days Left', 'Qty', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6F0E8]">
                {sorted.map(batch => (
                  <ExpiryDashboardRow key={batch.id} batch={batch} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
