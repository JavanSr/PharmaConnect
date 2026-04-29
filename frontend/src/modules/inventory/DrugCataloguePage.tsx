import React, { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';

interface DrugMaster {
  id: string;
  tmdaRegistrationNumber: string;
  genericName: string;
  brandName?: string | null;
  manufacturer?: string | null;
  drugClass?: string | null;
  dosageForm?: string | null;
  strength?: string | null;
  unitOfMeasure: string;
  packSize: number;
  storageCondition: 'AMBIENT' | 'REFRIGERATED' | 'FROZEN';
  isColdChain: boolean;
  isEssentialMedicine: boolean;
}

interface CatalogueResponse {
  success: boolean;
  data: DrugMaster[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const storageOptions = [
  { value: '', label: 'All storage' },
  { value: 'AMBIENT', label: 'Ambient' },
  { value: 'REFRIGERATED', label: 'Refrigerated' },
  { value: 'FROZEN', label: 'Frozen' },
];

export const DrugCataloguePage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [storageCondition, setStorageCondition] = useState('');
  const [essentialOnly, setEssentialOnly] = useState(false);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);
  const limit = 25;

  const { data, isLoading, isFetching } = useQuery<CatalogueResponse>({
    queryKey: ['drug-master', debouncedSearch, storageCondition, essentialOnly, page],
    queryFn: () => api.get('/inventory/drug-master', {
      params: {
        q: debouncedSearch || undefined,
        storageCondition: storageCondition || undefined,
        essential: essentialOnly || undefined,
        page,
        limit,
      },
    }).then(r => r.data),
  });

  const drugs = data?.data || [];
  const meta = data?.meta;

  const pageStart = useMemo(() => {
    if (!meta || meta.total === 0) return 0;
    return (meta.page - 1) * meta.limit + 1;
  }, [meta]);

  const pageEnd = useMemo(() => {
    if (!meta) return 0;
    return Math.min(meta.page * meta.limit, meta.total);
  }, [meta]);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setPage(1);
  }, []);

  const handleStorageChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setStorageCondition(event.target.value);
    setPage(1);
  }, []);

  const handleEssentialChange = useCallback(() => {
    setEssentialOnly(value => !value);
    setPage(1);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/inventory" className="p-2 rounded-xl hover:bg-[#D6F0E8] text-[#64748B] transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#0D4035]">Drug Catalogue</h1>
          <p className="text-sm text-[#64748B]">System-wide medicine reference list for cleaner product activation.</p>
        </div>
      </div>

      <Card>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-[#0D4035]">What this is</p>
            <p className="mt-1 text-sm text-[#64748B]">
              A reference catalogue shared by PharmaConnect. It is not your stock list and does not mean the item is available in your pharmacy.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0D4035]">How to use it</p>
            <p className="mt-1 text-sm text-[#64748B]">
              Search generic, brand, manufacturer, or TMDA number, then use matches when creating or receiving products.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0D4035]">Other inventory options</p>
            <p className="mt-1 text-sm text-[#64748B]">
              Use Products for your local items, Receive Stock for batches, Import Catalogue for supplier PDFs, and Conflicts for offline sync review.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px_auto] gap-3">
          <Input
            placeholder="Search by drug name, brand, manufacturer, or MSD/TMDA number..."
            value={search}
            onChange={handleSearchChange}
            leftIcon={<Search size={16} />}
          />
          <Select
            options={storageOptions}
            value={storageCondition}
            onChange={handleStorageChange}
          />
          <button
            type="button"
            onClick={handleEssentialChange}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              essentialOnly
                ? 'bg-[#D6F0E8] text-[#1A6B5C] border-[#1A6B5C]/30'
                : 'bg-white text-[#64748B] border-[#D6F0E8] hover:bg-[#EDF7F3]'
            }`}
          >
            NEML only
          </button>
        </div>
      </Card>

      <Card padding={false}>
        <div className="px-5 py-4 border-b border-[#D6F0E8] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[#0D4035]">
              {meta ? `${meta.total.toLocaleString()} catalogue entries` : 'Catalogue entries'}
            </p>
            <p className="text-xs text-[#64748B]">
              {meta && meta.total > 0 ? `Showing ${pageStart.toLocaleString()}-${pageEnd.toLocaleString()}` : 'Search or browse all imported entries'}
              {isFetching && !isLoading ? ' - refreshing' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ChevronLeft size={15} />}
              disabled={!meta || meta.page <= 1}
              onClick={() => setPage(value => Math.max(value - 1, 1))}
            >
              Previous
            </Button>
            <span className="text-xs text-[#64748B] min-w-20 text-center">
              Page {meta?.page ?? page} of {meta?.totalPages ?? 1}
            </span>
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ChevronRight size={15} />}
              disabled={!meta || meta.page >= meta.totalPages}
              onClick={() => setPage(value => value + 1)}
            >
              Next
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-[#64748B]">Loading catalogue...</div>
        ) : drugs.length === 0 ? (
          <div className="p-8 text-center text-[#64748B]">No catalogue entries found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-[#D6F0E8]">
                  {['Drug', 'Form & Strength', 'Pack', 'Storage', 'Registration', 'Class', 'Flags'].map(header => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6F0E8]">
                {drugs.map(drug => (
                  <tr key={drug.id} className="hover:bg-[#EDF7F3]">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-[#0D4035]">{drug.genericName}</p>
                      {drug.brandName && <p className="text-xs text-[#64748B]">{drug.brandName}</p>}
                      {drug.manufacturer && <p className="text-xs text-[#64748B]">{drug.manufacturer}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#64748B]">
                      {drug.dosageForm || <span className="text-[#D6F0E8]">-</span>}
                      {drug.strength && <span className="ml-1 font-medium text-[#0D4035]">{drug.strength}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#64748B] whitespace-nowrap">
                      {drug.packSize.toLocaleString()} {drug.unitOfMeasure}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={drug.storageCondition === 'AMBIENT' ? 'muted' : 'info'} size="sm">
                        {drug.storageCondition}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[#64748B] whitespace-nowrap">
                      {drug.tmdaRegistrationNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#64748B]">
                      {drug.drugClass || <span className="text-[#D6F0E8]">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {drug.isEssentialMedicine && <Badge variant="success" size="sm">NEML</Badge>}
                        {drug.isColdChain && <Badge variant="info" size="sm">Cold chain</Badge>}
                        {!drug.isEssentialMedicine && !drug.isColdChain && <span className="text-xs text-[#D6F0E8]">-</span>}
                      </div>
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
