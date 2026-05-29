import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';
import type { AdminMessage } from './types';
import { STATUSES, TIERS, STATUS_LABEL, fmtDateTime } from './types';

const MAX_LEN = 500;
const inputCls = 'w-full rounded-xl border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] outline-none focus:border-[#1A6B5C] focus:ring-1 focus:ring-[#1A6B5C] bg-white';
const labelCls = 'mb-1 block text-xs font-medium text-[#64748B]';

type FilterType = 'all' | 'status' | 'tier' | 'activity_health' | 'pharmacy_ids';

const FILTER_LABELS: Record<FilterType, string> = {
  all: 'All active pharmacies',
  status: 'All pharmacies with a specific status',
  tier: 'All pharmacies on a specific tier',
  activity_health: 'At-risk pharmacies (Amber or Red)',
  pharmacy_ids: 'Specific pharmacy (by search)',
};

interface SendForm {
  filterType: FilterType;
  filterValue: string;
  body: string;
  pharmacyIds: string[];
  pharmacySearch: string;
}

interface PreviewResult { recipientCount: number }

export const AdminMessagesPage: React.FC = () => {
  const toast = useNotificationStore((s) => s.toast);
  const qc = useQueryClient();

  const [form, setForm] = React.useState<SendForm>({
    filterType: 'all',
    filterValue: '',
    body: '',
    pharmacyIds: [],
    pharmacySearch: '',
  });
  const [preview, setPreview] = React.useState<PreviewResult | null>(null);
  const [confirmed, setConfirmed] = React.useState(false);

  const messagesQuery = useQuery({
    queryKey: ['admin-messages'],
    queryFn: () => api.get('/admin/messages').then((r) => (r.data.data as { data: AdminMessage[] }).data),
    staleTime: 30_000,
  });

  const pharmacySearchQuery = useQuery({
    queryKey: ['admin-pharmacy-search-msg', form.pharmacySearch],
    queryFn: () =>
      api.get('/admin/pharmacies', { params: { search: form.pharmacySearch, limit: 10 } })
        .then((r) => (r.data.data as { data: Array<{ id: string; name: string; region: string }> }).data),
    enabled: form.pharmacySearch.length >= 2 && form.filterType === 'pharmacy_ids',
  });

  const buildFilter = () => {
    if (form.filterType === 'pharmacy_ids') {
      return { type: 'pharmacy_ids', pharmacyIds: form.pharmacyIds };
    }
    if (form.filterType === 'all') return { type: 'all' };
    if (form.filterType === 'activity_health') return { type: 'activity_health', value: 'red' };
    return { type: form.filterType, value: form.filterValue };
  };

  const sendMutation = useMutation({
    mutationFn: () => api.post('/admin/messages/send', { body: form.body, filter: buildFilter() }),
    onSuccess: (res) => {
      const count = res.data.data.recipientCount;
      toast.success(`Message sent to ${count} pharmacies`);
      qc.invalidateQueries({ queryKey: ['admin-messages'] });
      setForm({ filterType: 'all', filterValue: '', body: '', pharmacyIds: [], pharmacySearch: '' });
      setPreview(null);
      setConfirmed(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Send failed'),
  });

  const filterNeedsValue = form.filterType === 'status' || form.filterType === 'tier';
  const filterOk =
    form.filterType === 'all' ||
    form.filterType === 'activity_health' ||
    (form.filterType === 'pharmacy_ids' && form.pharmacyIds.length > 0) ||
    (filterNeedsValue && form.filterValue);
  const canSend = Boolean(form.body.trim()) && filterOk && confirmed;

  const handlePreview = () => {
    setPreview({ recipientCount: form.filterType === 'pharmacy_ids' ? form.pharmacyIds.length : -1 });
    setConfirmed(false);
  };

  const messages = messagesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0D4035]">Messages</h1>
        <p className="text-sm text-[#64748B]">Send system notifications to pharmacy owners</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        {/* Message history */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[#0D4035]">Message history</h2>
          {messagesQuery.isLoading && (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#1A6B5C] border-t-transparent" />
            </div>
          )}
          {messages.length === 0 && !messagesQuery.isLoading && (
            <div className="rounded-2xl border border-[#D6F0E8] bg-white p-8 text-center">
              <MessageSquare size={28} className="mx-auto text-[#AFDFD3]" />
              <p className="mt-3 text-sm text-[#64748B]">No messages sent yet.</p>
            </div>
          )}
          {messages.map((m) => {
            const filter = m.recipientFilter as Record<string, unknown>;
            const filterDesc = filter.type === 'all'
              ? 'All pharmacies'
              : filter.type === 'status' ? `Status: ${filter.value}`
              : filter.type === 'tier' ? `Tier: ${filter.value}`
              : filter.type === 'activity_health' ? 'At-risk (red)'
              : `${(filter.pharmacyIds as string[] | undefined)?.length ?? 0} specific`;
            return (
              <div key={m.id} className="rounded-2xl border border-[#D6F0E8] bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#0D4035] line-clamp-2">{m.messageBody}</p>
                    <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-[#94A3B8]">
                      <span>{fmtDateTime(m.sentAt)}</span>
                      <span>by {m.sentBy}</span>
                      <span className="font-medium text-[#64748B]">{filterDesc}</span>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#EDF7F3] px-2.5 py-0.5 text-xs font-semibold text-[#1A6B5C]">
                    {m.recipientCount} recipients
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Compose */}
        <div className="rounded-2xl border border-[#D6F0E8] bg-white p-5 space-y-4 h-fit">
          <h2 className="text-sm font-semibold text-[#0D4035]">New message</h2>

          <div>
            <label className={labelCls}>Send to</label>
            <select
              value={form.filterType}
              onChange={(e) => setForm((f) => ({ ...f, filterType: e.target.value as FilterType, filterValue: '', pharmacyIds: [] }))}
              className={inputCls}
            >
              {(Object.entries(FILTER_LABELS) as [FilterType, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {form.filterType === 'status' && (
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.filterValue} onChange={(e) => setForm((f) => ({ ...f, filterValue: e.target.value }))} className={inputCls}>
                <option value="">Select status…</option>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
          )}

          {form.filterType === 'tier' && (
            <div>
              <label className={labelCls}>Tier</label>
              <select value={form.filterValue} onChange={(e) => setForm((f) => ({ ...f, filterValue: e.target.value }))} className={inputCls}>
                <option value="">Select tier…</option>
                {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          {form.filterType === 'pharmacy_ids' && (
            <div className="space-y-2">
              <label className={labelCls}>Search pharmacy</label>
              <input
                value={form.pharmacySearch}
                onChange={(e) => setForm((f) => ({ ...f, pharmacySearch: e.target.value }))}
                placeholder="Type to search…"
                className={inputCls}
              />
              {(pharmacySearchQuery.data ?? []).map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    if (!form.pharmacyIds.includes(p.id)) {
                      setForm((f) => ({ ...f, pharmacyIds: [...f.pharmacyIds, p.id], pharmacySearch: '' }));
                    }
                  }}
                  className="flex w-full items-start gap-2 rounded-xl border border-[#D6F0E8] px-3 py-2 text-left hover:bg-[#EDF7F3]"
                >
                  <div>
                    <p className="text-sm font-medium text-[#0D4035]">{p.name}</p>
                    <p className="text-xs text-[#94A3B8]">{p.region}</p>
                  </div>
                </button>
              ))}
              {form.pharmacyIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.pharmacyIds.map((id) => (
                    <span key={id} className="flex items-center gap-1 rounded-full bg-[#D6F0E8] px-2.5 py-0.5 text-xs text-[#0D4035]">
                      {id.slice(-8)}
                      <button onClick={() => setForm((f) => ({ ...f, pharmacyIds: f.pharmacyIds.filter((x) => x !== id) }))} className="ml-0.5 text-[#64748B] hover:text-red-600">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className={labelCls.replace('mb-1 ', '')}>Message</label>
              <span className={`text-xs ${form.body.length > MAX_LEN * 0.9 ? 'text-amber-600' : 'text-[#94A3B8]'}`}>
                {form.body.length}/{MAX_LEN}
              </span>
            </div>
            <textarea
              rows={5}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value.slice(0, MAX_LEN) }))}
              className={`${inputCls} resize-none`}
              placeholder="Write your message to pharmacy owners…"
            />
          </div>

          {/* Preview */}
          {form.body.trim() && filterOk && !confirmed && (
            <div className="rounded-xl border border-[#D6F0E8] bg-[#F8FAFC] p-3 space-y-2">
              <p className="text-xs font-semibold text-[#0D4035]">Preview</p>
              <p className="text-sm text-[#475569]">{form.body}</p>
              <p className="text-xs text-[#94A3B8]">Recipients: <strong>{FILTER_LABELS[form.filterType]}{form.filterValue ? ` — ${form.filterValue}` : ''}</strong></p>
              <button
                onClick={() => setConfirmed(true)}
                className="w-full rounded-xl bg-[#1A6B5C] py-2 text-sm font-semibold text-white hover:bg-[#145748]"
              >
                Confirm and send
              </button>
            </div>
          )}

          {confirmed && (
            <div className="space-y-2">
              <p className="rounded-xl border border-[#AFDFD3] bg-[#EDF7F3] px-3 py-2 text-xs font-semibold text-[#1A6B5C]">
                ✓ Ready to send — click Send below
              </p>
              <button
                onClick={() => sendMutation.mutate()}
                disabled={!canSend || sendMutation.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A6B5C] py-2 text-sm font-semibold text-white hover:bg-[#145748] disabled:opacity-40"
              >
                <Send size={14} />
                {sendMutation.isPending ? 'Sending…' : 'Send message'}
              </button>
              <button onClick={() => setConfirmed(false)} className="w-full text-xs text-[#94A3B8] hover:text-[#64748B]">
                Edit message
              </button>
            </div>
          )}

          {!confirmed && form.body.trim() && filterOk && (
            <button
              onClick={handlePreview}
              className="w-full rounded-xl border border-[#D6F0E8] py-2 text-sm font-medium text-[#0D4035] hover:bg-[#F8FAFC]"
            >
              Preview before sending
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
