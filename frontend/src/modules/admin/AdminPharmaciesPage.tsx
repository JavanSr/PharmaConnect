import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { AdminPharmacyRow, PharmacyStatus, SubscriptionTier } from './types';
import {
  STATUS_LABEL, STATUS_STYLE, HEALTH_DOT, TIERS, STATUSES, fmtDate, daysAgo,
} from './types';

interface ListResponse {
  data: AdminPharmacyRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const inputCls = 'rounded-xl border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] outline-none focus:border-[#1A6B5C] focus:ring-1 focus:ring-[#1A6B5C] bg-white';

export const AdminPharmaciesPage: React.FC = () => {
  const [search, setSearch] = React.useState('');
  const [tier, setTier] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [region, setRegion] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [activityFilter, setActivityFilter] = React.useState<'' | 'amber' | 'red'>('');

  const debouncedSearch = React.useDeferredValue(search);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-pharmacies', debouncedSearch, tier, status, region, page],
    queryFn: () =>
      api.get('/admin/pharmacies', {
        params: { search: debouncedSearch || undefined, tier: tier || undefined, status: status || undefined, region: region || undefined, page, limit: 25 },
      }).then((r) => r.data.data as ListResponse),
    staleTime: 30_000,
  });

  const rows = (data?.data ?? []).filter((r) =>
    activityFilter ? r.activityHealth === activityFilter : true,
  );

  const handleExport = async () => {
    const url = `/api/v1/admin/pharmacies/export-csv?${new URLSearchParams({
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(tier && { tier }),
      ...(status && { status }),
      ...(region && { region }),
    })}`;
    const resp = await api.get(url, { responseType: 'blob' });
    const blob = new Blob([resp.data], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pharmacies.csv';
    a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0D4035]">Pharmacies</h1>
          <p className="text-sm text-[#64748B]">{data?.total ?? 0} total</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-xl border border-[#D6F0E8] bg-white px-4 py-2 text-sm font-medium text-[#0D4035] hover:bg-[#EDF7F3]"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, owner, phone…"
            className={`${inputCls} pl-8 w-56`}
          />
        </div>
        <select value={tier} onChange={(e) => { setTier(e.target.value); setPage(1); }} className={inputCls}>
          <option value="">All tiers</option>
          {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={inputCls}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <input
          value={region}
          onChange={(e) => { setRegion(e.target.value); setPage(1); }}
          placeholder="Region…"
          className={`${inputCls} w-32`}
        />
        <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value as any)} className={inputCls}>
          <option value="">All activity</option>
          <option value="amber">⚠ Amber only</option>
          <option value="red">🔴 Red only</option>
        </select>
        {(search || tier || status || region || activityFilter) && (
          <button
            onClick={() => { setSearch(''); setTier(''); setStatus(''); setRegion(''); setActivityFilter(''); setPage(1); }}
            className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#64748B] hover:bg-[#F1F5F9]"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[#D6F0E8] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              {['', 'Name', 'Owner', 'Region', 'Tier', 'Status', 'Last login', 'Onboarded', ''].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-[#64748B]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={9} className="py-12 text-center text-sm text-[#94A3B8]">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-4 border-[#1A6B5C] border-t-transparent" />
              </td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={9} className="py-12 text-center text-sm text-[#94A3B8]">No pharmacies match the current filters.</td></tr>
            )}
            {rows.map((p, idx) => {
              const days = daysAgo(p.lastLogin);
              return (
                <tr key={p.id} className={`border-b border-[#F1F5F9] hover:bg-[#F8FAFC] ${idx % 2 === 1 ? 'bg-[#FAFCFB]' : ''}`}>
                  <td className="px-4 py-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${HEALTH_DOT[p.activityHealth]}`} title={`Activity: ${p.activityHealth}`} />
                  </td>
                  <td className="px-4 py-3 font-medium text-[#0D4035] max-w-[180px]">
                    <Link to={`/superadmin/pharmacies/${p.id}`} className="hover:underline">{p.name}</Link>
                    {p.isHybrid && <span className="ml-1.5 rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">Hybrid</span>}
                  </td>
                  <td className="px-4 py-3 text-[#475569] max-w-[160px]">
                    <p className="truncate">{p.ownerName ?? '—'}</p>
                    <p className="truncate text-xs text-[#94A3B8]">{p.ownerPhone ?? p.ownerEmail ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 text-[#475569]">{p.region}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-[#D6F0E8] px-2.5 py-0.5 text-xs font-medium text-[#0D4035]">{p.tier}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[p.status as PharmacyStatus]}`}>
                      {STATUS_LABEL[p.status as PharmacyStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#475569]">
                    {days === null ? '—' : days === 0 ? 'Today' : `${days}d ago`}
                  </td>
                  <td className="px-4 py-3 text-[#475569]">{fmtDate(p.onboardedAt)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/superadmin/pharmacies/${p.id}`} className="rounded-lg border border-[#D6F0E8] px-3 py-1 text-xs font-medium text-[#1A6B5C] hover:bg-[#EDF7F3]">
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(data?.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#64748B]">
            Page {data?.page} of {data?.totalPages} · {data?.total} total
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-xl border border-[#D6F0E8] bg-white p-2 text-[#475569] hover:bg-[#EDF7F3] disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              disabled={page >= (data?.totalPages ?? 1)}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-[#D6F0E8] bg-white p-2 text-[#475569] hover:bg-[#EDF7F3] disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
