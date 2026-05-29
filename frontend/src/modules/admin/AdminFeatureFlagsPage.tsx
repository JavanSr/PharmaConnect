import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';
import type { FeatureFlagData, AdminPharmacyRow } from './types';
import { FEATURE_KEY_LABELS } from './types';

type GlobalFlag = { featureKey: string; enabled: boolean; updatedBy: string | null; updatedAt: string };

const Toggle: React.FC<{ enabled: boolean; onChange: (v: boolean) => void; loading?: boolean }> = ({ enabled, onChange, loading }) => (
  <button
    onClick={() => !loading && onChange(!enabled)}
    disabled={loading}
    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${enabled ? 'bg-[#1A6B5C]' : 'bg-[#D1D5DB]'} disabled:opacity-50`}
  >
    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
  </button>
);

const ConfirmGlobalModal: React.FC<{
  featureKey: string; enabled: boolean; affectedCount: number;
  onConfirm: () => void; onCancel: () => void;
}> = ({ featureKey, enabled, affectedCount, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="w-full max-w-sm rounded-2xl border border-[#D6F0E8] bg-white p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-3">
        <div className="rounded-full bg-amber-100 p-2"><AlertTriangle size={16} className="text-amber-600" /></div>
        <h3 className="text-base font-semibold text-[#0D4035]">Global flag change</h3>
      </div>
      <p className="text-sm text-[#64748B]">
        This will <strong>{enabled ? 'enable' : 'disable'}</strong> <code className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-xs">{FEATURE_KEY_LABELS[featureKey] ?? featureKey}</code> for <strong>all {affectedCount} active pharmacies</strong>.
      </p>
      <div className="mt-5 flex justify-end gap-3">
        <button onClick={onCancel} className="rounded-xl border border-[#D6F0E8] px-4 py-2 text-sm text-[#475569] hover:bg-[#F8FAFC]">Cancel</button>
        <button onClick={onConfirm} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">Confirm</button>
      </div>
    </div>
  </div>
);

export const AdminFeatureFlagsPage: React.FC = () => {
  const toast = useNotificationStore((s) => s.toast);
  const qc = useQueryClient();
  const [globalConfirm, setGlobalConfirm] = React.useState<{ featureKey: string; enabled: boolean } | null>(null);
  const [pharmacySearch, setPharmacySearch] = React.useState('');

  const flagsQuery = useQuery({
    queryKey: ['admin-feature-flags'],
    queryFn: () => api.get('/admin/feature-flags').then((r) => r.data.data as FeatureFlagData),
    staleTime: 30_000,
  });

  const globalQuery = useQuery({
    queryKey: ['admin-global-flags'],
    queryFn: () => api.get('/admin/feature-flags/global').then((r) => r.data.data as GlobalFlag[]),
    staleTime: 30_000,
  });

  const pharmaciesQuery = useQuery({
    queryKey: ['admin-pharmacies-list'],
    queryFn: () =>
      api.get('/admin/pharmacies', { params: { limit: 100 } })
        .then((r) => (r.data.data as { data: AdminPharmacyRow[] }).data),
    staleTime: 60_000,
  });

  const togglePharmacyFlag = useMutation({
    mutationFn: ({ pharmacyId, featureKey, enabled }: { pharmacyId: string; featureKey: string; enabled: boolean }) =>
      api.patch(`/admin/feature-flags/${pharmacyId}/${featureKey}`, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-feature-flags'] }),
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Failed'),
  });

  const resetPharmacyFlags = useMutation({
    mutationFn: (pharmacyId: string) => api.post(`/admin/feature-flags/reset/${pharmacyId}`),
    onSuccess: () => { toast.success('Flags reset to defaults'); qc.invalidateQueries({ queryKey: ['admin-feature-flags'] }); },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Failed'),
  });

  const toggleGlobalFlag = useMutation({
    mutationFn: ({ featureKey, enabled }: { featureKey: string; enabled: boolean }) =>
      api.patch(`/admin/feature-flags/global/${featureKey}`, { enabled }),
    onSuccess: (_, { featureKey, enabled }) => {
      toast.success(`${FEATURE_KEY_LABELS[featureKey] ?? featureKey} ${enabled ? 'enabled' : 'disabled'} globally`);
      qc.invalidateQueries({ queryKey: ['admin-global-flags'] });
      setGlobalConfirm(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Failed'),
  });

  const flags = flagsQuery.data;
  const featureKeys = flags?.featureKeys ?? [];
  const globalFlags = globalQuery.data ?? [];
  const allPharmacies = (pharmaciesQuery.data ?? []).filter(
    (p) => !pharmacySearch || p.name.toLowerCase().includes(pharmacySearch.toLowerCase()),
  );
  const pharmaciesWithOverrides = new Set(flags?.perPharmacy.map((f) => f.pharmacyId) ?? []);

  function getPharmacyFlag(pharmacyId: string, featureKey: string): boolean | null {
    const override = flags?.perPharmacy.find((f) => f.pharmacyId === pharmacyId && f.featureKey === featureKey);
    if (override) return override.enabled;
    const global = globalFlags.find((g) => g.featureKey === featureKey);
    return global?.enabled ?? true;
  }

  const activeCount = (pharmaciesQuery.data ?? []).length;

  return (
    <div className="space-y-6">
      {globalConfirm && (
        <ConfirmGlobalModal
          featureKey={globalConfirm.featureKey}
          enabled={globalConfirm.enabled}
          affectedCount={activeCount}
          onConfirm={() => toggleGlobalFlag.mutate(globalConfirm)}
          onCancel={() => setGlobalConfirm(null)}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-[#0D4035]">Feature Flags</h1>
        <p className="text-sm text-[#64748B]">Per-pharmacy overrides and global switches</p>
      </div>

      {/* Global flags */}
      <div className="rounded-2xl border border-[#D6F0E8] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-600" />
          <h2 className="text-sm font-semibold text-[#0D4035]">Global flags — affect all pharmacies</h2>
        </div>
        <div className="space-y-3">
          {featureKeys.map((key) => {
            const g = globalFlags.find((f) => f.featureKey === key);
            const enabled = g?.enabled ?? true;
            return (
              <div key={key} className="flex items-center justify-between rounded-xl border border-[#F1F5F9] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[#0D4035]">{FEATURE_KEY_LABELS[key] ?? key}</p>
                  {g?.updatedBy && (
                    <p className="text-xs text-[#94A3B8]">Last changed by {g.updatedBy}</p>
                  )}
                </div>
                <Toggle
                  enabled={enabled}
                  loading={toggleGlobalFlag.isPending}
                  onChange={(v) => setGlobalConfirm({ featureKey: key, enabled: v })}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-pharmacy overrides */}
      <div className="rounded-2xl border border-[#D6F0E8] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#E2E8F0] px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#0D4035]">Per-pharmacy overrides</h2>
            <p className="text-xs text-[#64748B]">Override defaults per pharmacy. Empty = inherits global flag.</p>
          </div>
          <input
            value={pharmacySearch}
            onChange={(e) => setPharmacySearch(e.target.value)}
            placeholder="Filter pharmacy…"
            className="rounded-xl border border-[#D6F0E8] px-3 py-2 text-sm outline-none focus:border-[#1A6B5C] w-48"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-[#64748B] min-w-[180px]">Pharmacy</th>
                {featureKeys.map((k) => (
                  <th key={k} className="px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[#64748B] min-w-[90px]">
                    {FEATURE_KEY_LABELS[k]?.split(' ')[0] ?? k}
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.1em] text-[#64748B]">Reset</th>
              </tr>
            </thead>
            <tbody>
              {flagsQuery.isLoading && (
                <tr><td colSpan={featureKeys.length + 2} className="py-12 text-center text-sm text-[#94A3B8]">Loading…</td></tr>
              )}
              {allPharmacies.slice(0, 50).map((p) => (
                <tr key={p.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#0D4035] truncate max-w-[160px]">{p.name}</p>
                    <p className="text-xs text-[#94A3B8]">{p.tier}</p>
                  </td>
                  {featureKeys.map((key) => {
                    const val = getPharmacyFlag(p.id, key);
                    const isOverridden = flags?.perPharmacy.some((f) => f.pharmacyId === p.id && f.featureKey === key);
                    return (
                      <td key={key} className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <Toggle
                            enabled={val ?? true}
                            loading={togglePharmacyFlag.isPending}
                            onChange={(v) => togglePharmacyFlag.mutate({ pharmacyId: p.id, featureKey: key, enabled: v })}
                          />
                          {isOverridden && <span className="text-[9px] text-amber-600">override</span>}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-center">
                    {pharmaciesWithOverrides.has(p.id) && (
                      <button
                        onClick={() => resetPharmacyFlags.mutate(p.id)}
                        disabled={resetPharmacyFlags.isPending}
                        title="Reset to tier defaults"
                        className="rounded-lg border border-[#E2E8F0] p-1.5 text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40"
                      >
                        <RefreshCw size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
