import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, AlertTriangle, Thermometer, Snowflake, Wind, Upload, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { api } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { useNotificationStore } from '@/stores/notificationStore';
import type { Product, Batch } from '@/types';

const STORAGE_ICON: Record<string, React.ReactNode> = {
  AMBIENT: <Wind size={13} className="text-[#64748B]" />,
  REFRIGERATED: <Thermometer size={13} className="text-[#1A6B5C]" />,
  FROZEN: <Snowflake size={13} className="text-[#6D28D9]" />,
};

const STORAGE_LABEL: Record<string, string> = {
  AMBIENT: 'Ambient',
  REFRIGERATED: 'Refrigerated',
  FROZEN: 'Frozen',
};

type ProductsListRowProps = {
  product: Product;
  onOpenProduct: (productId: string) => void;
};

type CsvImportError = {
  row: number;
  field: string;
  message: string;
};

type ProductsResponse = {
  data?: Product[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

const PAGE_SIZE = 50;

const ProductsListRow = function ProductsListRow({
  product,
  onOpenProduct,
}: ProductsListRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const stock = product.currentStock ?? 0;
  const isLow = stock <= product.reorderLevel;
  const isOut = stock === 0;
  const storageCondition = product.storageCondition || 'AMBIENT';
  const batches = product.batches || [];
  const hasBatches = batches.length > 0;

  return (
    <>
      <tr className="hover:bg-[#EDF7F3]">
        <td className="px-4 py-3 w-[2%]">
          {hasBatches && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 hover:bg-[#D6F0E8] rounded transition-colors"
              title={isExpanded ? 'Collapse batches' : 'Expand batches'}
            >
              <ChevronDown
                size={16}
                className={`text-[#1A6B5C] transition-transform ${isExpanded ? '' : '-rotate-90'}`}
              />
            </button>
          )}
        </td>
        <td
          className="px-4 py-3 cursor-pointer"
          onClick={() => onOpenProduct(product.id)}
        >
          <p className="text-sm font-medium text-[#0D4035]">{product.genericName || product.name}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {product.brandName && <p className="text-xs text-[#64748B]">{product.brandName}</p>}
            <span
              className={`inline-flex text-[11px] px-2 py-0.5 rounded-full font-medium ${
                product.verificationStatus === 'MASTER_CATALOG_MATCHED'
                  ? 'bg-[#D6F0E8] text-[#1A6B5C]'
                  : 'bg-amber-50 text-[#B45309]'
              }`}
            >
              {product.verificationStatus === 'MASTER_CATALOG_MATCHED' ? 'Catalog matched' : 'Unverified'}
            </span>
            {product.pendingReview && (
              <span className="inline-flex text-[11px] px-2 py-0.5 rounded-full font-medium bg-[#FEF3C7] text-[#92400E]">
                Review queued
              </span>
            )}
          </div>
        </td>

        <td className="px-4 py-3" onClick={() => onOpenProduct(product.id)}>
          {product.sku && <p className="text-xs font-mono text-[#0D4035]">{product.sku}</p>}
          {product.barcode && <p className="text-xs font-mono text-[#64748B]">{product.barcode}</p>}
          {!product.sku && !product.barcode && <span className="text-xs text-[#D6F0E8]">-</span>}
        </td>

        <td className="px-4 py-3 text-sm text-[#64748B] whitespace-nowrap" onClick={() => onOpenProduct(product.id)}>
          {product.dosageForm && <span>{product.dosageForm}</span>}
          {product.strength && <span className="ml-1 font-medium text-[#0D4035]">{product.strength}</span>}
        </td>

        <td className="px-4 py-3 text-sm text-[#0D4035] whitespace-nowrap" onClick={() => onOpenProduct(product.id)}>
          {product.sellingPrice != null
            ? `Tsh ${Number(product.sellingPrice).toLocaleString()}`
            : <span className="text-[#D6F0E8]">-</span>}
        </td>

        <td className="px-4 py-3" onClick={() => onOpenProduct(product.id)}>
          <span className={`text-sm font-bold ${isOut ? 'text-[#DC2626]' : isLow ? 'text-[#D97706]' : 'text-[#0D4035]'}`}>
            {stock.toLocaleString()}
          </span>
          <span className="text-xs text-[#64748B] ml-1">{product.unitOfMeasure}</span>
        </td>

        <td className="px-4 py-3 text-sm text-[#64748B]" onClick={() => onOpenProduct(product.id)}>{product.reorderLevel}</td>

        <td className="px-4 py-3" onClick={() => onOpenProduct(product.id)}>
          <div className="flex items-center gap-1.5">
            {STORAGE_ICON[storageCondition] ?? null}
            <span className="text-xs text-[#64748B]">
              {STORAGE_LABEL[storageCondition] ?? storageCondition}
            </span>
            {(product.coldChainRequired || product.isColdChain) && (
              <span className="text-xs px-1.5 py-0.5 bg-[#EDE9FE] text-[#6D28D9] rounded-full font-medium">CC</span>
            )}
          </div>
        </td>

        <td className="px-4 py-3 text-xs font-mono text-[#64748B]" onClick={() => onOpenProduct(product.id)}>
          {product.tmdaRegistrationNumber || <span className="text-[#D6F0E8]">-</span>}
        </td>

        <td className="px-4 py-3" onClick={() => onOpenProduct(product.id)}>
          <Badge
            variant={isOut ? 'danger' : isLow ? 'warning' : 'success'}
            size="sm"
          >
            {isOut ? 'OUT' : isLow ? 'LOW' : 'OK'}
          </Badge>
        </td>
      </tr>

      {isExpanded && hasBatches && (
        <tr className="bg-[#F8FDFB]">
          <td colSpan={11} className="px-4 py-0">
            <div className="py-3 space-y-2 border-l-2 border-[#D6F0E8] ml-2 pl-4">
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Batch Details</p>
              {batches.map((batch: Batch, idx: number) => {
                const expiryDate = batch.expiryDate ? new Date(batch.expiryDate) : null;
                const today = new Date();
                const daysUntilExpiry = expiryDate ? Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
                const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
                const isUrgent = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry >= 0;

                return (
                  <div
                    key={batch.id || idx}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border ${
                      isExpired
                        ? 'bg-red-50 border-red-100'
                        : isUrgent
                        ? 'bg-amber-50 border-amber-100'
                        : 'bg-white border-[#D6F0E8]'
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-mono font-medium text-[#0D4035]">{batch.batchNumber || 'No batch #'}</p>
                      <p className="text-[#64748B] mt-0.5">
                        Qty: <span className="font-medium">{(batch.quantityRemaining || 0).toLocaleString()} {product.unitOfMeasure}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      {expiryDate && (
                        <p className={`font-medium ${isExpired ? 'text-red-700' : isUrgent ? 'text-amber-700' : 'text-[#64748B]'}`}>
                          {expiryDate.toLocaleDateString('en-GB')}
                        </p>
                      )}
                      {daysUntilExpiry !== null && (
                        <p className={`text-[10px] mt-0.5 ${isExpired ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-[#64748B]'}`}>
                          {isExpired
                            ? `Expired ${Math.abs(daysUntilExpiry)}d ago`
                            : isUrgent
                            ? `${daysUntilExpiry}d left`
                            : `${daysUntilExpiry}d`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export const ProductsListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useNotificationStore(s => s.toast);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [storageFilter, setStorageFilter] = useState('');
  const [sortBy, setSortBy] = useState('chronological');
  const [page, setPage] = useState(1);
  const [csvErrors, setCsvErrors] = useState<CsvImportError[]>([]);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['products', debouncedSearch, lowStockOnly, storageFilter, sortBy, page],
    queryFn: () => api.get('/inventory/products', {
      params: { 
        search: debouncedSearch || undefined, 
        lowStock: lowStockOnly || undefined,
        storageCondition: storageFilter || undefined,
        sortBy: sortBy || undefined,
        page, 
        limit: PAGE_SIZE 
      },
    }).then(r => r.data as ProductsResponse),
  });

  const products: Product[] = data?.data || [];
  const totalProducts = data?.total ?? products.length;
  const totalPages = data?.totalPages ?? (totalProducts > 0 ? Math.ceil(totalProducts / PAGE_SIZE) : 0);
  const startItem = totalProducts === 0 ? 0 : ((page - 1) * PAGE_SIZE) + 1;
  const endItem = Math.min(page * PAGE_SIZE, totalProducts);
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, lowStockOnly, storageFilter, sortBy]);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleLowStockToggle = useCallback(() => {
    setLowStockOnly(value => !value);
  }, []);

  const handleOpenProduct = useCallback((productId: string) => {
    navigate(`/inventory/products/${productId}/edit`);
  }, [navigate]);

  const csvImportMutation = useMutation({
    mutationFn: async (file: File) => {
      const csv = await file.text();
      return api.post('/inventory/products/import/csv', { csv }).then(r => r.data as { data: { inserted: number } });
    },
    onSuccess: (result) => {
      const inserted = result.data.inserted;
      setCsvErrors([]);
      toast.success(`${inserted} product${inserted === 1 ? '' : 's'} imported`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['stock-on-hand'] });
    },
    onError: (error: any) => {
      const details = error?.response?.data?.details;
      const errors = Array.isArray(details?.errors) ? details.errors : [];
      setCsvErrors(errors);
      toast.error(errors.length > 0 ? 'CSV needs a few fixes before import' : 'CSV import failed');
    },
    onSettled: () => {
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
  });

  const handleCsvFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    csvImportMutation.mutate(file);
  }, [csvImportMutation]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#0D4035]">Products</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            leftIcon={<Upload size={16} />}
            loading={csvImportMutation.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleCsvFileChange}
          />
          <Link to="/inventory/products/new">
            <Button leftIcon={<Plus size={16} />}>Add Product</Button>
          </Link>
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Search by name, generic name, barcode, SKU, batch number..."
              value={search}
              onChange={handleSearchChange}
              leftIcon={<Search size={16} />}
              className="flex-1"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <button
              onClick={handleLowStockToggle}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                lowStockOnly
                  ? 'bg-amber-50 text-[#D97706] border-amber-200'
                  : 'bg-white text-[#64748B] border-[#D6F0E8] hover:bg-[#EDF7F3]'
              }`}
            >
              <AlertTriangle size={15} />
              Low Stock Only
            </button>
            
            <select
              value={storageFilter}
              onChange={(e) => setStorageFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm border border-[#D6F0E8] bg-white text-[#0D4035] hover:bg-[#EDF7F3] transition-colors"
            >
              <option value="">All Storage</option>
              <option value="AMBIENT">Ambient</option>
              <option value="REFRIGERATED">Refrigerated</option>
              <option value="FROZEN">Frozen</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm border border-[#D6F0E8] bg-white text-[#0D4035] hover:bg-[#EDF7F3] transition-colors"
            >
              <option value="chronological">Sort: Expiry (Soonest)</option>
              <option value="name">Sort: Name A-Z</option>
              <option value="stock-low">Sort: Stock (Low First)</option>
              <option value="created">Sort: Added (Newest)</option>
            </select>
          </div>
        </div>
        {csvErrors.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-[#92400E]">CSV import issues</p>
            <div className="mt-2 space-y-1">
              {csvErrors.slice(0, 5).map((error, index) => (
                <p key={`${error.row}-${error.field}-${index}`} className="text-xs text-[#B45309]">
                  Row {error.row}, {error.field}: {error.message}
                </p>
              ))}
              {csvErrors.length > 5 && (
                <p className="text-xs text-[#B45309]">{csvErrors.length - 5} more issue{csvErrors.length - 5 === 1 ? '' : 's'} not shown</p>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card padding={false}>
        {isLoading ? (
          <div className="p-8 text-center text-[#64748B]">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-[#64748B]">No products found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[#D6F0E8]">
                  <th className="px-2 py-3 w-[2%]">
                    <span className="text-xs font-semibold text-[#64748B]"></span>
                  </th>
                  {[
                    'Generic / Brand Name',
                    'SKU / Barcode',
                    'Form & Strength',
                    'Selling Price',
                    'Stock',
                    'Reorder',
                    'Storage',
                    'TMDA Reg.',
                    'Status',
                  ].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6F0E8]">
                {products.map(product => (
                  <ProductsListRow
                    key={product.id}
                    product={product}
                    onOpenProduct={handleOpenProduct}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && products.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-[#D6F0E8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#64748B]">
              Showing <span className="font-medium text-[#0D4035]">{startItem.toLocaleString()}</span>
              {' '}to <span className="font-medium text-[#0D4035]">{endItem.toLocaleString()}</span>
              {' '}of <span className="font-medium text-[#0D4035]">{totalProducts.toLocaleString()}</span> products
            </p>
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<ChevronLeft size={14} />}
                  disabled={page <= 1}
                  onClick={() => setPage(current => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {pageNumbers[0] > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPage(1)}
                        className="h-8 min-w-8 rounded-lg border border-[#D6F0E8] px-2 text-sm font-medium text-[#0D4035] hover:bg-[#EDF7F3]"
                      >
                        1
                      </button>
                      {pageNumbers[0] > 2 && <span className="px-1 text-sm text-[#64748B]">...</span>}
                    </>
                  )}
                  {pageNumbers.map(pageNumber => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={`h-8 min-w-8 rounded-lg border px-2 text-sm font-medium transition-colors ${
                        pageNumber === page
                          ? 'border-[#1A6B5C] bg-[#1A6B5C] text-white'
                          : 'border-[#D6F0E8] text-[#0D4035] hover:bg-[#EDF7F3]'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  {pageNumbers[pageNumbers.length - 1] < totalPages && (
                    <>
                      {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className="px-1 text-sm text-[#64748B]">...</span>}
                      <button
                        type="button"
                        onClick={() => setPage(totalPages)}
                        className="h-8 min-w-8 rounded-lg border border-[#D6F0E8] px-2 text-sm font-medium text-[#0D4035] hover:bg-[#EDF7F3]"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  rightIcon={<ChevronRight size={14} />}
                  disabled={page >= totalPages}
                  onClick={() => setPage(current => Math.min(totalPages, current + 1))}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
