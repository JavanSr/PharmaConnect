// frontend/src/pages/OverrideAuditDashboard.tsx
// Route: /override-audit
// Access: OWNER, PHARMACIST_IN_CHARGE — STANDARD tier and above

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';

// ── Types ────────────────────────────────────────────────────────────────────

type OverrideType =
  | 'INTERACTION_WARNING'
  | 'STOCK_NEGATIVE'
  | 'DOSAGE_LIMIT'
  | 'PRESCRIPTION_REQUIRED'
  | 'EXPIRY_WARNING'
  | 'OTHER';

interface OverrideLog {
  id: string;
  dispensedById: string;
  drugName: string | null;
  overrideType: OverrideType;
  reason: string | null;
  patientRef: string | null;
  createdAt: string;
  flagged: boolean;
  flagReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface Summary {
  total: number;
  flagged: number;
  pendingReview: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<OverrideType, string> = {
  INTERACTION_WARNING:   'Drug Interaction',
  STOCK_NEGATIVE:        'Negative Stock',
  DOSAGE_LIMIT:          'Dosage Limit',
  PRESCRIPTION_REQUIRED: 'Rx Required',
  EXPIRY_WARNING:        'Expiry Warning',
  OTHER:                 'Other',
};

const TYPE_COLOURS: Record<OverrideType, string> = {
  INTERACTION_WARNING:   'bg-red-100 text-red-700',
  STOCK_NEGATIVE:        'bg-orange-100 text-orange-700',
  DOSAGE_LIMIT:          'bg-yellow-100 text-yellow-700',
  PRESCRIPTION_REQUIRED: 'bg-purple-100 text-purple-700',
  EXPIRY_WARNING:        'bg-blue-100 text-blue-700',
  OTHER:                 'bg-gray-100 text-gray-600',
};

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ── Summary cards ────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  colour,
}: {
  label: string;
  value: number | undefined;
  colour: string;
}) {
  return (
    <div className={`rounded-xl border p-5 flex flex-col gap-1 ${colour}`}>
      <span className="text-3xl font-bold">{value ?? '—'}</span>
      <span className="text-sm font-medium opacity-80">{label}</span>
    </div>
  );
}

// ── Flag modal ───────────────────────────────────────────────────────────────

