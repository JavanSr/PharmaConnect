import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import type { ComplianceStatus } from '@/types';

const STATUS_TABS: Array<ComplianceStatus | 'ALL'> = ['ALL', 'GREEN', 'AMBER', 'RED', 'EXPIRED'];
const statusColor: Record<string, 'success' | 'warning' | 'danger' | 'muted'> = {
  GREEN: 'success', AMBER: 'warning', RED: 'danger', EXPIRED: 'muted',
};

export const ComplianceListPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<ComplianceStatus | 'ALL'>('ALL');
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['compliance-items', statusFilter],
    queryFn: () => api.get('/compliance/items', { params: statusFilter !== 'ALL' ? { status: statusFilter } : {} }).then(r => r.data),
  });

  const items = data?.data || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#0D4035]">Compliance Items</h1>
        <Button leftIcon={<Plus size={16} />} onClick={() => navigate('/compliance/items/new')}>Add Item</Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              statusFilter === s ? 'bg-[#1A6B5C] text-white border-[#1A6B5C]' : 'bg-white text-[#64748B] border-[#D6F0E8] hover:bg-[#EDF7F3]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <Card padding={false}>
        {isLoading ? (
          <div className="p-8 text-center text-[#64748B]">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-[#64748B]">No compliance items found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#D6F0E8]">
                  {['Type', 'Name', 'Issuing Body', 'Expiry Date', 'Days Left', 'Status', 'Docs'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6F0E8]">
                {items.map((item: any) => {
                  const days = differenceInDays(new Date(item.expiryDate), new Date());
                  return (
                    <tr key={item.id} className="hover:bg-[#EDF7F3] cursor-pointer" onClick={() => {}}>
                      <td className="px-5 py-3">
                        <Badge variant="muted" size="sm">{item.type.replace(/_/g, ' ')}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Link to={`/compliance/items/${item.id}`} className="text-sm font-medium text-[#1A6B5C] hover:underline">{item.name}</Link>
                      </td>
                      <td className="px-5 py-3 text-sm text-[#64748B]">{item.issuingBody}</td>
                      <td className="px-5 py-3 text-sm text-[#0D4035]">{format(new Date(item.expiryDate), 'dd MMM yyyy')}</td>
                      <td className="px-5 py-3 text-sm font-medium text-[#0D4035]">{days <= 0 ? 'Expired' : `${days}d`}</td>
                      <td className="px-5 py-3">
                        <Badge variant={statusColor[item.status]} size="sm">{item.status}</Badge>
                      </td>
                      <td className="px-5 py-3 text-sm text-[#64748B]">{item._count?.documents ?? item.documents?.length ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
