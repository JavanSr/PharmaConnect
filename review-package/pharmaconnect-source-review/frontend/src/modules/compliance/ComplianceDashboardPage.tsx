import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Shield, Plus, ArrowRight, ClipboardList } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { differenceInDays } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import type { ComplianceItem } from '@/types';
import { getCachedComplianceDashboard, setCachedComplianceDashboard, type CachedComplianceDashboard } from '@/lib/complianceCache';
import { usePharmacyStore } from '@/stores/pharmacyStore';

const statusColor: Record<string, 'success' | 'warning' | 'danger' | 'muted'> = {
  GREEN: 'success', AMBER: 'warning', RED: 'danger', EXPIRED: 'muted',
};

export const ComplianceDashboardPage: React.FC = () => {
  const pharmacyId = usePharmacyStore((state) => state.pharmacy?.id);
  const [cachedDashboard, setCachedDashboard] = useState<CachedComplianceDashboard | null>(null);

  useEffect(() => {
    if (!pharmacyId) {
      setCachedDashboard(null);
      return;
    }

    void getCachedComplianceDashboard(pharmacyId).then(setCachedDashboard).catch(() => setCachedDashboard(null));
  }, [pharmacyId]);

  const { data: healthData } = useQuery({ queryKey: ['compliance-health'], queryFn: () => api.get('/compliance/health-score').then(r => r.data) });
  const { data: itemsData } = useQuery({ queryKey: ['compliance-items'], queryFn: () => api.get('/compliance/items').then(r => r.data) });

  const liveHealth = healthData?.data;
  const liveItems: ComplianceItem[] | undefined = itemsData?.data;

  useEffect(() => {
    if (!pharmacyId || !liveHealth || !liveItems) {
      return;
    }

    void setCachedComplianceDashboard({
      pharmacyId,
      savedAt: new Date().toISOString(),
      health: liveHealth,
      items: liveItems,
    });
  }, [liveHealth, liveItems, pharmacyId]);

  const score = liveHealth?.score ?? cachedDashboard?.health.score ?? 0;
  const breakdown = liveHealth?.breakdown ?? cachedDashboard?.health.breakdown ?? {};
  const items: ComplianceItem[] = liveItems ?? (cachedDashboard?.items as ComplianceItem[] | undefined) ?? [];
  const getExpiryTime = (value?: string | null) => (value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER);
  const urgentItems = items
    .filter((item) => item.status === 'RED' || item.status === 'AMBER')
    .sort((a, b) => getExpiryTime(a.expiryDate) - getExpiryTime(b.expiryDate));
  const chartData = [{ value: score, fill: score >= 80 ? '#1A6B5C' : score >= 60 ? '#D97706' : '#DC2626' }];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-[#0D4035]">Compliance Tracker</h1>
        <div className="flex gap-2">
          <Link to="/compliance/staff">
            <Button variant="secondary">Staff Credentials</Button>
          </Link>
          <Link to="/compliance/inspection">
            <Button variant="secondary" leftIcon={<ClipboardList size={16} />}>Inspection Checklist</Button>
          </Link>
          <Link to="/compliance/items/new">
            <Button leftIcon={<Plus size={16} />}>Add Item</Button>
          </Link>
        </div>
      </div>

      {!liveHealth && cachedDashboard && (
        <div className="rounded-2xl border border-[#D6F0E8] bg-white px-4 py-3 text-xs text-[#64748B]">
          Offline snapshot loaded from this device. Last synced {new Date(cachedDashboard.savedAt).toLocaleString()}.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Health Score */}
        <Card>
          <div className="flex flex-col items-center py-4">
            <div className="relative w-36 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="55%" outerRadius="100%" data={chartData} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar dataKey="value" angleAxisId={0} cornerRadius={8} background={{ fill: '#D6F0E8' }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-3xl font-bold text-[#0D4035]">{score}%</p>
                <p className="text-xs text-[#64748B]">Health Score</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {[
              { label: 'GREEN', count: breakdown.GREEN ?? 0 },
              { label: 'AMBER', count: breakdown.AMBER ?? 0 },
              { label: 'RED', count: breakdown.RED ?? 0 },
              { label: 'EXPIRED', count: breakdown.EXPIRED ?? 0 },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between bg-[#EDF7F3] rounded-xl p-2.5">
                <span className="text-xs text-[#64748B]">{s.label}</span>
                <Badge variant={statusColor[s.label]} size="sm">{s.count}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Urgent items */}
        <Card className="lg:col-span-2" header={
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#0D4035]">Urgent Attention Required</span>
            <Link to="/compliance/items" className="text-xs text-[#1A6B5C] hover:underline flex items-center gap-1">All items <ArrowRight size={12} /></Link>
          </div>
        } padding={false}>
          {urgentItems.length === 0 ? (
            <div className="p-8 text-center">
              <Shield size={32} className="text-[#1A6B5C] mx-auto mb-2" />
              <p className="text-sm text-[#64748B]">All compliance items are in good standing</p>
            </div>
          ) : (
            <div className="divide-y divide-[#D6F0E8]">
              {urgentItems.map(item => {
                const days = item.expiryDate ? differenceInDays(new Date(item.expiryDate), new Date()) : null;
                return (
                  <Link key={item.id} to={`/compliance/items/${item.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-[#EDF7F3] transition-colors">
                    <div>
                      <p className="text-sm font-medium text-[#0D4035]">{item.name || item.title}</p>
                      <p className="text-xs text-[#64748B]">{item.issuingBody || 'Issuing body not recorded'}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={statusColor[item.status]} size="sm">{item.status}</Badge>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {days == null ? 'No expiry date' : days <= 0 ? 'Expired' : `${days}d left`}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