function FlagModal({
  entry,
  onClose,
  onSaved,
}: {
  entry: OverrideLog;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [reason, setReason] = useState(entry.flagReason ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!reason.trim()) { setError('Please enter a reason.'); return; }
    setLoading(true);
    try {
      await apiFetch(`/overrides/${entry.id}/flag`, {
        method: 'PATCH',
        body: JSON.stringify({ flagReason: reason }),
      });
      onSaved();
    } catch {
      setError('Failed to save — please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Flag Override Event</h2>
        <div className="text-sm text-gray-500">
          <span className="font-medium text-gray-700">Drug:</span>{' '}
          {entry.drugName ?? 'N/A'} &nbsp;·&nbsp;
          <span className="font-medium text-gray-700">Type:</span>{' '}
          {TYPE_LABELS[entry.overrideType]}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for flagging <span className="text-red-500">*</span>
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            value={reason}
            onChange={e => { setReason(e.target.value); setError(''); }}
            placeholder="e.g. Dispenser bypassed interaction alert without clinical justification"
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Flag Event'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard ───────────────────────────────────────────────────────────

export default function OverrideAuditDashboard() {
  // Filters
  const [flaggedFilter, setFlaggedFilter] = useState<'' | 'true' | 'false'>('');
  const [typeFilter, setTypeFilter] = useState<'' | OverrideType>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // Data
  const [items, setItems] = useState<OverrideLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Modal
  const [flagTarget, setFlagTarget] = useState<OverrideLog | null>(null);
  const [unflagging, setUnflagging] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '25' });
      if (flaggedFilter) params.set('flagged', flaggedFilter);
      if (typeFilter)    params.set('overrideType', typeFilter);
      if (dateFrom)      params.set('dateFrom', dateFrom);
      if (dateTo)        params.set('dateTo', dateTo);

      const json = await apiFetch(`/overrides?${params.toString()}`);
      setItems(json.data.items);
      setPagination(json.data.pagination);
      setSummary(json.data.summary);
    } catch {
      setFetchError('Could not load override logs. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [page, flaggedFilter, typeFilter, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleUnflag(entry: OverrideLog) {
    setUnflagging(entry.id);
    try {
      await apiFetch(`/overrides/${entry.id}/unflag`, { method: 'PATCH' });
      await fetchData();
    } finally {
      setUnflagging(null);
    }
  }

  function resetFilters() {
    setFlaggedFilter('');
    setTypeFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Override Audit</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Review and flag dispenser override events across your outlet
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Total Overrides"
          value={summary?.total}
          colour="bg-white border-gray-200 text-gray-900"
        />
        <SummaryCard
          label="Flagged Events"
          value={summary?.flagged}
          colour="bg-red-50 border-red-200 text-red-800"
        />
        <SummaryCard
          label="Pending Review"
          value={summary?.pendingReview}
          colour="bg-amber-50 border-amber-200 text-amber-800"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={flaggedFilter}
              onChange={e => { setFlaggedFilter(e.target.value as any); setPage(1); }}
            >
              <option value="">All</option>
              <option value="true">Flagged only</option>
              <option value="false">Unflagged only</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value as any); setPage(1); }}
            >
              <option value="">All types</option>
              {(Object.keys(TYPE_LABELS) as OverrideType[]).map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From date</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To date</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {(flaggedFilter || typeFilter || dateFrom || dateTo) && (
          <button
            onClick={resetFilters}
            className="mt-3 text-xs text-blue-600 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {fetchError ? (
          <div className="p-6 text-center text-red-500 text-sm">{fetchError}</div>
        ) : loading ? (
          <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            No override events match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date & Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Drug</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Override Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Dispenser Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient Ref</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(entry => (
                  <tr key={entry.id} className={entry.flagged ? 'bg-red-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {format(new Date(entry.createdAt), 'dd MMM yyyy HH:mm')}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {entry.drugName ?? <span className="text-gray-400 italic">N/A</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_COLOURS[entry.overrideType]}`}>
                        {TYPE_LABELS[entry.overrideType]}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs text-gray-600 truncate" title={entry.reason ?? ''}>
                      {entry.reason ?? <span className="text-gray-400 italic">No reason given</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {entry.patientRef ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {entry.flagged ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            ⚑ Flagged
                          </span>
                          {entry.flagReason && (
                            <p className="text-xs text-gray-500 mt-1 max-w-[180px] truncate" title={entry.flagReason}>
                              {entry.flagReason}
                            </p>
                          )}
                          {entry.reviewedAt && (
                            <p className="text-xs text-gray-400">
                              Reviewed {format(new Date(entry.reviewedAt), 'dd MMM')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          No flag
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {entry.flagged ? (
                        <button
                          disabled={unflagging === entry.id}
                          onClick={() => handleUnflag(entry)}
                          className="text-xs font-medium text-gray-600 hover:text-gray-900 underline disabled:opacity-40"
                        >
                          {unflagging === entry.id ? 'Removing…' : 'Remove flag'}
                        </button>
                      ) : (
                        <button
                          onClick={() => setFlagTarget(entry)}
                          className="text-xs font-medium text-red-600 hover:text-red-800 underline"
                        >
                          Flag
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Showing {(pagination.page - 1) * pagination.pageSize + 1}–
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
              {pagination.total} events
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 text-xs font-medium border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                ← Prev
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-xs font-medium border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Flag modal */}
      {flagTarget && (
        <FlagModal
          entry={flagTarget}
          onClose={() => setFlagTarget(null)}
          onSaved={async () => {
            setFlagTarget(null);
            await fetchData();
          }}
        />
      )}
    </div>
  );
}
