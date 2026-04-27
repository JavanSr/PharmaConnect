import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Users, Pill, Package, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

type OverrideEntry = {
  id: string;
  pharmacyId: string;
  alertType: string;
  reason: string;
  createdAt: string;
  pharmacy: { name: string };
};

type RecentPharmacy = {
  id: string;
  name: string;
  region: string;
  subscriptionTier: string;
  status: string;
  createdAt: string;
};

type FounderStats = {
  pharmacies: { total: number; active: number };
  users: { total: number };
  tierBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  recentPharmacies: RecentPharmacy[];
  recentOverrides: OverrideEntry[];
  activity: { totalDispensings: number; totalBatches: number };
};

const TIER_ORDER = ['ADDO', 'STANDARD', 'PREMIUM', 'WHOLESALE', 'ENTERPRISE'];

export const FounderDashboardPage: React.FC = () => {
  const { data, isLoading, isError } = useQuery<{ data: FounderStats }>({
    queryKey: ['founder-stats'],
    queryFn: () => api.get('/founder/stats').then(r => r.data),
    staleTime: 60_000,
  });

  const stats = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#1A6B5C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <Card>
        <div className="p-8 text-center text-sm text-[#64748B]">
          Founder stats could not be loaded. SUPER_ADMIN access required.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#0D4035]">Founder Dashboard</h1>
        <p className="text-sm text-[#64748B] mt-1">Platform-wide view — visible to SUPER_ADMIN only.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Pharmacies" value={stats.pharmacies.total} icon={<Building2 size={20} className="text-[#1A6B5C]" />} />
        <StatCard label="Active Pharmacies" value={stats.pharmacies.active} icon={<Building2 size={20} className="text-[#1D9E75]" />} />
        <StatCard label="Total Users" value={stats.users.total} icon={<Users size={20} className="text-[#1A6B5C]" />} />
        <StatCard label="Total Dispensings" value={stats.activity.totalDispensings} icon={<Pill size={20} className="text-[#1A6B5C]" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card header={<span className="text-sm font-semibold text-[#0D4035]">Subscription Tiers</span>}>
          <div className="space-y-3 pt-1">
            {TIER_ORDER.map(tier => {
              const count = stats.tierBreakdown[tier] ?? 0;
              const max = Math.max(...Object.values(stats.tierBreakdown), 1);
              return (
                <div key={tier} className="flex items-center gap-3">
                  <span className="text-sm text-[#64748B] w-24 shrink-0">{tier}</span>
                  <div className="flex-1 h-2 bg-[#D6F0E8] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1A6B5C] rounded-full"
                      style={{ width: `${Math.round((count / max) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-[#0D4035] w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card header={<span className="text-sm font-semibold text-[#0D4035]">Platform Activity</span>}>
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="rounded-2xl bg-[#EDF7F3] px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <Pill size={14} className="text-[#1A6B5C]" />
                <p className="text-xs text-[#64748B]">Dispensings</p>
              </div>
              <p className="text-xl font-bold text-[#0D4035]">{stats.activity.totalDispensings.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-[#EDF7F3] px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <Package size={14} className="text-[#1A6B5C]" />
                <p className="text-xs text-[#64748B]">Stock Batches</p>
              </div>
              <p className="text-xl font-bold text-[#0D4035]">{stats.activity.totalBatches.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {Object.entries(stats.statusBreakdown).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className="text-[#64748B]">{status}</span>
                <Badge variant={status === 'ACTIVE' ? 'success' : status === 'TRIAL' ? 'warning' : 'muted'} size="sm">{count}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card header={<span className="text-sm font-semibold text-[#0D4035]">Recent Pharmacies</span>} padding={false}>
        {stats.recentPharmacies.length === 0 ? (
          <div className="px-5 py-6 text-sm text-[#64748B]">No pharmacies yet.</div>
        ) : (
          <div className="divide-y divide-[#D6F0E8]">
            {stats.recentPharmacies.map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-[#0D4035]">{p.name}</p>
                  <p className="text-xs text-[#64748B]">{p.region} · {new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="info" size="sm">{p.subscriptionTier}</Badge>
                  <Badge variant={p.status === 'ACTIVE' ? 'success' : 'warning'} size="sm">{p.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card header={
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className="text-[#D97706]" />
          <span className="text-sm font-semibold text-[#0D4035]">Recent PIC Overrides (platform-wide)</span>
        </div>
      } padding={false}>
        {stats.recentOverrides.length === 0 ? (
          <div className="px-5 py-6 text-sm text-[#64748B]">No overrides recorded yet.</div>
        ) : (
          <div className="divide-y divide-[#D6F0E8]">
            {stats.recentOverrides.map(o => (
              <div key={o.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-medium text-[#0D4035]">{o.pharmacy?.name ?? o.pharmacyId}</p>
                    <p className="text-xs text-[#64748B] mt-0.5 truncate max-w-xs">{o.reason}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="warning" size="sm">{o.alertType}</Badge>
                    <span className="text-xs text-[#64748B]">{new Date(o.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="bg-white rounded-2xl border border-[#D6F0E8] p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-[#64748B] mb-1">{label}</p>
        <p className="text-2xl font-bold text-[#0D4035]">{value.toLocaleString()}</p>
      </div>
      <div className="w-10 h-10 rounded-xl bg-[#D6F0E8] flex items-center justify-center shrink-0">
        {icon}
      </div>
    </div>
  </div>
);
