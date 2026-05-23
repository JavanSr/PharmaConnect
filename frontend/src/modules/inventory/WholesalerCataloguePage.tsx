import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Search, Loader } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useNotificationStore } from '@/stores/notificationStore';

interface CatalogueItem {
  id: string;
  productName: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  quantityAvailable: number;
  unitPrice: number;
  minimumOrderQuantity: number;
  batchNumber?: string;
  expiryDate?: string;
}

interface CatalogueResponse {
  data: CatalogueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function money(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return amount > 0 ? `Tsh ${amount.toLocaleString('en-TZ', { maximumFractionDigits: 2 })}` : '-';
}

export const WholesalerCataloguePage: React.FC = () => {
  const { wholesalerId } = useParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const toast = useNotificationStore((s) => s.toast);

  const { data: catalogueData, isLoading } = useQuery({
    queryKey: ['wholesaler-catalogue', wholesalerId, page, search],
    queryFn: () => {
      if (!wholesalerId) return Promise.reject('No wholesaler ID');
      return api
        .get(`/suppliers/apotekh-wholesalers/${wholesalerId}/catalogue`, {
          params: { search: search || undefined, page },
        })
        .then((r) => r.data as CatalogueResponse)
        .catch((e) => {
          toast.error(e.response?.data?.error || 'Failed to load catalogue');
          throw e;
        });
    },
    enabled: Boolean(wholesalerId),
  });

  const items = useMemo(() => catalogueData?.data ?? [], [catalogueData]);

  return (
    <div className="space-y-4">
      <div>
        <Link
          to="/inventory/wholesalers"
          className="mb-2 inline-flex items-center gap-1 text-sm text-[#1A6B5C] hover:underline"
        >
          <ArrowLeft size={14} /> Back to wholesalers
        </Link>
        <h1 className="text-2xl font-bold text-[#0D4035]">Wholesaler Catalogue</h1>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-[#64748B]" />
        <Input
          placeholder="Search products by name or generic name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader size={20} className="animate-spin text-[#1A6B5C]" />
        </div>
      ) : items.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-sm text-[#64748B]">No products found</p>
        </Card>
      ) : (
        <>
          <div className="divide-y divide-[#D6F0E8]">
            {items.map((item) => (
              <Card key={item.id} padding={false}>
                <div className="px-5 py-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#0D4035]">{item.productName}</p>
                      {item.genericName && (
                        <p className="text-xs text-[#64748B]">
                          {[item.genericName, item.strength, item.dosageForm].filter(Boolean).join(' | ')}
                        </p>
                      )}
                    </div>
                    <Badge variant={item.quantityAvailable > 0 ? 'success' : 'muted'}>
                      {item.quantityAvailable > 0 ? `${item.quantityAvailable} available` : 'Out of stock'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                    <div>
                      <p className="text-[#64748B]">Unit Price</p>
                      <p className="font-semibold text-[#0D4035]">{money(item.unitPrice)}</p>
                    </div>
                    <div>
                      <p className="text-[#64748B]">Min. Order</p>
                      <p className="font-semibold text-[#0D4035]">{item.minimumOrderQuantity} units</p>
                    </div>
                    {item.batchNumber && (
                      <div>
                        <p className="text-[#64748B]">Batch</p>
                        <p className="font-semibold text-[#0D4035]">{item.batchNumber}</p>
                      </div>
                    )}
                    {item.expiryDate && (
                      <div>
                        <p className="text-[#64748B]">Expires</p>
                        <p className="font-semibold text-[#0D4035]">{format(new Date(item.expiryDate), 'dd MMM yyyy')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {catalogueData && catalogueData.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              {Array.from({ length: catalogueData.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1 text-sm rounded ${
                    p === page
                      ? 'bg-[#1A6B5C] text-white'
                      : 'border border-[#D6F0E8] text-[#0D4035] hover:bg-[#EDF7F3]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
