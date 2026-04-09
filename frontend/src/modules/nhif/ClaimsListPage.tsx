import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import type { NhifClaimStatus } from '@/types';

const STATUS_TABS: Array<NhifClaimStatus | 'ALL'> = ['ALL', 'DRAFT', 'SCRUBBED', 'SUBMITTED', 'APPROVED', 'REJECTED'];
const statusColors: Record<string, 'success' | 'warning' | 'danger' | 'muted' | 'info'> = {
  DRAFT: 'muted', SCRUBBED: 'info', SUBMITTED: 'warning', APPROVED: 'success', REJECTED: 'danger', RESUBMITTED: 'warning',
};

export const ClaimsListPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<NhifClaimStatus | 'ALL'>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['nhif-claims', statusFilter],
    queryFn: () => api.get('/nhif/claims', { params: { ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}), limit: 50 } }).then(r => r.data),
  });

  const claims = data?.data || [];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#0D4035]">NHIF Claims</h1>

      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${statusFilter === s ? 'bg-[#1A6B5C] text-white border-[#1A6B5C]' : 'bg-white text-[#64748B] border-[#D6F0E8] hover:bg-[#EDF7F3]'}`}>
            {s}
          </button>
        ))}
      </div>

      <Card padding={false}>
        {isLoading ? (
          <div className="p-8 text-center text-[#64748B]">Loading claims...</div>
        ) : claims.length === 0 ? (
          <div className="p-8 text-center text-[#64748B]">No claims found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#D6F0E8]">
                  {['Date', 'Patient', 'ICD-10', 'Drug Code', 'Amount (TZS)', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6F0E8]">
                {claims.map((c: any) => (
                  <tr key={c.id} className="hover:bg-[#EDF7F3]">
                    <td className="px-5 py-3 text-sm text-[#64748B]">{format(new Date(c.createdAt), 'dd MMM yyyy')}</td>
                    <td className="px-5 py-3 text-xs font-mono text-[#64748B]">{c.patientId?.slice(0, 8)}...</td>
                    <td className="px-5 py-3 text-sm text-[#0D4035]">{c.icdCode}</td>
                    <td className="px-5 py-3 text-sm text-[#64748B]">{c.drugCode || '—'}</td>
                    <td className="px-5 py-3 text-sm font-medium text-[#0D4035]">{(c.claimedAmount || 0).toLocaleString()}</td>
                    <td className="px-5 py-3"><Badge variant={statusColors[c.status] || 'muted'} size="sm">{c.status}</Badge></td>
                    <td className="px-5 py-3">
                      <Link to={`/nhif/claims/${c.id}`} className="text-xs text-[#1A6B5C] hover:underline">View</Link>
                    </td>
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
