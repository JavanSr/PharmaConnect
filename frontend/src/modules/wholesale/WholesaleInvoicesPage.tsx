import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import type { VatInvoice } from '@/types';
import { WholesaleShell } from './WholesaleShell';

const EFDMS_STYLE: Record<string, string> = {
  STUBBED: 'bg-amber-50 text-amber-700',
  PENDING: 'bg-amber-50 text-amber-700',
  SENT: 'bg-blue-50 text-blue-700',
  CONFIRMED: 'bg-[#EDF7F3] text-[#1A6B5C]',
  FAILED: 'bg-red-50 text-red-700',
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-TZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const WholesaleInvoicesPage: React.FC = () => {
  const [search, setSearch] = React.useState('');

  const invoicesQuery = useQuery({
    queryKey: ['wholesale-invoices'],
    queryFn: () => api.get('/b2b/invoices').then((r) => r.data.data as VatInvoice[]),
  });

  const invoices = invoicesQuery.data ?? [];

  const filtered = search.trim()
    ? invoices.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
          inv.efdmsReference?.toLowerCase().includes(search.toLowerCase()),
      )
    : invoices;

  const totalIssued = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalVat = invoices.reduce((sum, inv) => sum + inv.vatAmount, 0);

  return (
    <WholesaleShell>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-[#0D4035]">VAT Invoices</h1>
          {invoicesQuery.isFetching && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A6B5C] border-t-transparent" />
          )}
        </div>

        {/* Summary cards */}
        {invoices.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#D6F0E8] bg-[#F7FCFA] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">Total invoices</p>
              <p className="mt-2 text-2xl font-semibold text-[#0D4035]">{invoices.length}</p>
            </div>
            <div className="rounded-2xl border border-[#D6F0E8] bg-[#F7FCFA] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">Total invoiced</p>
              <p className="mt-2 text-2xl font-semibold text-[#0D4035]">Tsh {totalIssued.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-[#D6F0E8] bg-[#F7FCFA] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">Total VAT collected</p>
              <p className="mt-2 text-2xl font-semibold text-[#0D4035]">Tsh {totalVat.toLocaleString()}</p>
            </div>
          </div>
        )}

        <Card
          header={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-[#0D4035]">Invoice register</h2>
              <input
                type="search"
                placeholder="Search invoice number…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl border border-[#D6F0E8] bg-white px-3 py-1.5 text-sm text-[#0D4035] placeholder-[#94A3B8] outline-none focus:border-[#1A6B5C] focus:ring-1 focus:ring-[#1A6B5C]"
              />
            </div>
          }
        >
          {invoicesQuery.isLoading && (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#1A6B5C] border-t-transparent" />
            </div>
          )}

          {!invoicesQuery.isLoading && filtered.length === 0 && (
            <div className="py-10 text-center">
              <FileText size={32} className="mx-auto text-[#AFDFD3]" />
              <p className="mt-3 text-sm font-medium text-[#0D4035]">
                {search ? 'No invoices match that search' : 'No VAT invoices yet'}
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                {search ? 'Try a different search term.' : 'Invoices are generated automatically when an order is confirmed.'}
              </p>
            </div>
          )}

          {filtered.length > 0 && (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#D6F0E8] text-left text-xs font-semibold uppercase tracking-[0.15em] text-[#64748B]">
                      <th className="pb-2 pr-4">Invoice</th>
                      <th className="pb-2 pr-4">Order ref</th>
                      <th className="pb-2 pr-4 text-right">Subtotal</th>
                      <th className="pb-2 pr-4 text-right">VAT</th>
                      <th className="pb-2 pr-4 text-right">Total</th>
                      <th className="pb-2 pr-4">EFDMS</th>
                      <th className="pb-2">Issued</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D6F0E8]">
                    {filtered.map((inv) => (
                      <tr key={inv.id} className="group hover:bg-[#F7FCFA]">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-[#0D4035]">{inv.invoiceNumber}</p>
                            {inv.pdfPath && (
                              <a
                                href={`/api/v1${inv.pdfPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#94A3B8] hover:text-[#1A6B5C]"
                                title="Download PDF"
                              >
                                <Download size={13} />
                              </a>
                            )}
                          </div>
                          {inv.efdmsReference && (
                            <p className="text-xs text-[#94A3B8]">{inv.efdmsReference}</p>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-[#64748B]">{inv.orderId.slice(-8)}</td>
                        <td className="py-3 pr-4 text-right text-[#64748B]">Tsh {inv.subtotalAmount.toLocaleString()}</td>
                        <td className="py-3 pr-4 text-right text-[#64748B]">Tsh {inv.vatAmount.toLocaleString()}</td>
                        <td className="py-3 pr-4 text-right font-semibold text-[#0D4035]">Tsh {inv.totalAmount.toLocaleString()}</td>
                        <td className="py-3 pr-4">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${EFDMS_STYLE[inv.efdmsStatus ?? 'STUBBED'] ?? 'bg-slate-50 text-slate-600'}`}>
                            {inv.efdmsStatus ?? 'STUBBED'}
                          </span>
                        </td>
                        <td className="py-3 text-[#64748B]">{fmt(inv.issuedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {filtered.map((inv) => (
                  <div key={inv.id} className="rounded-2xl border border-[#D6F0E8] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[#0D4035]">{inv.invoiceNumber}</p>
                          {inv.pdfPath && (
                            <a href={`/api/v1${inv.pdfPath}`} target="_blank" rel="noopener noreferrer" className="text-[#94A3B8] hover:text-[#1A6B5C]">
                              <Download size={13} />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-[#94A3B8]">Order {inv.orderId.slice(-8)} · {fmt(inv.issuedAt)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${EFDMS_STYLE[inv.efdmsStatus ?? 'STUBBED'] ?? 'bg-slate-50 text-slate-600'}`}>
                        {inv.efdmsStatus ?? 'STUBBED'}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-[#94A3B8]">Subtotal</p>
                        <p className="font-medium text-[#0D4035]">Tsh {inv.subtotalAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#94A3B8]">VAT</p>
                        <p className="font-medium text-[#0D4035]">Tsh {inv.vatAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#94A3B8]">Total</p>
                        <p className="font-semibold text-[#0D4035]">Tsh {inv.totalAmount.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </WholesaleShell>
  );
};
