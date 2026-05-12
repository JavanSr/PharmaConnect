import React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';

export const ReportsPage: React.FC = () => {
  const revenueQuery = useQuery({
    queryKey: ['reports-revenue'],
    queryFn: () => api.get('/reports/financial/revenue').then((response) => response.data.data),
  });

  const benchmarkQuery = useQuery({
    queryKey: ['reports-benchmark'],
    queryFn: () => api.get('/reports/benchmarking/peer').then((response) => response.data.data),
  });

  const customMutation = useMutation({
    mutationFn: () => api.post('/reports/custom-builder', { dimension: 'paymentMethod', metric: 'totalRevenue' }).then((response) => response.data.data),
  });

  React.useEffect(() => {
    if (!customMutation.data && !customMutation.isPending) {
      customMutation.mutate();
    }
  }, [customMutation]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <p className="text-sm text-[#64748B]">Revenue</p>
          <p className="mt-2 text-3xl font-semibold text-[#0D4035]">TZS {(revenueQuery.data?.totalRevenue ?? 0).toFixed(2)}</p>
        </Card>
        <Card>
          <p className="text-sm text-[#64748B]">Transactions</p>
          <p className="mt-2 text-3xl font-semibold text-[#0D4035]">{revenueQuery.data?.transactionCount ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-[#64748B]">Cohort size</p>
          <p className="mt-2 text-3xl font-semibold text-[#0D4035]">{benchmarkQuery.data?.cohortSize ?? 0}</p>
        </Card>
      </div>

      <Card header={<h2 className="text-lg font-semibold text-[#0D4035]">Peer Benchmark</h2>}>
        {benchmarkQuery.data?.available ? (
          <div className="space-y-2 text-sm text-[#4B5563]">
            <p>Own revenue: TZS {Number(benchmarkQuery.data.ownRevenue ?? 0).toFixed(2)}</p>
            <p>Average cohort revenue: TZS {Number(benchmarkQuery.data.averageRevenue ?? 0).toFixed(2)}</p>
            <p>Median cohort revenue: TZS {Number(benchmarkQuery.data.medianRevenue ?? 0).toFixed(2)}</p>
          </div>
        ) : (
          <p className="text-sm text-[#64748B]">{benchmarkQuery.data?.message ?? 'Benchmark data is not available yet.'}</p>
        )}
      </Card>

      <Card header={<h2 className="text-lg font-semibold text-[#0D4035]">Custom Builder Snapshot</h2>}>
        <div className="space-y-2">
          {(customMutation.data ?? []).map((row: { dimension: string; value: number }) => (
            <div key={row.dimension} className="flex items-center justify-between rounded-xl bg-[#EDF7F3] px-4 py-3 text-sm">
              <span className="font-medium text-[#0D4035]">{row.dimension || 'Unknown'}</span>
              <span className="text-[#0D4035]">TZS {Number(row.value ?? 0).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
