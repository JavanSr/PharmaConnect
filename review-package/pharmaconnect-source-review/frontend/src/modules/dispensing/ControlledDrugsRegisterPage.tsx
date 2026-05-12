import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { ControlledRegisterEntry } from '@/types';

export const ControlledDrugsRegisterPage: React.FC = () => {
  const registerQuery = useQuery({
    queryKey: ['controlled-drugs-register'],
    queryFn: () => api.get('/dispensing/controlled-register').then((response) => response.data.data as ControlledRegisterEntry[]),
  });

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-[linear-gradient(135deg,#3A1B0A_0%,#8A3D12_55%,#F9E2D3_180%)] text-white" padding={false} shadow="md">
        <div className="grid gap-4 px-5 py-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              <ShieldAlert size={14} />
              Controlled drugs register
            </div>
            <h1 className="text-3xl font-semibold">Auditable log for controlled and narcotic dispensings.</h1>
            <p className="max-w-2xl text-sm text-white/80">
              This register is generated from completed dispensing events and highlights every controlled or narcotic line with the responsible user, batch, and timestamp.
            </p>
          </div>
          <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur">
            <p className="text-sm font-semibold">Why it matters</p>
            <div className="mt-3 grid gap-2 text-sm text-white/80">
              <span>Batch-level traceability</span>
              <span>User-level accountability</span>
              <span>Fast inspection-ready lookup</span>
            </div>
          </div>
        </div>
      </Card>

      <Card header={<h2 className="text-lg font-semibold text-[#0D4035]">Register entries</h2>} padding={false}>
        {(registerQuery.data?.length ?? 0) === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B]">No controlled-drug dispensings recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px]">
              <thead>
                <tr className="border-b border-[#D6F0E8]">
                  {['Reference', 'Medicine', 'Class', 'Quantity', 'Batch', 'Dispensed by', 'When', 'Payment'].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6F0E8]">
                {(registerQuery.data ?? []).map((entry) => (
                  <tr key={`${entry.eventId}-${entry.productId}-${entry.batchNumber ?? 'none'}`}>
                    <td className="px-4 py-3 text-sm font-medium text-[#0D4035]">{entry.referenceNumber}</td>
                    <td className="px-4 py-3 text-sm text-[#0D4035]">{entry.productName}</td>
                    <td className="px-4 py-3">
                      <Badge variant={entry.drugClass === 'NARCOTIC' ? 'danger' : 'warning'} size="sm">
                        {entry.drugClass}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#0D4035]">{entry.quantity}</td>
                    <td className="px-4 py-3 text-sm text-[#64748B]">{entry.batchNumber ?? 'Untracked'}</td>
                    <td className="px-4 py-3 text-sm text-[#64748B]">{entry.dispensedByName}</td>
                    <td className="px-4 py-3 text-sm text-[#64748B]">{new Date(entry.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-[#64748B]">{entry.paymentMethod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
