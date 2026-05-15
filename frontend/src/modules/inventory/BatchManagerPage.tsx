import React, { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { differenceInDays, format } from 'date-fns';
import { ArrowLeft, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import type { Batch } from '@/types';

function expiryBadge(days: number): { variant: 'danger' | 'warning' | 'success'; label: string } {
  if (days <= 0) return { variant: 'danger', label: 'EXPIRED' };
  if (days <= 7) return { variant: 'danger', label: `${days}d left` };
  if (days <= 30) return { variant: 'warning', label: `${days}d left` };
  return { variant: 'success', label: `${days}d left` };
}

type BatchManagerRowProps = {
  batch: Batch;
};

const BatchManagerRow = React.memo(function BatchManagerRow({ batch }: BatchManagerRowProps) {
  const days = differenceInDays(new Date(batch.expiryDate), new Date());
  const { variant, label } = expiryBadge(days);

  return (
    <tr className="hover:bg-[#EDF7F3]">
      <td className="px-5 py-3">
        <p className="text-sm font-medium text-[#0D4035]">{batch.product?.genericName || batch.product?.name || '-'}</p>
        {batch.product?.brandName && <p className="text-xs text-[#64748B]">{batch.product.brandName}</p>}
      </td>
      <td className="px-5 py-3 text-sm font-mono text-[#0D4035]">{batch.batchNumber}</td>
      <td className="px-5 py-3 text-sm text-[#0D4035]">{format(new Date(batch.expiryDate), 'dd MMM yyyy')}</td>
      <td className="px-5 py-3 text-sm font-bold text-[#0D4035]">{batch.quantityRemaining.toLocaleString()}</td>
      <td className="px-5 py-3 text-sm text-[#64748B]">Tsh {(batch.purchasePrice || 0).toLocaleString()}</td>
      <td className="px-5 py-3">
        <Badge variant={variant} size="sm">{label}</Badge>
      </td>
    </tr>
  );
});

export const BatchManagerPage: React.FC = () => {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: () => api.get('/inventory/batches').then(r => r.data),
  });

  const rawBatches: Batch[] = useMemo(() => data?.data || [], [data?.data]);
  const batches = useMemo(() => {
    if (!search) return rawBatches;

    const q = search.toLowerCase();
    return rawBatches.filter((batch) => (
      batch.batchNumber?.toLowerCase().includes(q) ||
      batch.product?.name?.toLowerCase().includes(q) ||
      batch.product?.genericName?.toLowerCase().includes(q)
    ));
  }, [rawBatches, search]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/inventory" className="p-2 rounded-xl hover:bg-[#D6F0E8] text-[#64748B] transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-[#0D4035] flex-1">Batch Manager</h1>
      </div>

      <Card>
        <Input
          placeholder="Search by batch number or product name..."
          value={search}
          onChange={handleSearchChange}
          leftIcon={<Search size={16} />}
        />
      </Card>

      <Card padding={false}>
        {isLoading ? (
          <div className="p-8 text-center text-[#64748B]">Loading batches...</div>
        ) : batches.length === 0 ? (
          <div className="p-8 text-center text-[#64748B]">No batches found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#D6F0E8]">
                  {['Product', 'Batch No.', 'Expiry Date', 'Qty Remaining', 'Purchase Price', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6F0E8]">
                {batches.map(batch => (
                  <BatchManagerRow key={batch.id} batch={batch} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
