import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, FileText, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type { WholesalePayment, WholesaleReceivableInvoice, WholesaleReceivablesAging, PaginatedResponse } from '@/types';
import { WholesaleShell } from './WholesaleShell';

const PAYMENT_METHODS = ['CASH', 'MPESA', 'TIGOPESA', 'AIRTEL_MONEY', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'];

const METHOD_STYLE: Record<string, string> = {
  CASH: 'bg-[#EDF7F3] text-[#1A6B5C]',
  MPESA: 'bg-green-50 text-green-700',
  TIGOPESA: 'bg-blue-50 text-blue-700',
  AIRTEL_MONEY: 'bg-red-50 text-red-700',
  BANK_TRANSFER: 'bg-purple-50 text-purple-700',
  CHEQUE: 'bg-amber-50 text-amber-700',
  OTHER: 'bg-[#F1F5F9] text-[#475569]',
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-TZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Record payment form ──────────────────────────────────────────────────────

interface PaymentPrefill {
  buyer: { id: string; name: string };
  invoiceId: string;
  amount: number;
}

const RecordPaymentForm: React.FC<{
  onRecorded: () => void;
  openInvoices: WholesaleReceivableInvoice[];
  prefill?: PaymentPrefill | null;
}> = ({ onRecorded, openInvoices, prefill }) => {
  const toast = useNotificationStore((s) => s.toast);
  const queryClient = useQueryClient();

  const [buyerSearch, setBuyerSearch] = React.useState('');
  const [selectedBuyer, setSelectedBuyer] = React.useState<{ id: string; name: string } | null>(prefill?.buyer ?? null);
  const [invoiceId, setInvoiceId] = React.useState<string>(prefill?.invoiceId ?? '');
  const [amount, setAmount] = React.useState(prefill ? String(prefill.amount) : '');
  const [method, setMethod] = React.useState('CASH');
  const [ref, setRef] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const buyerInvoices = selectedBuyer
    ? openInvoices.filter((inv) => inv.buyerPharmacyId === selectedBuyer.id)
    : [];

  const searchQuery = useQuery({
    queryKey: ['pharmacy-search', buyerSearch],
    queryFn: () =>
      buyerSearch.length >= 2
        ? api.get('/b2b/pharmacies/search', { params: { q: buyerSearch } }).then((r) => r.data.data as Array<{ id: string; name: string; region: string }>)
        : Promise.resolve([]),
    enabled: buyerSearch.length >= 2,
  });

  const recordMutation = useMutation({
    mutationFn: () =>
      api.post('/b2b/payments', {
        buyerPharmacyId: selectedBuyer!.id,
        invoiceId: invoiceId || null,
        amountTzs: parseFloat(amount),
        paymentMethod: method,
        paymentRef: ref.trim() || null,
        notes: notes.trim() || null,
      }).then((r) => r.data.data as WholesalePayment),
    onSuccess: () => {
      toast.success('Payment recorded');
      queryClient.invalidateQueries({ queryKey: ['wholesale-payments'] });
      queryClient.invalidateQueries({ queryKey: ['wholesale-receivables-aging'] });
      setSelectedBuyer(null);
      setBuyerSearch('');
      setInvoiceId('');
      setAmount('');
      setRef('');
      setNotes('');
      onRecorded();
    },
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Could not record payment'),
  });

  const inputCls = 'w-full rounded-xl border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] outline-none focus:border-[#1A6B5C] focus:ring-1 focus:ring-[#1A6B5C]';
  const labelCls = 'mb-1 block text-xs font-medium text-[#64748B]';

  return (
    <Card header={<h2 className="text-base font-semibold text-[#0D4035]">Record payment</h2>}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Buyer pharmacy</label>
          {selectedBuyer ? (
            <div className="flex items-center justify-between rounded-xl border border-[#D6F0E8] bg-[#EDF7F3] px-3 py-2">
              <span className="text-sm font-medium text-[#0D4035]">{selectedBuyer.name}</span>
              <button
                onClick={() => { setSelectedBuyer(null); setBuyerSearch(''); setInvoiceId(''); }}
                className="text-xs text-[#64748B] hover:text-[#0D4035]"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={buyerSearch}
                onChange={(e) => setBuyerSearch(e.target.value)}
                placeholder="Search buyer pharmacy…"
                className={inputCls}
              />
              {buyerSearch.length >= 2 && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-[#D6F0E8] bg-white shadow-lg">
                  {searchQuery.isLoading && (
                    <div className="px-3 py-2 text-xs text-[#94A3B8]">Searching…</div>
                  )}
                  {!searchQuery.isLoading && (searchQuery.data ?? []).length === 0 && (
                    <div className="px-3 py-2 text-xs text-[#94A3B8]">No pharmacies found</div>
                  )}
                  {(searchQuery.data ?? []).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedBuyer({ id: p.id, name: p.name }); setBuyerSearch(''); setInvoiceId(''); }}
                      className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-[#EDF7F3]"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#0D4035]">{p.name}</p>
                        <p className="text-xs text-[#94A3B8]">{p.region}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {selectedBuyer && buyerInvoices.length > 0 && (
          <div>
            <label className={labelCls}>Link to invoice (optional — settles the receivable)</label>
            <select
              value={invoiceId}
              onChange={(e) => {
                const nextId = e.target.value;
                setInvoiceId(nextId);
                const invoice = buyerInvoices.find((inv) => inv.invoiceId === nextId);
                if (invoice && !amount) setAmount(String(invoice.openAmount));
              }}
              className={inputCls}
            >
              <option value="">Not linked to an invoice</option>
              {buyerInvoices.map((inv) => (
                <option key={inv.invoiceId} value={inv.invoiceId}>
                  {inv.invoiceNumber} — Tsh {inv.openAmount.toLocaleString()} open
                  {inv.isOverdue ? ` (${inv.daysOverdue}d overdue)` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Amount (Tsh)</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 150000"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Payment method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Reference / transaction ID (optional)</label>
            <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. MPESA ref" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Notes (optional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes…" className={inputCls} />
          </div>
        </div>

        <Button
          className="w-full"
          onClick={() => recordMutation.mutate()}
          loading={recordMutation.isPending}
          disabled={!selectedBuyer || !amount || parseFloat(amount) <= 0}
        >
          Record payment
        </Button>
      </div>
    </Card>
  );
};

// ─── Payment row ──────────────────────────────────────────────────────────────

const PaymentRow: React.FC<{ payment: WholesalePayment }> = ({ payment }) => (
  <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[#D6F0E8] bg-white p-4">
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${METHOD_STYLE[payment.paymentMethod] ?? METHOD_STYLE.OTHER}`}>
          {payment.paymentMethod.replace('_', ' ')}
        </span>
        {payment.paymentRef && (
          <span className="font-mono text-xs text-[#64748B]">{payment.paymentRef}</span>
        )}
      </div>
      <p className="text-sm font-semibold text-[#0D4035]">
        Tsh {payment.amountTzs.toLocaleString()}
        {payment.buyerName && <span className="ml-1 font-normal text-[#475569]">— {payment.buyerName}</span>}
      </p>
      {payment.notes && <p className="text-xs text-[#64748B]">{payment.notes}</p>}
      <p className="text-xs text-[#94A3B8]">{fmt(payment.createdAt)}</p>
    </div>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export const WholesaleCollectionsPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const isManager = ['OWNER', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'].includes(user?.role ?? '');
  const [showForm, setShowForm] = React.useState(false);
  const [prefill, setPrefill] = React.useState<PaymentPrefill | null>(null);
  const [page, setPage] = React.useState(1);

  const paymentsQuery = useQuery({
    queryKey: ['wholesale-payments', page],
    queryFn: () =>
      api.get('/b2b/payments', { params: { page, limit: 20 } }).then((r) => r.data.data as PaginatedResponse<WholesalePayment>),
  });

  const receivablesQuery = useQuery({
    queryKey: ['wholesale-receivables-aging'],
    queryFn: () => api.get('/b2b/receivables-aging').then((r) => r.data.data as WholesaleReceivablesAging),
    enabled: isManager,
  });

  const openInvoices = receivablesQuery.data?.invoices ?? [];

  const result = paymentsQuery.data;
  const payments = result?.data ?? [];
  const totalPages = result?.totalPages ?? 1;

  return (
    <WholesaleShell>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#0D4035]">Collections</h1>
            <p className="text-sm text-[#64748B]">Payments received from buyer pharmacies</p>
          </div>
          {isManager && (
            <Button size="sm" leftIcon={<Plus size={13} />} onClick={() => { setPrefill(null); setShowForm((s) => !s); }}>
              {showForm ? 'Cancel' : 'Record payment'}
            </Button>
          )}
        </div>

        {showForm && isManager && (
          <RecordPaymentForm
            key={prefill?.invoiceId ?? 'blank'}
            openInvoices={openInvoices}
            prefill={prefill}
            onRecorded={() => { setShowForm(false); setPrefill(null); }}
          />
        )}

        {isManager && openInvoices.length > 0 && (
          <Card header={
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#0D4035]">Open invoices</h2>
              <span className="text-xs text-[#64748B]">
                Tsh {(receivablesQuery.data?.totalOpenAmount ?? 0).toLocaleString()} outstanding
                {(receivablesQuery.data?.overdueCount ?? 0) > 0 && (
                  <span className="ml-1 font-semibold text-red-600">
                    · {receivablesQuery.data!.overdueCount} overdue
                  </span>
                )}
              </span>
            </div>
          }>
            <div className="space-y-2">
              {openInvoices.map((inv) => (
                <div key={inv.invoiceId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D6F0E8] px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText size={14} className="shrink-0 text-[#1A6B5C]" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[#0D4035]">{inv.buyerName}</p>
                      <p className="text-[10px] text-[#94A3B8]">
                        {inv.invoiceNumber} · due {fmt(inv.dueDate)} (net {inv.paymentTermsDays})
                        {inv.isOverdue && (
                          <span className="ml-1 font-semibold text-red-600">· {inv.daysOverdue}d overdue</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-[#0D4035]">Tsh {inv.openAmount.toLocaleString()}</p>
                      {inv.paidAmount > 0 && (
                        <p className="text-[10px] text-[#64748B]">Tsh {inv.paidAmount.toLocaleString()} paid</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setPrefill({
                          buyer: { id: inv.buyerPharmacyId, name: inv.buyerName },
                          invoiceId: inv.invoiceId,
                          amount: inv.openAmount,
                        });
                        setShowForm(true);
                      }}
                    >
                      Record payment
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="space-y-3">
          {paymentsQuery.isLoading && (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#1A6B5C] border-t-transparent" />
            </div>
          )}
          {!paymentsQuery.isLoading && payments.length === 0 && (
            <Card>
              <div className="py-8 text-center">
                <CreditCard size={32} className="mx-auto text-[#AFDFD3]" />
                <p className="mt-3 text-sm font-medium text-[#0D4035]">No payments recorded</p>
                <p className="mt-1 text-xs text-[#64748B]">
                  Record payments as you collect from buyers to track receivables.
                </p>
              </div>
            </Card>
          )}
          {payments.map((p) => (
            <PaymentRow key={p.id} payment={p} />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-full border border-[#D6F0E8] px-4 py-2 text-sm font-medium text-[#475569] hover:bg-[#EDF7F3] disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-[#64748B]">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-full border border-[#D6F0E8] px-4 py-2 text-sm font-medium text-[#475569] hover:bg-[#EDF7F3] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </WholesaleShell>
  );
};
