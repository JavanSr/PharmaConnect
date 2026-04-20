import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Search, CheckCircle, ScanLine } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { enqueueOfflineWrite, registerOfflineSync } from '@/lib/offlineSync';
import { useNotificationStore } from '@/stores/notificationStore';
import { api } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';

const schema = z.object({
  productId: z.string().min(1, 'Product is required'),
  batchNumber: z.string().min(1, 'Batch number is required'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  quantityRemaining: z.coerce.number().int().positive('Must be a positive number'),
  purchasePrice: z.coerce.number().positive('Must be a positive number'),
  supplierId: z.string().optional(),
});
type FormData = z.infer<typeof schema>;
type ProductOption = {
  id: string;
  name: string;
  genericName?: string | null;
  brandName?: string | null;
  barcode?: string | null;
  dosageForm?: string | null;
  strength?: string | null;
};

export const StockIntakePage: React.FC = () => {
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [success, setSuccess] = useState(false);
  const debouncedSearch = useDebounce(productSearch, 300);
  const toast = useNotificationStore(s => s.toast);
  const { isOnline, pendingWrites, isSyncing, flush } = useOfflineSync(false);

  const { data: productsData } = useQuery({
    queryKey: ['products-search', debouncedSearch],
    queryFn: () => debouncedSearch ? api.get('/inventory/products', { params: { search: debouncedSearch, limit: 10 } }).then(r => r.data) : null,
    enabled: debouncedSearch.length > 1,
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/inventory/suppliers').then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const queueStockIntake = async (data: FormData) => {
    await enqueueOfflineWrite({
      feature: 'inventory',
      entityType: 'BATCH',
      entityId: `${data.productId}:${data.batchNumber}`,
      url: '/inventory/batches',
      method: 'POST',
      body: {
        ...data,
        pharmacyId: undefined,
      },
    });
    await registerOfflineSync();
  };

  const mutation = useMutation({
    networkMode: 'always',
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        pharmacyId: undefined,
      };

      if (!navigator.onLine) {
        await queueStockIntake(data);
        return { queuedOffline: true };
      }

      try {
        await api.post('/inventory/batches', payload);
        return { queuedOffline: false };
      } catch (error: any) {
        if (!error.response) {
          await queueStockIntake(data);
          return { queuedOffline: true };
        }

        throw error;
      }
    },
    onSuccess: (result) => {
      setSuccess(true);
      reset();
      setSelectedProduct(null);
      setProductSearch('');
      toast.success(result.queuedOffline ? 'Stock queued offline and will sync when connection returns' : 'Stock received successfully');
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to receive stock');
    },
  });

  const products: ProductOption[] = productsData?.data || [];
  const suppliers = suppliersData?.data || [];

  const handleBarcodeDetected = async (barcode: string) => {
    setProductSearch(barcode);

    try {
      const response = await api.get('/inventory/products', {
        params: { barcode, limit: 10 },
      });

      const matches: ProductOption[] = response.data?.data || [];
      const exactMatch = matches.find((product) => product.barcode === barcode) || matches[0];

      if (!exactMatch) {
        toast.error(`No product found for barcode ${barcode}`);
        return;
      }

      setSelectedProduct(exactMatch);
      setProductSearch(exactMatch.genericName || exactMatch.name);
      toast.success(`Scanned ${exactMatch.genericName || exactMatch.name}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Barcode scan lookup failed');
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-bold text-[#0D4035]">Receive Stock</h1>

      {success && (
        <div className="flex items-center gap-3 p-4 bg-[#D6F0E8] rounded-xl border border-[#1A6B5C]/20">
          <CheckCircle size={20} className="text-[#1A6B5C]" />
          <p className="text-sm text-[#1A6B5C] font-medium">
            {isOnline ? 'Stock received successfully!' : 'Stock saved locally and queued for sync!'}
          </p>
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#0D4035]">
              {isOnline ? 'Online sync active' : 'Offline mode active'}
            </p>
            <p className="text-xs text-[#64748B] mt-1">
              {pendingWrites} pending write{pendingWrites === 1 ? '' : 's'} waiting in the local queue.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void flush()}
            loading={isSyncing}
            disabled={!isOnline || pendingWrites === 0}
          >
            Sync pending writes
          </Button>
        </div>
      </Card>

      <Card>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5">
          <BarcodeScanner
            label="Barcode intake scanner"
            placeholder="Scan with camera or enter barcode manually"
            onDetected={handleBarcodeDetected}
          />

          {/* Product search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#0D4035]">Product <span className="text-[#DC2626]">*</span></label>
            <Input
              placeholder="Search by name, or scan barcode with scanner..."
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              leftIcon={<Search size={16} />}
              rightIcon={<ScanLine size={16} className="text-[#1A6B5C]" />}
              onKeyDown={e => {
                if (e.key === 'Enter' && productSearch.trim()) {
                  // Trigger immediate search on barcode scanner Enter
                  e.preventDefault();
                  setProductSearch(productSearch.trim());
                }
              }}
            />
            {products.length > 0 && !selectedProduct && (
              <div className="border border-[#D6F0E8] rounded-xl overflow-hidden">
                {products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setSelectedProduct(p); setProductSearch(p.genericName || p.name); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#EDF7F3] border-b border-[#D6F0E8] last:border-0"
                  >
                    <p className="text-sm font-medium text-[#0D4035]">{p.genericName || p.name}</p>
                    <p className="text-xs text-[#64748B]">{p.dosageForm} {p.strength}</p>
                  </button>
                ))}
              </div>
            )}
            {selectedProduct && (
              <input type="hidden" {...register('productId')} value={selectedProduct.id} />
            )}
            {errors.productId && <p className="text-xs text-[#DC2626]">{errors.productId.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Batch Number" placeholder="BATCH-2024-0001" {...register('batchNumber')} error={errors.batchNumber?.message} required />
            <Input label="Expiry Date" type="date" {...register('expiryDate')} error={errors.expiryDate?.message} required />
            <Input label="Quantity Received" type="number" min="1" placeholder="100" {...register('quantityRemaining')} error={errors.quantityRemaining?.message} required />
            <Input label="Purchase Price (TZS)" type="number" step="0.01" placeholder="1500.00" {...register('purchasePrice')} error={errors.purchasePrice?.message} required />
          </div>

          <Select
            label="Supplier (optional)"
            options={suppliers.map((s: any) => ({ value: s.id, label: s.name }))}
            placeholder="Select supplier"
            {...register('supplierId')}
          />

          <div className="flex gap-3">
            <Button type="submit" loading={mutation.isPending} className="flex-1">Receive Stock</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); setSelectedProduct(null); setProductSearch(''); }}>Clear</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
