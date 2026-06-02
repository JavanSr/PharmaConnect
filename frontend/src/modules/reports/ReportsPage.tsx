import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, FileText, Package, TrendingUp, AlertTriangle, RotateCcw, CreditCard, ShieldCheck, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { useAuthStore } from '@/stores/authStore';

const Tsh = (v: number) => `Tsh ${Number(v ?? 0).toLocaleString('en-TZ', { maximumFractionDigits: 0 })}`;

const URGENCY_COLOUR: Record<string, string> = {
  CRITICAL: '#DC2626', URGENT: '#EA580C', WARNING: '#D97706',
  CAUTION: '#2563EB', INFO: '#16A34A', EXPIRED: '#7F1D1D', MONITOR: '#94A3B8',
};

const PAYMENT_COLOURS = ['#1A6B5C', '#D97706', '#2563EB', '#7C3AED', '#94A3B8'];

function DateRange({ from, to, onChange }: { from: string; to: string; onChange: (f: string, t: string) => void }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <input type="date" value={from} max={to}
        className="rounded-lg border border-[#D6F0E8] px-3 py-1.5 text-sm text-[#0D4035]"
        onChange={e => onChange(e.target.value, to)} />
      <span className="text-[#94A3B8]">to</span>
      <input type="date" value={to} min={from}
        className="rounded-lg border border-[#D6F0E8] px-3 py-1.5 text-sm text-[#0D4035]"
        onChange={e => onChange(from, e.target.value)} />
    </div>
  );
}

function ExportBar({ endpoint, params }: { endpoint: string; params: Record<string, string> }) {
  const download = (format: string) => {
    const q = new URLSearchParams({ ...params, format });
    window.open(`/api/v1${endpoint}?${q}`, '_blank');
  };
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => download('csv')}
        className="flex items-center gap-1.5 rounded-full border border-[#D6F0E8] px-3 py-1.5 text-xs font-medium text-[#1A6B5C] hover:bg-[#EDF7F3]">
        <Download size={12} /> CSV
      </button>
      <button onClick={() => download('pdf')}
        className="flex items-center gap-1.5 rounded-full border border-[#D6F0E8] px-3 py-1.5 text-xs font-medium text-[#1A6B5C] hover:bg-[#EDF7F3]">
        <FileText size={12} /> PDF
      </button>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, endpoint, params }: {
  icon: React.ReactNode; title: string; subtitle?: string;
  endpoint?: string; params?: Record<string, string>;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDF7F3] text-[#1A6B5C]">{icon}</span>
        <div>
          <h2 className="text-sm font-bold text-[#0D4035]">{title}</h2>
          {subtitle && <p className="text-xs text-[#64748B]">{subtitle}</p>}
        </div>
      </div>
      {endpoint && params && <ExportBar endpoint={endpoint} params={params} />}
    </div>
  );
}

function Loader() {
  return <div className="flex h-32 items-center justify-center"><div className="h-7 w-7 animate-spin rounded-full border-4 border-[#1A6B5C] border-t-transparent" /></div>;
}

// ── Expiry Report ─────────────────────────────────────────────────────────────

