import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Users, Pill, Package, ShieldAlert, CheckCircle, Clock, LayoutDashboard, ClipboardList } from 'lucide-react';
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

type Registration = {
  id: string;
  name: string;
  region: string;
  pharmacyType: string;
  tier: string;
  status: string;
  trialActive: boolean;
  createdAt: string;
  owner: { name: string; email: string; emailVerified: boolean } | null;
};

type Tab = 'overview' | 'registrations';

const TIER_ORDER = ['ADDO', 'STANDARD', 'PREMIUM', 'WHOLESALE', 'ENTERPRISE'];

export const FounderDashboardPage: React.FC = () => {
  const [tab, setTab] = React.useState<Tab>('overview');

  const statsQuery = useQuery<{ data: FounderStats }>({
    queryKey: ['founder-stats'],
    queryFn: () => api.get('/founder/stats').then(r => r.data),
    staleTime: 60_000,
  });

  const regsQuery = useQuery<{ data: Registration[] }>({
    queryKey: ['founder-registrations'],
    queryFn: () => api.get('/founder/registrations').then(r => r.data),
    staleTime: 30_000,
    enabled: tab === 'registrations',
  });

  const stats = statsQuery.data?.data;
  const registrations = regsQuery.data?.data ?? [];

  const pendingVerification = registrations.filter(r => r.owner && !r.owner.emailVerified).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0D4035]">Founder Dashboard</h1>
          <p className="text-sm text-[#64748B] mt-1">Platform-wide view — SUPER_ADMIN only.</p>
        </div>
        {pendingVerification > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
            <Clock size={14} className="text-amber-600" />
            <span className="text-xs font-medium text-amber-700">{pendingVerification} pending email verification</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#EDF7F3] rounded-xl p-1 w-fit">
        {([['overview', <LayoutDashboard size={14} />, 'Overview'], ['registrations', <ClipboardList size={14} />, 'Registrations']] as const).map(([id, icon, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === id ? 'bg-white text-[#0D4035] shadow-sm' : 'text-[#64748B] hover:text-[#0D4035]'
            }`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {tab === 'overview' && (
        statsQuery.isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-[#1A6B5C] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !stats ? (
          <Card><div className="p-8 text-center text-sm text-[#64748B]">Stats could not be loaded.</div></Card>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Pharmacies" value={stats.pharmacies.total} icon={<Building2 size={20} className="text-[#1A6B5C]" />} />
              <StatCard label="Active" value={stats.pharmacies.active} icon={<Building2 size={20} className="text-[#1D9E75]" />} />
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
                          <div className="h-full bg-[#1A6B5C] rounded-full" style={{ width: `${Math.round((count / max) * 100)}%` }} />
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
                    <div className="flex items-center gap-2 mb-1"><Pill size={14} className="text-[#1A6B5C]" /><p className="text-xs text-[#64748B]">Dispensings</p></div>
                    <p className="text-xl font-bold text-[#0D4035]">{stats.activity.totalDispensings.toLocaleString()}</p>
                  </div>
                  <div className="rounded-2xl bg-[#EDF7F3] px-4 py-3">
                    <div className="flex items-center gap-2 mb-1"><Package size={14} className="text-[#1A6B5C]" /><p className="text-xs text-[#64748B]">Batches</p></div>
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
          </>
        )
      )}

      {/* ── Registrations tab ── */}
      {tab === 'registrations' && (
        <Card padding={false} header={
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#0D4035]">All Registrations</span>
            <span className="text-xs text-[#64748B]">{registrations.length} total</span>
          </div>
        }>
          {regsQuery.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-4 border-[#1A6B5C] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : registrations.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[#64748B]">No registrations yet.</div>
          ) : (
            <div className="divide-y divide-[#D6F0E8]">
              {registrations.map(r => (
                <div key={r.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-[#0D4035]">{r.name}</p>
                        <Badge variant="info" size="sm">{r.tier}</Badge>
                        <Badge variant={r.status === 'ACTIVE' ? 'success' : 'warning'} size="sm">{r.status}</Badge>
                      </div>
                      <p className="text-xs text-[#64748B] mt-0.5">{r.region} · {r.pharmacyType} · {new Date(r.createdAt).toLocaleDateString()}</p>
                      {r.owner && (
                        <p className="text-xs text-[#374151] mt-1">
                          <span className="font-medium">{r.owner.name}</span>
                          {' · '}
                          <a href={`mailto:${r.owner.email}`} className="text-[#1A6B5C] hover:underline">{r.owner.email}</a>
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {r.owner?.emailVerified ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-[#1A6B5C]">
                          <CheckCircle size={13} />
                          Verified
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                          <Clock size={13} />
                          Pending
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
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
