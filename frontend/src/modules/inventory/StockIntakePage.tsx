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
type BarcodeLookupResult = {
  barcode: string;
  source: 'LOCAL' | 'GS1' | 'USER_MAP' | 'MISS';
  product: ProductOption | null;
  gs1?: {
    gtin: string;
    digitalLink: string;
  } | null;
};

export const StockIntakePage: React.FC = () => {
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [success, setSuccess] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [pendingBarcodeLookup, setPendingBarcodeLookup] = useState<BarcodeLookupResult | null>(null);
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
      setPendingBarcodeLookup(null);
      setProductSearch('');
      toast.success(result.queuedOffline ? 'Stock queued offline and will sync when connection returns' : 'Stock received successfully');
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to receive stock');
    },
  });
  const saveMappingMutation = useMutation({
    mutationFn: async (payload: { barcode: string; productId: string }) =>
      api.post('/inventory/barcode-mappings', {
        ...payload,
        source: 'USER_MAP',
      }),
    onSuccess: async () => {
      if (!pendingBarcodeLookup || !selectedProduct) {
        return;
      }

      setPendingBarcodeLookup({
        ...pendingBarcodeLookup,
        source: 'USER_MAP',
        product: selectedProduct,
      });
      toast.success(`Saved barcode mapping for ${selectedProduct.genericName || selectedProduct.name}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save barcode mapping');
    },
  });

  const products: ProductOption[] = productsData?.data || [];
  const suppliers = suppliersData?.data || [];

  const handleBarcodeDetected = async (barcode: string) => {
    try {
      const response = await api.post('/inventory/barcode-lookup', { barcode });
      const lookup = response.data?.data as BarcodeLookupResult;
      setPendingBarcodeLookup(lookup);

      if (lookup.product) {
        setSelectedProduct(lookup.product);
        setProductSearch(lookup.product.genericName || lookup.product.name);
        setShowScanner(false);
        toast.success(lookup.source === 'USER_MAP'
          ? `Loaded saved mapping for ${lookup.product.genericName || lookup.product.name}`
          : `Matched ${lookup.product.genericName || lookup.product.name} from local stock`);
        return;
      }

      setSelectedProduct(null);
      setProductSearch('');
      setShowScanner(false);

      if (lookup.source === 'GS1' && lookup.gs1?.gtin) {
        toast.info(`GS1 barcode detected. Search and map a local product for GTIN ${lookup.gs1.gtin}.`);
        return;
      }

      toast.warning(`No local product found for barcode ${lookup.barcode}. Search and map a product manually.`);
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
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-[#0D4035]">Product <span className="text-[#DC2626]">*</span></label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<ScanLine size={16} />}
                onClick={() => setShowScanner((current) => !current)}
              >
                {showScanner ? 'Hide scanner' : 'Scan'}
              </Button>
            </div>
            <Input
              label="Product search"
              placeholder="Search by name, generic name, SKU, or barcode"
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              leftIcon={<Search size={16} />}
              onKeyDown={e => {
                if (e.key === 'Enter' && productSearch.trim()) {
                  e.preventDefault();
                  setProductSearch(productSearch.trim());
                }
              }}
              hint="Use the search box first. Open the scanner only when you need to capture a barcode."
            />
            {showScanner && (
              <div className="rounded-2xl border border-dashed border-[#D6F0E8] bg-[#F8FCFA] p-4">
                <BarcodeScanner
                  label="Scan product barcode"
                  placeholder="Scan with camera or enter barcode manually"
                  onDetected={handleBarcodeDetected}
                />
              </div>
            )}
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

          {pendingBarcodeLookup && !pendingBarcodeLookup.product && (
            <div className="rounded-2xl border border-[#D6F0E8] bg-[#F8FCFA] p-4">
              <p className="text-sm font-semibold text-[#0D4035]">
                {pendingBarcodeLookup.source === 'GS1' ? 'GS1 barcode captured' : 'No local barcode match'}
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                Barcode: {pendingBarcodeLookup.barcode}
                {pendingBarcodeLookup.gs1?.gtin ? ` | GTIN: ${pendingBarcodeLookup.gs1.gtin}` : ''}
              </p>
              <p className="mt-2 text-sm text-[#64748B]">
                Search for the correct local product, select it, then save a barcode mapping for this pharmacy.
              </p>
            </div>
          )}

          {pendingBarcodeLookup && selectedProduct && !pendingBarcodeLookup.product && (
            <div className="rounded-2xl border border-[#D6F0E8] bg-[#EDF7F3] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#0D4035]">Ready to save barcode mapping</p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    {pendingBarcodeLookup.barcode} will map to {selectedProduct.genericName || selectedProduct.name}.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  loading={saveMappingMutation.isPending}
                  onClick={() => saveMappingMutation.mutate({
                    barcode: pendingBarcodeLookup.barcode,
                    productId: selectedProduct.id,
                  })}
                >
                  Save barcode mapping
                </Button>
              </div>
            </div>
          )}

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
            <Button type="button" variant="ghost" onClick={() => { reset(); setSelectedProduct(null); setPendingBarcodeLookup(null); setProductSearch(''); }}>Clear</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
