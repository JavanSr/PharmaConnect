import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader, ArrowUpDown } from 'lucide-react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useNotificationStore } from '@/stores/notificationStore';

export interface MedicineSupplierOption {
  id: string;
  productName: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  quantityAvailable: number;
  unitPrice: number;
  minimumOrderQuantity: number;
  wholesalerId: string;
  wholesalerName?: string;
  wholesalerPhone?: string;
  wholesalerEmail?: string;
}

interface MedicineSupplierSearchPanelProps {
  onSelectSupplier: (supplier: MedicineSupplierOption) => void;
}

type SortBy = 'price-asc' | 'price-desc' | 'name' | 'supplier' | 'availability';

export const MedicineSupplierSearchPanel: React.FC<MedicineSupplierSearchPanelProps> = ({
  onSelectSupplier,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('price-asc');
  const toast = useNotificationStore((s) => s.toast);

  const { data: allOptions = [], isLoading } = useQuery({
    queryKey: ['medicine-supplier-search', searchTerm],
    queryFn: () => {
      if (!searchTerm.trim()) return Promise.resolve([]);
      return api
        .get('/suppliers/price-comparison', {
          params: { productName: searchTerm },
        })
        .then((r) => r.data.data as MedicineSupplierOption[])
        .catch((e) => {
          toast.error(e.response?.data?.error || 'Failed to search');
          return [];
        });
    },
  });

  const sorted = useMemo(() => {
    const items = [...allOptions];

    switch (sortBy) {
      case 'price-asc':
        return items.sort((a, b) => a.unitPrice - b.unitPrice);
      case 'price-desc':
        return items.sort((a, b) => b.unitPrice - a.unitPrice);
      case 'name':
        return items.sort((a, b) => a.productName.localeCompare(b.productName));
      case 'supplier':
        return items.sort((a, b) =>
          (a.wholesalerName || '').localeCompare(b.wholesalerName || '')
        );
      case 'availability':
        return items.sort((a, b) => b.quantityAvailable - a.quantityAvailable);
      default:
        return items;
    }
  }, [allOptions, sortBy]);

  const minPrice = sorted.length > 0 ? sorted[0].unitPrice : 0;
  const maxPrice = sorted.length > 0 ? sorted[sorted.length - 1].unitPrice : 0;

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-semibold text-[#0D4035] uppercase">
          Search & Compare Medicines
        </label>
        <div className="relative mt-2">
          <Search size={16} className="absolute left-3 top-3 text-[#64748B]" />
          <Input
            placeholder="e.g. Amoxicillin, Paracetamol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {searchTerm && (
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-semibold text-[#0D4035]">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="text-xs px-2 py-1 border border-[#D6F0E8] rounded bg-white text-[#0D4035] focus:outline-none focus:ring-1 focus:ring-[#1A6B5C]"
          >
            <option value="price-asc">💰 Price (Low → High)</option>
            <option value="price-desc">💰 Price (High → Low)</option>
            <option value="name">🔤 Name</option>
            <option value="supplier">🏪 Supplier</option>
            <option value="availability">📦 Availability</option>
          </select>
        </div>
      )}

      {isLoading && searchTerm && (
        <div className="flex items-center justify-center py-8">
          <Loader size={18} className="animate-spin text-[#1A6B5C]" />
        </div>
      )}

      {searchTerm && !isLoading && sorted.length === 0 && (
        <Card className="text-center py-6">
          <p className="text-sm text-[#64748B]">No suppliers found for "{searchTerm}"</p>
        </Card>
      )}

      {sorted.length > 0 && (
        <>
          {minPrice !== maxPrice && (
            <Card className="bg-[#F8FCFA] border-[#D6F0E8]">
              <div className="text-sm">
                <p className="text-[#64748B]">Price Range</p>
                <p className="font-semibold text-[#0D4035]">
                  Tsh {minPrice.toLocaleString('en-TZ')} - Tsh {maxPrice.toLocaleString('en-TZ')}
                </p>
              </div>
            </Card>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto border border-[#D6F0E8] rounded divide-y divide-[#D6F0E8]">
            {sorted.map((option, index) => {
              const isCheapest = index === 0 && sorted.length > 1;
              return (
                <button
                  key={option.id}
                  onClick={() => onSelectSupplier(option)}
                  className={`w-full text-left p-3 hover:bg-[#EDF7F3] transition-colors ${
                    isCheapest ? 'bg-[#F0FDF4]' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#0D4035] text-sm">{option.productName}</p>
                      {option.genericName && (
                        <p className="text-xs text-[#64748B]">
                          {[option.genericName, option.strength, option.dosageForm]
                            .filter(Boolean)
                            .join(' | ')}
                        </p>
                      )}
                      <p className="text-xs text-[#64748B] mt-1">{option.wholesalerName}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-[#0D4035] text-sm">
                        Tsh {option.unitPrice.toLocaleString('en-TZ')}
                      </p>
                      {isCheapest && (
                        <Badge variant="success" className="mt-1 text-xs">
                          Cheapest
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-1 text-xs">
                    <Badge
                      variant={option.quantityAvailable > 0 ? 'success' : 'muted'}
                      className="text-xs"
                    >
                      {option.quantityAvailable > 0
                        ? `${option.quantityAvailable} available`
                        : 'Out of stock'}
                    </Badge>
                    <span className="text-[#64748B]">Min: {option.minimumOrderQuantity}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
