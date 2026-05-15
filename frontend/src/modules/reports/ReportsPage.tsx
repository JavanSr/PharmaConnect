import React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';

interface SafetyImpactReport {
  scope: 'pharmacy' | 'office';
  totalEvents: number;
  highRiskCount: number;
  byType: Array<{ key: string; count: number }>;
  bySeverity: Array<{ key: string; count: number }>;
  byAction: Array<{ key: string; count: number }>;
  topDrugs: Array<{ name: string; count: number }>;
  contextFlags: Record<'pregnancy' | 'breastfeeding' | 'renal' | 'hepatic' | 'allergy' | 'diagnosis', number>;
  officePharmacies: Array<{ pharmacyId: string; pharmacyName: string; count: number }>;
}

const formatLabel = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

export const ReportsPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const isOfficeAccount = user?.role === 'SUPER_ADMIN';
  const canViewSafetyReport = isOfficeAccount || user?.role === 'OWNER' || user?.role === 'PHARMACIST_IN_CHARGE';

  const revenueQuery = useQuery({
    queryKey: ['reports-revenue'],
    queryFn: () => api.get('/reports/financial/revenue').then((response) => response.data.data),
    enabled: !isOfficeAccount,
  });

  const benchmarkQuery = useQuery({
    queryKey: ['reports-benchmark'],
    queryFn: () => api.get('/reports/benchmarking/peer').then((response) => response.data.data),
    enabled: !isOfficeAccount,
  });

  const safetyQuery = useQuery<SafetyImpactReport>({
    queryKey: ['reports-safety-impact', isOfficeAccount ? 'office' : 'pharmacy'],
    queryFn: () =>
      api
        .get('/reports/safety-impact', { params: isOfficeAccount ? { scope: 'office' } : undefined })
        .then((response) => response.data.data),
    enabled: canViewSafetyReport,
  });

  const customMutation = useMutation({
    mutationFn: () => api.post('/reports/custom-builder', { dimension: 'paymentMethod', metric: 'totalRevenue' }).then((response) => response.data.data),
  });

  React.useEffect(() => {
    if (!isOfficeAccount && !customMutation.data && !customMutation.isPending) {
      customMutation.mutate();
    }
  }, [customMutation, isOfficeAccount]);

  const safety = safetyQuery.data;
  const allergyWarnings = safety?.contextFlags.allergy ?? 0;
  const overrideCount = safety?.byAction.find((item) => item.key === 'OVERRIDE_ENTERED')?.count ?? 0;

  return (
    <div className="space-y-6">
      {!isOfficeAccount && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <p className="text-sm text-[#64748B]">Revenue</p>
              <p className="mt-2 text-3xl font-semibold text-[#0D4035]">Tsh {(revenueQuery.data?.totalRevenue ?? 0).toFixed(2)}</p>
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
                <p>Own revenue: Tsh {Number(benchmarkQuery.data.ownRevenue ?? 0).toFixed(2)}</p>
                <p>Average cohort revenue: Tsh {Number(benchmarkQuery.data.averageRevenue ?? 0).toFixed(2)}</p>
                <p>Median cohort revenue: Tsh {Number(benchmarkQuery.data.medianRevenue ?? 0).toFixed(2)}</p>
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
                  <span className="text-[#0D4035]">Tsh {Number(row.value ?? 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {canViewSafetyReport && <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0D4035]">
            {isOfficeAccount ? 'APOTEKH Office Safety Impact' : 'Pharmacy Safety Impact'}
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">Anonymous long-term safety signals from dispensing reviews.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <p className="text-sm text-[#64748B]">Safety warnings</p>
            <p className="mt-2 text-3xl font-semibold text-[#0D4035]">{safety?.totalEvents ?? 0}</p>
          </Card>
          <Card>
            <p className="text-sm text-[#64748B]">High-risk warnings</p>
            <p className="mt-2 text-3xl font-semibold text-[#0D4035]">{safety?.highRiskCount ?? 0}</p>
          </Card>
          <Card>
            <p className="text-sm text-[#64748B]">PIC overrides</p>
            <p className="mt-2 text-3xl font-semibold text-[#0D4035]">{overrideCount}</p>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card header={<h2 className="text-lg font-semibold text-[#0D4035]">Warning Types</h2>}>
            <div className="space-y-2">
              {(safety?.byType ?? []).map((row) => (
                <div key={row.key} className="flex items-center justify-between rounded-xl bg-[#EDF7F3] px-4 py-3 text-sm">
                  <span className="font-medium text-[#0D4035]">{formatLabel(row.key)}</span>
                  <span className="text-[#0D4035]">{row.count}</span>
                </div>
              ))}
              {!safety?.byType.length && <p className="text-sm text-[#64748B]">No safety events recorded yet.</p>}
            </div>
          </Card>

          <Card header={<h2 className="text-lg font-semibold text-[#0D4035]">Clinical Context Protected</h2>}>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries({ ...safety?.contextFlags, allergy: allergyWarnings }).map(([key, value]) => (
                <div key={key} className="rounded-xl bg-[#EDF7F3] px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-[#64748B]">{formatLabel(key)}</p>
                  <p className="mt-1 text-xl font-semibold text-[#0D4035]">{Number(value ?? 0)}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card header={<h2 className="text-lg font-semibold text-[#0D4035]">Top Medicines In Safety Reviews</h2>}>
            <div className="space-y-2">
              {(safety?.topDrugs ?? []).map((row) => (
                <div key={row.name} className="flex items-center justify-between rounded-xl bg-[#EDF7F3] px-4 py-3 text-sm">
                  <span className="font-medium text-[#0D4035]">{row.name}</span>
                  <span className="text-[#0D4035]">{row.count}</span>
                </div>
              ))}
              {!safety?.topDrugs.length && <p className="text-sm text-[#64748B]">No medicine safety trend yet.</p>}
            </div>
          </Card>

          {isOfficeAccount && (
            <Card header={<h2 className="text-lg font-semibold text-[#0D4035]">Pharmacy Signal Volume</h2>}>
              <div className="space-y-2">
                {(safety?.officePharmacies ?? []).map((row) => (
                  <div key={row.pharmacyId} className="flex items-center justify-between rounded-xl bg-[#EDF7F3] px-4 py-3 text-sm">
                    <span className="font-medium text-[#0D4035]">{row.pharmacyName}</span>
                    <span className="text-[#0D4035]">{row.count}</span>
                  </div>
                ))}
                {!safety?.officePharmacies.length && <p className="text-sm text-[#64748B]">No pharmacy-level safety trend yet.</p>}
              </div>
            </Card>
          )}
        </div>
      </section>}
    </div>
  );
};