function ExpiryReport() {
  const [threshold, setThreshold] = useState('30');
  const { data, isLoading } = useQuery({
    queryKey: ['report-expiry', threshold],
    queryFn: () => api.get(`/reports/expiry?threshold=${threshold}`).then(r => r.data.data),
    staleTime: 60_000,
  });

  const thresholds = [
    { label: '1 day', value: '1', urgency: 'CRITICAL' },
    { label: '7 days', value: '7', urgency: 'URGENT' },
    { label: '14 days', value: '14', urgency: 'WARNING' },
    { label: '21 days', value: '21', urgency: 'CAUTION' },
    { label: '30 days', value: '30', urgency: 'INFO' },
    { label: '90 days', value: '90', urgency: 'MONITOR' },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader icon={<AlertTriangle size={16} />} title="Expiry Report"
        subtitle="Batches expiring within the selected threshold — urgency-coded"
        endpoint="/reports/expiry" params={{ threshold }} />
      <div className="flex flex-wrap gap-2">
        {thresholds.map(t => (
          <button key={t.value} onClick={() => setThreshold(t.value)}
            className="rounded-full px-3 py-1.5 text-xs font-semibold border transition-all"
            style={{
              background: threshold === t.value ? URGENCY_COLOUR[t.urgency] : 'white',
              color: threshold === t.value ? 'white' : URGENCY_COLOUR[t.urgency],
              borderColor: URGENCY_COLOUR[t.urgency],
            }}>
            {t.label}
          </button>
        ))}
      </div>
      {isLoading && <Loader />}
      {data && (
        <>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.byThreshold ?? {}).map(([urg, count]) => (
              <span key={urg} className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ background: URGENCY_COLOUR[urg] ?? '#94A3B8' }}>
                {urg}: {count as number}
              </span>
            ))}
          </div>
          {(data.batches?.length ?? 0) === 0
            ? <div className="rounded-xl border border-[#D6F0E8] p-6 text-center text-sm text-[#64748B]">No batches expiring within {threshold} days.</div>
            : (
              <div className="overflow-auto rounded-xl border border-[#D6F0E8]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#D6F0E8] bg-[#F7FBF8]">
                      {['Product', 'Batch', 'Qty', 'Expiry', 'Days', 'Urgency'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[#64748B]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.batches.map((b: any, i: number) => (
                      <tr key={i} className="border-b border-[#F0F7F4] last:border-0">
                        <td className="px-4 py-3 font-medium text-[#0D4035]">{b.productName}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{b.batchNumber}</td>
                        <td className="px-4 py-3">{b.quantityRemaining}</td>
                        <td className="px-4 py-3">{b.expiryDate}</td>
                        <td className="px-4 py-3 font-semibold" style={{ color: URGENCY_COLOUR[b.urgency] }}>
                          {b.daysUntilExpiry < 0 ? 'EXPIRED' : `${b.daysUntilExpiry}d`}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                            style={{ background: URGENCY_COLOUR[b.urgency] ?? '#94A3B8' }}>
                            {b.urgency}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </>
      )}
    </div>
  );
}

// ── Dispensing Report ─────────────────────────────────────────────────────────

function DispensingReport() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const { data, isLoading } = useQuery({
    queryKey: ['report-dispensing', from, to],
    queryFn: () => api.get(`/reports/dispensing?from=${from}&to=${to}`).then(r => r.data.data),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-4">
      <SectionHeader icon={<TrendingUp size={16} />} title="Dispensing Report"
        subtitle="Top products by volume and revenue" endpoint="/reports/dispensing" params={{ from, to }} />
      <DateRange from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      {isLoading && <Loader />}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[#D6F0E8] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">Total revenue</p>
              <p className="mt-2 text-2xl font-bold text-[#0D4035]">{Tsh(data.totalRevenue)}</p>
            </div>
            <div className="rounded-2xl border border-[#D6F0E8] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">Transactions</p>
              <p className="mt-2 text-2xl font-bold text-[#0D4035]">{(data.totalTransactions ?? 0).toLocaleString()}</p>
            </div>
          </div>
          {(data.lines?.length ?? 0) > 0 && (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.lines.slice(0, 15)} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="productName" width={170} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => Tsh(Number(v))} />
                  <Bar dataKey="totalRevenue" fill="#1A6B5C" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="overflow-auto rounded-xl border border-[#D6F0E8]">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-[#D6F0E8] bg-[#F7FBF8]">
                    {['#', 'Product', 'Units', 'Revenue', 'Txns'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[#64748B]">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {data.lines.map((r: any, i: number) => (
                      <tr key={i} className="border-b border-[#F0F7F4] last:border-0">
                        <td className="px-4 py-2.5 text-[#94A3B8]">{i + 1}</td>
                        <td className="px-4 py-2.5 font-medium text-[#0D4035]">{r.productName}</td>
                        <td className="px-4 py-2.5">{(r.totalUnits ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-2.5 font-semibold text-[#1A6B5C]">{Tsh(r.totalRevenue)}</td>
                        <td className="px-4 py-2.5">{r.transactionCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Payment Breakdown ─────────────────────────────────────────────────────────

function PaymentBreakdown() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const { data, isLoading } = useQuery({
    queryKey: ['report-payment', from, to],
    queryFn: () => api.get(`/reports/payment-breakdown?from=${from}&to=${to}`).then(r => r.data.data),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-4">
      <SectionHeader icon={<CreditCard size={16} />} title="Payment Method Breakdown"
        subtitle="Revenue split by Cash, M-Pesa, NHIF" />
      <DateRange from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      {isLoading && <Loader />}
      {(data?.breakdown?.length ?? 0) > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.breakdown} dataKey="totalRevenue" nameKey="paymentMethod" cx="50%" cy="50%" outerRadius={80}>
                {data.breakdown.map((_: any, i: number) => <Cell key={i} fill={PAYMENT_COLOURS[i % PAYMENT_COLOURS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => Tsh(Number(v))} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {data.breakdown.map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-[#D6F0E8] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: PAYMENT_COLOURS[i % PAYMENT_COLOURS.length] }} />
                  <span className="text-sm font-medium text-[#0D4035]">{r.paymentMethod}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#0D4035]">{Tsh(r.totalRevenue)}</p>
                  <p className="text-xs text-[#64748B]">{r.percentage}% · {r.transactionCount} txns</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stock Movement ────────────────────────────────────────────────────────────

function StockMovementReport() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const { data, isLoading } = useQuery({
    queryKey: ['report-stock-movement', from, to],
    queryFn: () => api.get(`/reports/stock-movement?from=${from}&to=${to}`).then(r => r.data.data),
    staleTime: 60_000,
  });
  const TYPE_COLOUR: Record<string, string> = {
    RECEIVED: '#16A34A', DISPENSED: '#1A6B5C', ADJUSTED: '#D97706',
    DAMAGED: '#DC2626', EXPIRED_REMOVED: '#7F1D1D', OTHER: '#94A3B8',
  };

  return (
    <div className="space-y-4">
      <SectionHeader icon={<Package size={16} />} title="Stock Movement"
        subtitle="Receipts, dispensing, adjustments and write-offs"
        endpoint="/reports/stock-movement" params={{ from, to }} />
      <DateRange from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      {isLoading && <Loader />}
      {data && (
        <>
          {data.summary && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.summary).map(([type, qty]) => (
                <span key={type} className="rounded-full px-3 py-1.5 text-xs font-semibold text-white"
                  style={{ background: TYPE_COLOUR[type] ?? '#94A3B8' }}>
                  {type}: {qty as number}
                </span>
              ))}
            </div>
          )}
          {(data.lines?.length ?? 0) > 0 && (
            <div className="overflow-auto rounded-xl border border-[#D6F0E8] max-h-96">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#F7FBF8]">
                  <tr className="border-b border-[#D6F0E8]">
                    {['Product', 'Type', 'Qty', 'Staff', 'Notes', 'Date'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[#64748B]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map((r: any, i: number) => (
                    <tr key={i} className="border-b border-[#F0F7F4] last:border-0">
                      <td className="px-4 py-2.5 font-medium text-[#0D4035]">{r.productName}</td>
                      <td className="px-4 py-2.5">
                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                          style={{ background: TYPE_COLOUR[r.movementType] ?? '#94A3B8' }}>
                          {r.movementType}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">{r.quantity}</td>
                      <td className="px-4 py-2.5 text-xs text-[#64748B]">{r.staffName ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-[#64748B] max-w-[140px] truncate">{r.notes ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-[#94A3B8]">{new Date(r.createdAt).toLocaleDateString('en-GB')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Voids and Returns ─────────────────────────────────────────────────────────

function VoidsReport() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const { data, isLoading } = useQuery({
    queryKey: ['report-voids', from, to],
    queryFn: () => api.get(`/reports/voids-returns?from=${from}&to=${to}`).then(r => r.data.data),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-4">
      <SectionHeader icon={<RotateCcw size={16} />} title="Voids & Returns"
        subtitle="All voided transactions with reason and responsible staff"
        endpoint="/reports/voids-returns" params={{ from, to }} />
      <DateRange from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      {isLoading && <Loader />}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[#D6F0E8] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">Total voided</p>
              <p className="mt-2 text-2xl font-bold text-[#0D4035]">{data.totalVoided}</p>
            </div>
            <div className="rounded-2xl border border-[#D6F0E8] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">Total value</p>
              <p className="mt-2 text-2xl font-bold text-red-600">{Tsh(data.totalValue)}</p>
            </div>
          </div>
          {(data.lines?.length ?? 0) === 0
            ? <div className="rounded-xl border border-[#D6F0E8] p-6 text-center text-sm text-[#64748B]">No voids in this period.</div>
            : (
              <div className="overflow-auto rounded-xl border border-[#D6F0E8]">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-[#D6F0E8] bg-[#F7FBF8]">
                    {['Reference', 'Amount', 'Reason', 'Voided by', 'Date'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[#64748B]">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {data.lines.map((r: any, i: number) => (
                      <tr key={i} className="border-b border-[#F0F7F4] last:border-0">
                        <td className="px-4 py-2.5 font-mono text-xs text-[#64748B]">{r.referenceNumber}</td>
                        <td className="px-4 py-2.5 font-semibold text-red-600">{Tsh(r.totalAmount)}</td>
                        <td className="px-4 py-2.5">{r.voidReason ?? '—'}</td>
                        <td className="px-4 py-2.5 text-[#64748B]">{r.voidedBy ?? '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-[#94A3B8]">{new Date(r.voidedAt).toLocaleDateString('en-GB')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </>
      )}
    </div>
  );
}

// ── Safety Impact ─────────────────────────────────────────────────────────────

function SafetyReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['report-safety'],
    queryFn: () => api.get('/reports/safety-impact').then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="space-y-4">
      <SectionHeader icon={<ShieldCheck size={16} />} title="Safety Impact"
        subtitle="Drug interaction alerts, overrides and allergy flags — last 30 days" />
      {isLoading && <Loader />}
      {data && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total alerts', value: data.total ?? 0 },
            { label: 'Overrides', value: data.byAction?.find((a: any) => a.key === 'OVERRIDE_ENTERED')?.count ?? 0 },
            { label: 'Allergy flags', value: data.contextFlags?.allergy ?? 0 },
            { label: 'Contraindicated', value: data.bySeverity?.find((s: any) => s.key === 'CONTRAINDICATED')?.count ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl border border-[#D6F0E8] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">{label}</p>
              <p className="mt-2 text-2xl font-bold text-[#0D4035]">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Wholesale Reports ─────────────────────────────────────────────────────────

function WholesaleReports() {
  const { data: demandData, isLoading: dl } = useQuery({
    queryKey: ['wholesale-report-demand'],
    queryFn: () => api.get('/b2b/demand-insights').then(r => r.data.data),
    staleTime: 5 * 60_000,
  });
  const { data: agingData, isLoading: al } = useQuery({
    queryKey: ['wholesale-report-aging'],
    queryFn: () => api.get('/b2b/receivables-aging').then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  const demand = demandData;
  const aging = agingData;

  return (
    <div className="space-y-8">
      <div>
        <SectionHeader icon={<Building2 size={16} />} title="Wholesale Performance"
          subtitle="Order volume, revenue and fulfillment — last 30 days vs previous 30 days" />
        {(dl || al) && <Loader />}
        {demand && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Revenue (30d)', value: Tsh(demand.revenueThisPeriod ?? 0) },
              { label: 'Orders (30d)', value: (demand.ordersThisPeriod ?? 0).toLocaleString() },
              { label: 'Fulfillment rate', value: `${demand.fulfillmentRate ?? 0}%` },
              { label: 'Outstanding', value: Tsh(aging?.totalOutstanding ?? 0) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-[#D6F0E8] bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">{label}</p>
                <p className="mt-2 text-2xl font-bold text-[#0D4035]">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {(demand?.topProducts?.length ?? 0) > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold text-[#0D4035]">Top products by revenue</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={demand.topProducts.slice(0, 10)} layout="vertical" margin={{ left: 8, right: 24 }}>
              <XAxis type="number" tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="productName" width={160} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => Tsh(Number(v))} />
              <Bar dataKey="totalRevenue" fill="#1A6B5C" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {(aging?.buckets?.length ?? 0) > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold text-[#0D4035]">Receivables aging</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {aging.buckets.map((b: any) => (
              <div key={b.label} className="rounded-xl border border-[#E2EDE8] bg-white p-4">
                <p className="text-xs font-semibold text-[#64748B]">{b.label}</p>
                <p className="mt-1 text-lg font-bold text-[#0D4035]">{Tsh(b.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'expiry',     label: 'Expiry',         icon: <AlertTriangle size={14} /> },
  { id: 'dispensing', label: 'Dispensing',      icon: <TrendingUp size={14} /> },
  { id: 'payment',    label: 'Payments',        icon: <CreditCard size={14} /> },
  { id: 'stock',      label: 'Stock movement',  icon: <Package size={14} /> },
  { id: 'voids',      label: 'Voids & returns', icon: <RotateCcw size={14} /> },
  { id: 'safety',     label: 'Safety',          icon: <ShieldCheck size={14} /> },
];

export const ReportsPage: React.FC = () => {
  const pharmacy = usePharmacyStore(s => s.pharmacy);
  const [tab, setTab] = useState('expiry');
  const isWholesale = pharmacy?.pharmacyType === 'WHOLESALE';

  if (isWholesale) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-[#0D4035]">Reports</h1>
          <p className="mt-1 text-sm text-[#64748B]">Wholesale performance, receivables and demand.</p>
        </div>
        <div className="rounded-2xl border border-[#D6F0E8] bg-white p-6">
          <WholesaleReports />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#0D4035]">Reports</h1>
        <p className="mt-1 text-sm text-[#64748B]">Sales, inventory, safety and compliance — exportable as CSV or PDF.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#E2EDE8] pb-3">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-[#0D4035] text-white' : 'border border-[#E2EDE8] text-[#64748B] hover:bg-[#EDF7F3] hover:text-[#0D4035]'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-[#D6F0E8] bg-white p-6">
        {tab === 'expiry'     && <ExpiryReport />}
        {tab === 'dispensing' && <DispensingReport />}
        {tab === 'payment'    && <PaymentBreakdown />}
        {tab === 'stock'      && <StockMovementReport />}
        {tab === 'voids'      && <VoidsReport />}
        {tab === 'safety'     && <SafetyReport />}
      </div>
    </div>
  );
};
