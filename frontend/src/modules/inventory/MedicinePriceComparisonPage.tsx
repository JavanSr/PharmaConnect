import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Search, Loader, TrendingDown } from 'lucide-react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useNotificationStore } from '@/stores/notificationStore';

interface PriceOption {
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

function money(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return amount > 0 ? `Tsh ${amount.toLocaleString('en-TZ', { maximumFractionDigits: 2 })}` : '-';
}

export const MedicinePriceComparisonPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [productName, setProductName] = useState(searchParams.get('product') || '');
  const [genericName, setGenericName] = useState(searchParams.get('generic') || '');
  const toast = useNotificationStore((s) => s.toast);

  const { data: prices = [], isLoading } = useQuery({
    queryKey: ['price-comparison', productName, genericName],
    queryFn: () => {
      if (!productName && !genericName) return Promise.resolve([]);
      return api
        .get('/suppliers/price-comparison', {
          params: {
            productName: productName || undefined,
            genericName: genericName || undefined,
          },
        })
        .then((r) => r.data.data as PriceOption[])
        .catch((e) => {
          toast.error(e.response?.data?.error || 'Failed to load prices');
          return [];
        });
    },
  });

  const sorted = useMemo(() => [...prices].sort((a, b) => a.unitPrice - b.unitPrice), [prices]);
  const minPrice = sorted.length > 0 ? sorted[0].unitPrice : 0;
  const maxPrice = sorted.length > 0 ? sorted[sorted.length - 1].unitPrice : 0;
  const savings = sorted.length > 1 ? maxPrice - minPrice : 0;
  const savingsPercent = sorted.length > 1 ? ((savings / maxPrice) * 100).toFixed(1) : '0';

  const handleSearch = () => {
    if (productName || genericName) {
      setSearchParams({
        ...(productName && { product: productName }),
        ...(genericName && { generic: genericName }),
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Link
          to="/inventory/stock-orders"
          className="mb-2 inline-flex items-center gap-1 text-sm text-[#1A6B5C] hover:underline"
        >
          <ArrowLeft size={14} /> Back to orders
        </Link>
        <h1 className="text-2xl font-bold text-[#0D4035]">Price Comparison</h1>
        <p className="mt-1 text-sm text-[#64748B]">Compare medicine prices across all available wholesalers</p>
      </div>

      <Card>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Product Name"
              placeholder="e.g. Amoxicillin"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Input
              label="Generic Name (optional)"
              placeholder="e.g. Amoxicillin"
              value={genericName}
              onChange={(e) => setGenericName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            className="w-full px-4 py-2 bg-[#1A6B5C] text-white rounded-lg text-sm font-medium hover:bg-[#145748] transition-colors"
          >
            <Search size={14} className="inline mr-2" />
            Compare Prices
          </button>
        </div>
      </Card>

      {prices.length > 0 && (
        <Card className="bg-[#F8FCFA] border-[#D6F0E8]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-[#64748B] uppercase tracking-wider">Price Range</p>
              <p className="text-lg font-bold text-[#0D4035] mt-1">
                {money(minPrice)} - {money(maxPrice)}
              </p>
            </div>
            {savings > 0 && (
              <div className="text-right">
                <div className="flex items-center gap-1 text-xs text-[#145748] bg-[#D6F0E8] px-2 py-1 rounded">
                  <TrendingDown size={12} />
                  Save up to {savingsPercent}%
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader size={20} className="animate-spin text-[#1A6B5C]" />
        </div>
      ) : sorted.length === 0 && (productName || genericName) ? (
        <Card className="text-center py-8">
          <p className="text-sm text-[#64748B]">No suppliers found for this product</p>
        </Card>
      ) : sorted.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-sm text-[#64748B]">Enter a product name to compare prices</p>
        </Card>
      ) : (
        <div className="divide-y divide-[#D6F0E8]">
          {sorted.map((option, index) => {
            const isCheapest = index === 0 && sorted.length > 1;
            return (
              <Card key={option.id} padding={false} className={isCheapest ? 'border-[#1A6B5C] border-2' : ''}>
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#0D4035]">{option.wholesalerName}</p>
                      {option.wholesalerPhone && (
                        <p className="text-xs text-[#64748B]">{option.wholesalerPhone}</p>
                      )}
                    </div>
                    {isCheapest && <Badge variant="success">Cheapest</Badge>}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[#64748B]">Unit Price</p>
                      <p className="text-lg font-bold text-[#0D4035]">{money(option.unitPrice)}</p>
                    </div>
                    <div>
                      <p className="text-[#64748B]">Available</p>
                      <p className={`font-semibold ${option.quantityAvailable > 0 ? 'text-[#0D4035]' : 'text-[#E8694A]'}`}>
                        {option.quantityAvailable > 0 ? `${option.quantityAvailable} units` : 'Out of stock'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#64748B]">Min. Order</p>
                      <p className="font-semibold text-[#0D4035]">{option.minimumOrderQuantity} units</p>
                    </div>
                    {option.wholesalerEmail && (
                      <div>
                        <p className="text-[#64748B]">Email</p>
                        <a
                          href={`mailto:${option.wholesalerEmail}`}
                          className="text-[#1A6B5C] text-sm hover:underline break-all"
                        >
                          {option.wholesalerEmail}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
