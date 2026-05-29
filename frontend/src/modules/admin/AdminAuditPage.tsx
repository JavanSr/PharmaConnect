import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Download, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { api } from '@/lib/api';
import type { AdminAuditEntry } from './types';
import { fmtDateTime } from './types';

interface AuditResponse {
  data: AdminAuditEntry[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const inputCls = 'rounded-xl border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] outline-none focus:border-[#1A6B5C] focus:ring-1 focus:ring-[#1A6B5C] bg-white';

const ACTION_COLOURS: Record<string, string> = {
  LOGIN: 'bg-blue-50 text-blue-700',
  TIER_CHANGE: 'bg-[#EDF7F3] text-[#1A6B5C]',
  STATUS_CHANGE: 'bg-amber-50 text-amber-700',
  IMPERSONATE: 'bg-red-50 text-red-700',
  PAYMENT_LOGGED: 'bg-purple-50 text-purple-700',
  FEATURE_FLAG_CHANGE: 'bg-[#EDF7F3] text-[#1A6B5C]',
  GLOBAL_FLAG_CHANGE: 'bg-orange-50 text-orange-700',
  MESSAGE_SENT: 'bg-blue-50 text-blue-700',
  RESET_PIN: 'bg-amber-50 text-amber-700',
};

const ExpandableRow: React.FC<{ entry: AdminAuditEntry }> = ({ entry }) => {
  const [open, setOpen] = React.useState(false);
  const hasDetails = Boolean(entry.details && typeof entry.details === 'object');

  return (
    <>
      <tr className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
        <td className="px-4 py-3 text-xs text-[#94A3B8] whitespace-nowrap">{fmtDateTime(entry.createdAt)}</td>
        <td className="px-4 py-3 text-xs text-[#475569]">{entry.adminEmail}</td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${ACTION_COLOURS[entry.action] ?? 'bg-[#F1F5F9] text-[#475569]'}`}>
            {entry.action.replace(/_/g, ' ')}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-[#0D4035]">
          {entry.pharmacyName
            ? <Link to={`/superadmin/pharmacies/${entry.targetPharmacyId}`} className="hover:underline">{entry.pharmacyName}</Link>
            : <span className="text-[#94A3B8]">—</span>}
        </td>
        <td className="px-4 py-3 font-mono text-xs text-[#94A3B8]">{entry.ipAddress ?? '—'}</td>
        <td className="px-4 py-3">
          {hasDetails && (
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-1 text-xs text-[#1A6B5C] hover:underline"
            >
              {open ? <ChevronDown size={12} /> : <ChevronRightIcon size={12} />} Details
            </button>
          )}
        </td>
      </tr>
      {open && hasDetails && (
        <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC]">
          <td colSpan={6} className="px-6 py-3">
            <pre className="text-xs text-[#475569] whitespace-pre-wrap">
              {JSON.stringify(entry.details, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
};

export const AdminAuditPage: React.FC = () => {
  const [page, setPage] = React.useState(1);
  const [action, setAction] = React.useState('');
  const [adminEmail, setAdminEmail] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit', page, action, adminEmail, from, to],
    queryFn: () =>
      api.get('/admin/audit', {
        params: {
          page,
          limit: 50,
          action: action || undefined,
          adminEmail: adminEmail || undefined,
          from: from || undefined,
          to: to ? new Date(to + 'T23:59:59').toISOString() : undefined,
        },
      }).then((r) => r.data.data as AuditResponse),
    staleTime: 30_000,
  });

  const rows = data?.data ?? [];

  const handleExport = async () => {
    const resp = await api.get('/admin/audit/export', { responseType: 'blob' });
    const blob = new Blob([resp.data], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'audit-log.csv';
    a.click();
  };

  const KNOWN_ACTIONS = [
    'TIER_CHANGE','STATUS_CHANGE','EXPIRY_SET','PAYMENT_LOGGED','IMPERSONATE',
    'RESET_PIN','FEATURE_FLAG_CHANGE','GLOBAL_FLAG_CHANGE','MESSAGE_SENT',
    'NOTES_UPDATED','EXPORT_PHARMACIES_CSV','FEATURE_FLAGS_RESET',
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0D4035]">Audit Log</h1>
          <p className="text-sm text-[#64748B]">{data?.total ?? 0} entries</p>
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
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className={inputCls}>
          <option value="">All actions</option>
          {KNOWN_ACTIONS.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
        <input
          value={adminEmail}
          onChange={(e) => { setAdminEmail(e.target.value); setPage(1); }}
          placeholder="Admin email…"
          className={`${inputCls} w-48`}
        />
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={inputCls} title="From date" />
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={inputCls} title="To date" />
        {(action || adminEmail || from || to) && (
          <button
            onClick={() => { setAction(''); setAdminEmail(''); setFrom(''); setTo(''); setPage(1); }}
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
              {['Timestamp', 'Admin', 'Action', 'Pharmacy', 'IP', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-[#64748B]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="py-12 text-center text-sm text-[#94A3B8]">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-4 border-[#1A6B5C] border-t-transparent" />
              </td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-sm text-[#94A3B8]">No audit entries found.</td></tr>
            )}
            {rows.map((e) => <ExpandableRow key={e.id} entry={e} />)}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(data?.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#64748B]">Page {data?.page} of {data?.totalPages} · {data?.total} entries</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="rounded-xl border border-[#D6F0E8] bg-white p-2 text-[#475569] hover:bg-[#EDF7F3] disabled:opacity-40">
              <ChevronLeft size={14} />
            </button>
            <button disabled={page >= (data?.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-[#D6F0E8] bg-white p-2 text-[#475569] hover:bg-[#EDF7F3] disabled:opacity-40">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
