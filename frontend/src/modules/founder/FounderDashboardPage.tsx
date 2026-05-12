import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Users, Pill, Package, ShieldAlert, CheckCircle, Clock, LayoutDashboard, ClipboardList, ShieldCheck } from 'lucide-react';
import { differenceInCalendarDays } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';

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
  trialStartsAt: string;
  trialEndsAt: string;
  isActive: boolean;
  createdAt: string;
  owner: { name: string; email: string; emailVerified: boolean } | null;
};

type Tab = 'overview' | 'registrations';

const TIERS = ['ADDO', 'ESSENTIAL', 'STANDARD', 'PREMIUM', 'WHOLESALE', 'ENTERPRISE'] as const;

const TIER_ORDER = ['ADDO', 'STANDARD', 'PREMIUM', 'WHOLESALE', 'ENTERPRISE'];

export const FounderDashboardPage: React.FC = () => {
  const [tab, setTab] = React.useState<Tab>('overview');
  const [extensionDays, setExtensionDays] = React.useState('7');
  const [setTierTarget, setSetTierTarget] = React.useState<{ id: string; name: string } | null>(null);
  const [selectedTier, setSelectedTier] = React.useState<string>('STANDARD');
  const queryClient = useQueryClient();
  const toast = useNotificationStore(state => state.toast);

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

  const verifyOwnerMutation = useMutation({
    mutationFn: (pharmacyId: string) => api.post(`/founder/registrations/${pharmacyId}/verify-owner`),
    onSuccess: async () => {
      toast.success('Owner account verified');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['founder-registrations'] }),
        queryClient.invalidateQueries({ queryKey: ['founder-stats'] }),
      ]);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Could not verify owner account');
    },
  });

  const extendTrialMutation = useMutation({
    mutationFn: (pharmacyId: string) => api.patch(`/founder/registrations/${pharmacyId}/trial`, {
      extensionDays: Number(extensionDays) || 7,
    }),
    onSuccess: async () => {
      toast.success('Trial extended');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['founder-registrations'] }),
        queryClient.invalidateQueries({ queryKey: ['founder-stats'] }),
      ]);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Could not extend trial');
    },
  });

  const setTierMutation = useMutation({
    mutationFn: ({ pharmacyId, tier }: { pharmacyId: string; tier: string }) =>
      api.patch(`/founder/registrations/${pharmacyId}/set-tier`, { tier }),
    onSuccess: async (_, { tier }) => {
      toast.success(`Tier set to ${tier} — access active immediately`);
      setSetTierTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['founder-registrations'] }),
        queryClient.invalidateQueries({ queryKey: ['founder-stats'] }),
      ]);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Could not set tier');
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (pharmacyId: string) => api.patch(`/founder/registrations/${pharmacyId}/suspend`, {
      reason: 'Founder dashboard manual suspension',
    }),
    onSuccess: async () => {
      toast.success('Pharmacy suspended');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['founder-registrations'] }),
        queryClient.invalidateQueries({ queryKey: ['founder-stats'] }),
      ]);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Could not suspend pharmacy');
    },
  });

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
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <span className="text-sm font-semibold text-[#0D4035]">All Registrations</span>
            <div className="flex items-end gap-3">
              <Input
                label="Extension days"
                type="number"
                min="1"
                max="365"
                value={extensionDays}
                onChange={(event) => setExtensionDays(event.target.value)}
                className="w-24"
              />
              <span className="pb-2 text-xs text-[#64748B]">{registrations.length} total</span>
            </div>
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
                      <p className="text-xs text-[#64748B] mt-1">
                        Trial started {new Date(r.trialStartsAt).toLocaleDateString()} · ends {new Date(r.trialEndsAt).toLocaleDateString()} · {Math.max(0, differenceInCalendarDays(new Date(r.trialEndsAt), new Date()))} day(s) left
                      </p>
                      {r.owner && (
                        <p className="text-xs text-[#374151] mt-1">
                          <span className="font-medium">{r.owner.name}</span>
                          {' · '}
                          <a href={`mailto:${r.owner.email}`} className="text-[#1A6B5C] hover:underline">{r.owner.email}</a>
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-3">
                      {r.owner?.emailVerified ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-[#1A6B5C]">
                          <CheckCircle size={13} />
                          Verified
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                            <Clock size={13} />
                            Pending
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<ShieldCheck size={14} />}
                            loading={verifyOwnerMutation.isPending && verifyOwnerMutation.variables === r.id}
                            onClick={() => verifyOwnerMutation.mutate(r.id)}
                          >
                            Verify owner
                          </Button>
                        </div>
                      )}
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={extendTrialMutation.isPending && extendTrialMutation.variables === r.id}
                          onClick={() => extendTrialMutation.mutate(r.id)}
                        >
                          Extend trial
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSetTierTarget({ id: r.id, name: r.name });
                            setSelectedTier(r.tier);
                          }}
                        >
                          Set tier
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          loading={suspendMutation.isPending && suspendMutation.variables === r.id}
                          disabled={!r.isActive && r.status === 'SUSPENDED'}
                          onClick={() => {
                            if (window.confirm(`Suspend ${r.name}? This will stop pharmacy access.`)) {
                              suspendMutation.mutate(r.id);
                            }
                          }}
                        >
                          Suspend
                        </Button>
                      </div>
                      {setTierTarget?.id === r.id && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[#D6F0E8] bg-[#F7FCFA] p-3">
                          <span className="text-xs font-medium text-[#0D4035]">Activate tier:</span>
                          {TIERS.map((t) => (
                            <button
                              key={t}
                              onClick={() => setSelectedTier(t)}
                              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${selectedTier === t ? 'bg-[#1A6B5C] text-white' : 'bg-[#EDF7F3] text-[#0D4035] hover:bg-[#D6F0E8]'}`}
                            >
                              {t}
                            </button>
                          ))}
                          <Button
                            size="sm"
                            loading={setTierMutation.isPending}
                            onClick={() => setTierMutation.mutate({ pharmacyId: r.id, tier: selectedTier })}
                          >
                            Activate {selectedTier}
                          </Button>
                          <button
                            className="text-xs text-[#94A3B8] hover:text-[#64748B]"
                            onClick={() => setSetTierTarget(null)}
                          >
                            Cancel
                          </button>
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
