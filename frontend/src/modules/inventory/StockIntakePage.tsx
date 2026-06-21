import React, { Suspense, lazy, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ScanLine, Trash2, PackageCheck, AlertTriangle, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useDebounce } from '@/hooks/useDebounce';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { enqueueOfflineWrite, registerOfflineSync } from '@/lib/offlineSync';
import { cacheProducts, searchCachedProducts } from '@/lib/offlineProducts';
import type { Product } from '@/types';
import { useNotificationStore } from '@/stores/notificationStore';
import { api } from '@/lib/api';

const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner').then((module) => ({ default: module.BarcodeScanner })));

// ── types ────────────────────────────────────────────────────────────────────

type PriceMode = 'UNIT' | 'PACK';

type ProductOption = {
  id: string;
  name: string;
  genericName?: string | null;
  brandName?: string | null;
  sku?: string | null;
  barcode?: string | null;
  dosageForm?: string | null;
  strength?: string | null;
  tmdaRegistrationNumber?: string | null;
  manufacturer?: string | null;
  therapeuticCategory?: string | null;
  drugMasterId?: string | null;
  currentStock?: number;
};

type MasterCatalogOption = {
  id: string;
  productName: string;
  genericName: string;
  brandName?: string | null;
  manufacturer?: string | null;
  dosageForm?: string | null;
  strength?: string | null;
  unitOfMeasure: string;
  storageCondition: 'AMBIENT' | 'REFRIGERATED' | 'FROZEN';
  isColdChain: boolean;
  therapeuticCategory?: string | null;
  tmdaRegistrationNumber?: string | null;
  verificationStatus?: string | null;
};

type BarcodeLookupResult = {
  barcode: string;
  source: 'LOCAL' | 'GS1' | 'USER_MAP' | 'MISS';
  product: ProductOption | null;
  gs1?: { gtin: string; digitalLink: string } | null;
};

type PriceHint = { status: 'OK' | 'HIGH' | 'LOW'; median: number } | null;

type CartLine = {
  id: string;
  product: ProductOption;
  catalogProduct?: MasterCatalogOption;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  priceMode: PriceMode;
  packSize: number;
  enteredPrice: number;
  unitPrice: number;
  sellingPrice?: number;
  priceHint: PriceHint;
};

// ── helpers ──────────────────────────────────────────────────────────────────

type InventoryDosageForm = 'TABLET'|'CAPSULE'|'SYRUP'|'INJECTION'|'CREAM'|'OINTMENT'|'DROPS'|'INHALER'|'SUPPOSITORY'|'POWDER'|'SOLUTION'|'OTHER';

const DOSAGE_FORM_MAP: Record<string, InventoryDosageForm> = {
  TABLET:'TABLET',CAPSULE:'CAPSULE',SYRUP:'SYRUP',INJECTION:'INJECTION',
  CREAM:'CREAM',OINTMENT:'OINTMENT',DROPS:'DROPS',INHALER:'INHALER',
  SUPPOSITORY:'SUPPOSITORY',POWDER:'POWDER',SOLUTION:'SOLUTION',
};

function toInventoryDosageForm(v?: string | null): InventoryDosageForm | undefined {
  if (!v) return undefined;
  return DOSAGE_FORM_MAP[v.trim().toUpperCase().replace(/[^A-Z]+/g,'_')] ?? 'OTHER';
}

function productName(p: ProductOption) {
  return p.name || p.brandName || p.genericName || 'Unnamed product';
}

const normalizeSearchText = (value?: string | number | null) =>
  String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const searchTokens = (value: string) => normalizeSearchText(value).split(' ').filter(Boolean);

const valueMatchesTokenPrefix = (value: string | number | null | undefined, token: string) => {
  const normalized = normalizeSearchText(value);
  if (!normalized) {
    return false;
  }

  return normalized.startsWith(token) || normalized.split(' ').some((word) => word.startsWith(token));
};

function matchesSearch(search: string, values: Array<string | number | null | undefined>) {
  const tokens = searchTokens(search);
  if (tokens.length === 0) {
    return true;
  }
  return tokens.every((token) => values.some((value) => valueMatchesTokenPrefix(value, token)));
}

function productMatchesSearch(product: ProductOption, search: string) {
  return matchesSearch(search, [
    product.name,
    product.genericName,
    product.brandName,
    product.strength,
    product.dosageForm,
    product.sku,
  ]);
}

function catalogProductMatchesSearch(product: MasterCatalogOption, search: string) {
  return matchesSearch(search, [
    product.productName,
    product.genericName,
    product.brandName,
    product.strength,
    product.dosageForm,
  ]);
}

function catalogStatusLabel(v?: string | null) {
  if (!v) return 'Catalog candidate';
  return v.split('_').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function catalogStatusVariant(v?: string | null): 'success' | 'warning' | 'muted' {
  if (!v) return 'muted';
  if (v.includes('UNVERIFIED') || v.includes('LOW') || v.includes('REVIEW')) return 'warning';
  if (v.includes('TMDA') || v.includes('VERIFIED')) return 'success';
  return 'muted';
}

function computeUnitPrice(entered: number, mode: PriceMode, packSize: number) {
  if (mode === 'PACK' && packSize > 1) return entered / packSize;
  return entered;
}

function computePriceHint(unitPrice: number, existingPrices: number[]): PriceHint {
  if (!unitPrice || existingPrices.length < 2) return null;
  const sorted = [...existingPrices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  if (median === 0) return null;
  if (unitPrice > median * 2) return { status: 'HIGH', median };
  if (unitPrice < median * 0.5) return { status: 'LOW', median };
  return { status: 'OK', median };
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function autoBatchNumber(product?: ProductOption | null) {
  const source = productName(product ?? { id: '', name: 'BATCH' })
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 6) || 'BATCH';
  const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `${source}-${stamp}-${uid().toUpperCase().slice(0, 4)}`;
}

// ── line form schema ─────────────────────────────────────────────────────────

const lineSchema = z.object({
  batchNumber: z.string().min(1, 'Required'),
  expiryDate: z.string().min(1, 'Required'),
  quantity: z.coerce.number().int().positive('Must be > 0'),
  enteredPrice: z.coerce.number().positive('Must be > 0'),
  sellingPrice: z.preprocess(
    (value) => (value === '' || value == null ? undefined : value),
    z.coerce.number().positive('Must be > 0').optional(),
  ),
  priceMode: z.enum(['UNIT', 'PACK']),
  packSize: z.coerce.number().int().min(1, 'Min 1').default(1),
});
type LineFormData = z.infer<typeof lineSchema>;

// ── component ────────────────────────────────────────────────────────────────

export const StockIntakePage: React.FC = () => {
  const toast = useNotificationStore(s => s.toast);
  const qc = useQueryClient();
  const { pendingWrites } = useOfflineSync(false);

  // session-level supplier (applies to all lines in this receipt)
  const [sessionSupplierId, setSessionSupplierId] = useState<string>('');
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');

  const createSupplierMutation = useMutation({
    mutationFn: () =>
      api.post('/inventory/suppliers', {
        name: newSupplierName.trim(),
        phone: newSupplierPhone.trim() || undefined,
      }).then(r => r.data.data as { id: string; name: string }),
    onSuccess: (supplier) => {
      toast.success(`Supplier "${supplier.name}" added`);
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      setSessionSupplierId(supplier.id);
      setShowNewSupplier(false);
      setNewSupplierName('');
      setNewSupplierPhone('');
    },
    onError: (err: any) => toast.error(err.response?.data?.error ?? 'Could not add supplier'),
  });

  // cart
  const [cart, setCart] = useState<CartLine[]>([]);
  const batchFormRef = useRef<HTMLDivElement>(null);

  // product search
  const [productSearch, setProductSearch] = useState('');
  const debouncedProductSearch = useDebounce(productSearch, 300);
  const debouncedMasterSearch = useDebounce(productSearch, 600);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<MasterCatalogOption | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [pendingBarcode, setPendingBarcode] = useState<BarcodeLookupResult | null>(null);
  const trimmedSearch = debouncedProductSearch.trim();
  const [cachedProducts, setCachedProducts] = useState<ProductOption[]>([]);
  const [cachedMasterProducts, setCachedMasterProducts] = useState<MasterCatalogOption[]>([]);

  const { register, handleSubmit, reset: resetLine, watch, formState: { errors }, setValue } = useForm<LineFormData>({
    resolver: zodResolver(lineSchema),
    defaultValues: { priceMode: 'UNIT', packSize: 1 },
  });

  const watchedPriceMode = watch('priceMode') as PriceMode;
  const watchedPackSize = watch('packSize');
  const watchedEnteredPrice = watch('enteredPrice');
  const watchedExpiryDate = watch('expiryDate');

  // Intake expiry warning — alert when receiving stock with < 60 days to expiry
  const intakeExpiryWarning = (() => {
    if (!watchedExpiryDate) return null;
    const days = Math.ceil((new Date(watchedExpiryDate).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
    if (days < 0)   return { level: 'EXPIRED',  msg: 'This batch has already expired. Do not receive expired stock.' };
    if (days <= 1)  return { level: 'CRITICAL', msg: 'Expires tomorrow. Do not receive — only 1 day remaining.' };
    if (days <= 7)  return { level: 'URGENT',   msg: `Expires in ${days} days. Receiving this is high risk — verify with supplier.` };
    if (days <= 14) return { level: 'WARNING',  msg: `Expires in ${days} days. Only receive if it can be dispensed before expiry.` };
    if (days <= 30) return { level: 'CAUTION',  msg: `Expires in ${days} days. Ensure FEFO dispensing once received.` };
    if (days <= 60) return { level: 'INFO',     msg: `Expires in ${days} days. Check stock levels before ordering more.` };
    return null;
  })();

  // existing batch prices for the selected product (price hint)
  const { data: batchPriceData } = useQuery({
    queryKey: ['batch-prices', selectedProduct?.id],
    queryFn: () => api.get('/inventory/batches', { params: { productId: selectedProduct!.id, limit: 50 } }).then(r => r.data),
    enabled: !!selectedProduct,
    staleTime: 60_000,
  });
  const existingPrices: number[] = useMemo(() => {
    const batches = batchPriceData?.data ?? [];
    return batches.map((b: any) => Number(b.purchasePrice)).filter((p: number) => p > 0);
  }, [batchPriceData]);

  const watchedSellingPrice = watch('sellingPrice');

  const currentUnitPrice = computeUnitPrice(
    Number(watchedEnteredPrice) || 0,
    watchedPriceMode as PriceMode,
    Number(watchedPackSize) || 1,
  );
  const liveHint = computePriceHint(currentUnitPrice, existingPrices);

  const profitMargin = (() => {
    const sell = Number(watchedSellingPrice) || 0;
    if (sell <= 0 || currentUnitPrice <= 0) return null;
    const pct = ((sell - currentUnitPrice) / currentUnitPrice) * 100;
    return { pct: Math.round(pct * 10) / 10, sell, cost: currentUnitPrice };
  })();

  // product search queries
  const { data: productsData, isFetching: isProductFetching } = useQuery({
    queryKey: ['products-search', trimmedSearch],
    queryFn: async ({ signal }) => {
      if (!trimmedSearch) return null;
      try {
        return await api.get('/inventory/products/suggestions', {
          params: { search: trimmedSearch, limit: 12 },
          signal,
          timeout: 2500,
        }).then(r => r.data);
      } catch (error: any) {
        if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
          throw error;
        }
        if (!navigator.onLine || !error?.response) {
          const cached = await searchCachedProducts(trimmedSearch, 12);
          return { data: cached, offline: true };
        }
        throw new Error('Product search failed');
      }
    },
    enabled: trimmedSearch.length > 0,
    staleTime: 30_000,
    networkMode: 'always',
  });
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/inventory/suppliers').then(r => r.data),
  });

  const products: ProductOption[] = productsData?.data ?? [];
  React.useEffect(() => {
    let cancelled = false;
    if (!trimmedSearch) {
      setCachedProducts([]);
      return;
    }
    void searchCachedProducts(trimmedSearch, 12)
      .then((cached) => {
        if (!cancelled) setCachedProducts(cached as ProductOption[]);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [trimmedSearch]);
  React.useEffect(() => {
    if (Array.isArray(productsData?.data)) {
      setCachedProducts(productsData.data);
      void cacheProducts(productsData.data as Product[]);
    }
  }, [productsData]);
  // Products from pharmacy inventory, used purely for stock-count enrichment.
  // API results are already server-filtered — skip client-side filter on them.
  const inventoryProducts = useMemo(() => {
    if (products.length > 0) return products;
    return cachedProducts.filter((p) => productMatchesSearch(p, trimmedSearch));
  }, [cachedProducts, products, trimmedSearch]);

  // Index by drugMasterId for O(1) lookup when merging with master catalog.
  const inventoryByMasterId = useMemo(
    () => new Map(inventoryProducts.filter((p) => p.drugMasterId).map((p) => [p.drugMasterId!, p])),
    [inventoryProducts],
  );

  // Pharmacy-only products that have no master catalog entry (manually added / legacy).
  const inventoryOnlyProducts = useMemo(
    () => inventoryProducts.filter((p) => !p.drugMasterId),
    [inventoryProducts],
  );
  const shouldSearchMasterCatalog = trimmedSearch.length >= 2;
  const { data: masterCatalogData, isFetching: isMasterFetching } = useQuery({
    queryKey: ['stock-intake-master', debouncedMasterSearch.trim()],
    queryFn: async ({ signal }) => {
      if (!debouncedMasterSearch.trim()) return null;
      try {
        return await api.get('/inventory/drug-master', {
          params: { q: debouncedMasterSearch.trim(), limit: 8 },
          signal,
          timeout: 2500,
        }).then(r => r.data);
      } catch (error: any) {
        if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
          throw error;
        }
        return null;
      }
    },
    enabled: shouldSearchMasterCatalog,
    staleTime: 30_000,
    networkMode: 'always',
  });
  const masterProducts: MasterCatalogOption[] = masterCatalogData?.data ?? [];
  React.useEffect(() => {
    if (Array.isArray(masterCatalogData?.data)) {
      setCachedMasterProducts(masterCatalogData.data);
    }
  }, [masterCatalogData]);
  const visibleMasterProducts = useMemo(() => {
    if (masterCatalogData) return masterProducts; // API already filtered
    return cachedMasterProducts.filter((p) => catalogProductMatchesSearch(p, trimmedSearch));
  }, [cachedMasterProducts, masterCatalogData, masterProducts, trimmedSearch]);

  // Master catalog entries enriched with the pharmacy's current stock (or 0 if not stocked yet).
  const unifiedResults = useMemo(() => {
    return visibleMasterProducts.map((cp) => ({
      master: cp,
      inventory: inventoryByMasterId.get(cp.id) ?? null,
    }));
  }, [visibleMasterProducts, inventoryByMasterId]);
  const suppliers = suppliersData?.data ?? [];

  // create product from catalog
  const createCatalogMutation = useMutation({
    mutationFn: (cp: MasterCatalogOption) => api.post('/inventory/products', {
      name: cp.productName,
      genericName: cp.genericName,
      brandName: cp.brandName || undefined,
      manufacturer: cp.manufacturer || undefined,
      therapeuticCategory: cp.therapeuticCategory || undefined,
      tmdaRegistrationNumber: cp.tmdaRegistrationNumber || undefined,
      dosageForm: toInventoryDosageForm(cp.dosageForm),
      strength: cp.strength || undefined,
      unitOfMeasure: cp.unitOfMeasure || undefined,
      coldChainRequired: cp.isColdChain,
      storageCondition: cp.storageCondition,
      drugMasterId: cp.id,
    }).then(r => r.data.data as ProductOption),
    onSuccess: (product, cp) => {
      selectProduct(product, cp);
      toast.success('Product created from catalog — continue filling batch details below.');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to create product from catalog'),
  });

  const selectProduct = (p: ProductOption, cp?: MasterCatalogOption) => {
    setSelectedProduct(p);
    setSelectedCatalogProduct(cp ?? null);
    setProductSearch(productName(p));
    setValue('batchNumber', autoBatchNumber(p), { shouldDirty: false, shouldValidate: true });
    setTimeout(() => batchFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const clearProductSearch = () => {
    setSelectedProduct(null);
    setSelectedCatalogProduct(null);
    setProductSearch('');
    setPendingBarcode(null);
    resetLine();
  };

  // barcode
  const handleBarcodeDetected = async (barcode: string) => {
    try {
      const r = await api.post('/inventory/barcode-lookup', { barcode });
      const lookup = r.data?.data as BarcodeLookupResult;
      setPendingBarcode(lookup);
      if (lookup.product) {
        selectProduct(lookup.product);
        setShowScanner(false);
        toast.success(
          lookup.source === 'USER_MAP'
            ? `Loaded saved mapping for ${lookup.product.genericName || productName(lookup.product)}`
            : `Matched ${productName(lookup.product)}`,
        );
        return;
      }
      setShowScanner(false);
      toast.warning(
        lookup.source === 'GS1'
          ? 'GS1 barcode captured. Search to select manually.'
          : `No local product for barcode ${barcode}. Search to select manually.`,
      );
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Barcode lookup failed');
    }
  };

  const saveMappingMutation = useMutation({
    mutationFn: (p: { barcode: string; productId: string }) => api.post('/inventory/barcode-mappings', { ...p, source: 'USER_MAP' }),
    onSuccess: () => {
      const productLabel = selectedProduct?.genericName || (selectedProduct ? productName(selectedProduct) : 'product');
      toast.success(`Saved barcode mapping for ${productLabel}`);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to save barcode mapping'),
  });

  const makeCartLine = (data: LineFormData): CartLine | null => {
    if (!selectedProduct) {
      toast.error('Select a product first');
      return null;
    }
    const unitPrice = computeUnitPrice(data.enteredPrice, data.priceMode as PriceMode, data.packSize);
    const hint = computePriceHint(unitPrice, existingPrices);
    return {
      id: uid(),
      product: selectedProduct,
      catalogProduct: selectedCatalogProduct ?? undefined,
      batchNumber: data.batchNumber,
      expiryDate: data.expiryDate,
      quantity: data.quantity,
      priceMode: data.priceMode as PriceMode,
      packSize: data.packSize,
      enteredPrice: data.enteredPrice,
      unitPrice,
      sellingPrice: data.sellingPrice,
      priceHint: hint,
    };
  };

  // add line to cart
  const onAddLine = (data: LineFormData) => {
    const line = makeCartLine(data);
    if (!line) return;
    setCart(prev => [...prev, line]);
    clearProductSearch();
    toast.success(`${productName(line.product)} added to intake cart`);
  };

  // receive all
  const receiveAllMutation = useMutation({
    networkMode: 'always',
    mutationFn: async (linesOverride?: CartLine[]) => {
      const linesToReceive = linesOverride ?? cart;
      const results = [];
      for (const line of linesToReceive) {
        const payload = {
          productId: line.product.id,
          batchNumber: line.batchNumber,
          expiryDate: line.expiryDate,
          quantityRemaining: line.quantity,
          purchasePrice: line.unitPrice > 0 ? line.unitPrice : undefined,
          sellingPrice: line.sellingPrice || undefined,
          supplierId: sessionSupplierId || undefined,
        };
        if (!navigator.onLine) {
          await enqueueOfflineWrite({
            feature: 'inventory',
            entityType: 'BATCH',
            entityId: `${line.product.id}:${line.batchNumber}`,
            url: '/inventory/batches',
            method: 'POST',
            body: payload,
          });
          results.push({ queuedOffline: true });
        } else {
          try {
            await api.post('/inventory/batches', payload);
            results.push({ queuedOffline: false });
          } catch (e: any) {
            if (e?.isOfflineQueued) {
              results.push({ queuedOffline: true });
            } else if (!e.response) {
              await enqueueOfflineWrite({
                feature: 'inventory',
                entityType: 'BATCH',
                entityId: `${line.product.id}:${line.batchNumber}`,
                url: '/inventory/batches',
                method: 'POST',
                body: payload,
              });
              results.push({ queuedOffline: true });
            } else throw e;
          }
        }
      }
      if (results.some(r => r.queuedOffline)) await registerOfflineSync();
      return results;
    },
    onSuccess: (results) => {
      const offline = results.filter(r => r.queuedOffline).length;
      const online = results.length - offline;
      if (offline > 0 && online > 0) {
        toast.success(`${online} batch(es) received, ${offline} queued offline`);
      } else if (offline > 0) {
        toast.success(`${offline} batch(es) queued offline — will sync when connected`);
      } else {
        toast.success(`${online} batch(es) received successfully`);
      }
      if (offline > 0) {
        toast.success('Stock saved locally and queued for sync!');
      }
      setCart([]);
      clearProductSearch();
      // Invalidate product/stock caches so dispensing screen shows updated quantities immediately
      void qc.invalidateQueries({ queryKey: ['products'] });
      void qc.invalidateQueries({ queryKey: ['dispensing-products'] });
      void qc.invalidateQueries({ queryKey: ['dashboard-stock'] });
      void qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to receive stock'),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[#0D4035]">Receive Stock</h1>
          <p className="mt-2 text-xs font-medium text-[#64748B]">
            {pendingWrites} pending write{pendingWrites === 1 ? '' : 's'} waiting in the local queue.
          </p>
        </div>
        {cart.length > 0 && (
          <Badge variant="info">{cart.length} item{cart.length > 1 ? 's' : ''} in cart</Badge>
        )}
      </div>

      {/* Two-column layout: form on left, cart pinned on right */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px] items-start">
      <div className="space-y-5">

      {/* Session supplier — one-time selection for the whole receipt */}
      <Card>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <Select
              label="Supplier for this receipt (optional)"
              options={[
                { value: '', label: 'No supplier / walk-in purchase' },
                ...suppliers.map((s: any) => ({ value: s.id, label: s.name })),
                { value: '__new__', label: '+ Add new supplier…' },
              ]}
              value={sessionSupplierId}
              onChange={e => {
                if (e.target.value === '__new__') {
                  setShowNewSupplier(true);
                  setSessionSupplierId('');
                } else {
                  setShowNewSupplier(false);
                  setSessionSupplierId(e.target.value);
                }
              }}
            />
          </div>
          {sessionSupplierId && (
            <button type="button" onClick={() => setSessionSupplierId('')} className="mt-5 text-xs text-[#64748B] hover:text-[#DC2626]">
              Clear
            </button>
          )}
        </div>

        {showNewSupplier && (
          <div className="mt-4 space-y-3 rounded-xl border border-[#D6F0E8] bg-[#F7FCFA] p-4">
            <p className="text-xs font-semibold text-[#0D4035]">New supplier</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Supplier name *"
                value={newSupplierName}
                onChange={e => setNewSupplierName(e.target.value)}
                placeholder="e.g. Shelys Pharma Ltd"
              />
              <Input
                label="Phone (optional)"
                value={newSupplierPhone}
                onChange={e => setNewSupplierPhone(e.target.value)}
                placeholder="+255 …"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => createSupplierMutation.mutate()}
                loading={createSupplierMutation.isPending}
                disabled={!newSupplierName.trim()}
              >
                Save supplier
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowNewSupplier(false); setNewSupplierName(''); setNewSupplierPhone(''); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <p className="mt-2 text-xs text-[#64748B]">All items added to this cart will be attributed to this supplier.</p>
      </Card>

      {/* ── Add item form ───────────────────────────────────────────────────── */}
      <Card header={<span className="text-sm font-semibold text-[#0D4035]">Add item to cart</span>}>
        {/* Product search */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-[#0D4035]">Product <span className="text-[#DC2626]">*</span></span>
            {selectedProduct && (
              <button type="button" onClick={clearProductSearch} className="text-xs text-[#64748B] hover:text-[#DC2626]">
                Clear
              </button>
            )}
          </div>

          {!selectedProduct && (
            <>
              <Input
                label="Product search"
                placeholder="Search generic or brand name"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                onKeyDown={(e) => {
                  // USB barcode scanner: 8-14 digit input + Enter triggers lookup
                  if (e.key === 'Enter') {
                    const val = productSearch.trim();
                    if (/^\d{8,14}$/.test(val)) {
                      e.preventDefault();
                      void handleBarcodeDetected(val);
                      setProductSearch('');
                    }
                  }
                }}
                leftIcon={<Search size={16} />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowScanner(p => !p)}
                    className="rounded-lg p-1 text-[#64748B] hover:bg-[#EDF7F3] hover:text-[#0D4035]"
                    aria-label={showScanner ? 'Hide scanner' : 'Scan barcode'}
                    title={showScanner ? 'Hide scanner' : 'Scan barcode'}
                  >
                    <ScanLine size={16} />
                  </button>
                }
              />
            </>
          )}

          {showScanner && (
            <div className="rounded-2xl border border-dashed border-[#D6F0E8] bg-[#F8FCFA] p-4">
              <Suspense fallback={<div className="text-sm text-[#64748B]">Loading scanner...</div>}>
                <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setShowScanner(false)} />
              </Suspense>
            </div>
          )}

          {selectedProduct && (
            <div className="rounded-2xl border border-[#D6F0E8] bg-[#EDF7F3] px-4 py-3">
              <input type="hidden" name="productId" value={selectedProduct.id} readOnly />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#0D4035]">{productName(selectedProduct)}</p>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {[selectedProduct.brandName, selectedProduct.genericName, selectedProduct.dosageForm, selectedProduct.strength]
                      .filter(Boolean).join(' | ')}
                  </p>
                </div>
                <Package size={16} className="text-[#1A6B5C] mt-0.5 shrink-0" />
              </div>
            </div>
          )}

          {/* Unified search results — master catalog as primary source, enriched with current stock */}
          {!selectedProduct && trimmedSearch.length > 0 && (
            <div className="border border-[#D6F0E8] rounded-xl overflow-hidden">
              {(isProductFetching || isMasterFetching) && unifiedResults.length === 0 && inventoryOnlyProducts.length === 0 && (
                <div className="px-4 py-3 text-sm text-[#64748B]">Searching…</div>
              )}

              {/* Master catalog entries — each shows current pharmacy stock (0 if not yet stocked) */}
              {unifiedResults.map(({ master: cp, inventory: inv }) => {
                const stock = inv?.currentStock ?? 0;
                const alreadyStocked = stock > 0;
                return (
                  <button
                    key={cp.id}
                    type="button"
                    onClick={() => {
                      if (inv) {
                        selectProduct(inv, cp);
                      } else {
                        setSelectedCatalogProduct(cp);
                        createCatalogMutation.mutate(cp);
                      }
                    }}
                    disabled={createCatalogMutation.isPending && selectedCatalogProduct?.id === cp.id}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#EDF7F3] border-b border-[#D6F0E8] last:border-0 disabled:opacity-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#0D4035]">
                          {cp.genericName}{cp.strength ? ` ${cp.strength}` : ''}{cp.dosageForm ? ` · ${cp.dosageForm}` : ''}
                        </p>
                        <p className="text-xs text-[#64748B]">
                          {[cp.brandName, cp.manufacturer].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
                        alreadyStocked
                          ? 'bg-[#EDF7F3] text-[#1A6B5C]'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {alreadyStocked ? `${stock.toLocaleString()} in stock` : '0 in stock'}
                      </span>
                    </div>
                    {createCatalogMutation.isPending && selectedCatalogProduct?.id === cp.id && (
                      <p className="mt-0.5 text-xs text-[#1A6B5C]">Creating product record…</p>
                    )}
                  </button>
                );
              })}

              {/* Pharmacy-only products (manually added, no master catalog match) */}
              {inventoryOnlyProducts.map(p => (
                <button key={p.id} type="button" onClick={() => selectProduct(p)}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#EDF7F3] border-b border-[#D6F0E8] last:border-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0D4035]">{productName(p)}</p>
                      <p className="text-xs text-[#64748B]">
                        {[p.brandName && `Brand: ${p.brandName}`, p.genericName, p.dosageForm, p.strength].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
                      (p.currentStock ?? 0) > 0 ? 'bg-[#EDF7F3] text-[#1A6B5C]' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {(p.currentStock ?? 0) > 0 ? `${(p.currentStock ?? 0).toLocaleString()} in stock` : '0 in stock'}
                    </span>
                  </div>
                </button>
              ))}

              {!isProductFetching && !isMasterFetching && unifiedResults.length === 0 && inventoryOnlyProducts.length === 0 && (productsData || masterCatalogData) && (
                <div className="px-4 py-3">
                  <p className="text-sm text-[#92400E]">No match in TMDA catalogue.</p>
                  <Link to="/inventory/products/new" className="mt-1 block text-xs font-medium text-[#1A6B5C] hover:underline">
                    Add product manually →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Barcode mapping */}
          {pendingBarcode && !pendingBarcode.product && selectedProduct && (
            <div className="rounded-2xl border border-[#D6F0E8] bg-[#EDF7F3] px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-xs text-[#64748B]">Map barcode {pendingBarcode.barcode} → {productName(selectedProduct)}</p>
              <Button type="button" size="sm" variant="secondary" loading={saveMappingMutation.isPending}
                onClick={() => saveMappingMutation.mutate({ barcode: pendingBarcode.barcode, productId: selectedProduct.id })}>
                Save barcode mapping
              </Button>
            </div>
          )}
        </div>

        {/* Batch + pricing form */}
        <div ref={batchFormRef} />
        <form onSubmit={handleSubmit(onAddLine)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Batch Number"
              placeholder="Auto-generated when product is selected"
              hint="Generated automatically. Clear it only if you need to enter the supplier's exact batch number."
              {...register('batchNumber')}
              error={errors.batchNumber?.message}
              required
            />
            <Input label="Expiry Date" type="date" {...register('expiryDate')} error={errors.expiryDate?.message} required />
            <Input label="Quantity Received" type="number" min="1" placeholder="100" {...register('quantity')} error={errors.quantity?.message} required />
          </div>

          {/* Intake expiry warning */}
          {intakeExpiryWarning && (
            <div className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
              intakeExpiryWarning.level === 'EXPIRED'  ? 'bg-red-950 text-red-200 border border-red-800' :
              intakeExpiryWarning.level === 'CRITICAL' ? 'bg-red-100 text-red-800 border border-red-300' :
              intakeExpiryWarning.level === 'URGENT'   ? 'bg-orange-100 text-orange-800 border border-orange-300' :
              intakeExpiryWarning.level === 'WARNING'  ? 'bg-amber-50 text-amber-800 border border-amber-300' :
              intakeExpiryWarning.level === 'CAUTION'  ? 'bg-blue-50 text-blue-800 border border-blue-200' :
              'bg-[#EDF7F3] text-[#1A6B5C] border border-[#D6F0E8]'
            }`}>
              <span className="mt-0.5 shrink-0">
                {intakeExpiryWarning.level === 'EXPIRED'  ? '⛔' :
                 intakeExpiryWarning.level === 'CRITICAL' ? '🔴' :
                 intakeExpiryWarning.level === 'URGENT'   ? '🟠' :
                 intakeExpiryWarning.level === 'WARNING'  ? '🟡' :
                 intakeExpiryWarning.level === 'CAUTION'  ? '🔵' : 'ℹ️'}
              </span>
              <span>{intakeExpiryWarning.msg}</span>
            </div>
          )}

          {/* Unit/pack price toggle */}
          <div className="rounded-2xl border border-[#D6F0E8] bg-[#F8FCFA] px-4 py-4 space-y-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-[#0D4035]">Price mode</span>
              <div className="flex rounded-xl overflow-hidden border border-[#D6F0E8]">
                {(['UNIT', 'PACK'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setValue('priceMode', mode)}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                      watchedPriceMode === mode ? 'bg-[#1A6B5C] text-white' : 'bg-white text-[#64748B] hover:bg-[#EDF7F3]'
                    }`}
                  >
                    {mode === 'UNIT' ? 'Unit cost' : 'Pack cost'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={watchedPriceMode === 'PACK' ? 'Pack Price (Tsh)' : 'Purchase Price (Tsh)'}
                type="number" step="0.01" min="0.01" placeholder="1500.00"
                {...register('enteredPrice')}
                error={errors.enteredPrice?.message}
                required
              />
              {watchedPriceMode === 'PACK' && (
                <Input
                  label="Units per pack"
                  type="number" min="1" placeholder="30"
                  {...register('packSize')}
                  error={errors.packSize?.message}
                  required
                  hint="Divide pack price by this to get unit cost"
                />
              )}
              <div>
                <Input
                  label="Selling price per unit (Tsh)"
                  type="number" step="0.01" min="0.01" placeholder="2000.00"
                  {...register('sellingPrice')}
                  error={errors.sellingPrice?.message}
                />
                {profitMargin !== null && (
                  <p className={`mt-1 text-xs font-medium ${
                    profitMargin.pct < 0  ? 'text-[#DC2626]' :
                    profitMargin.pct < 15 ? 'text-[#D97706]' :
                    profitMargin.pct > 150 ? 'text-[#D97706]' :
                    'text-[#1A6B5C]'
                  }`}>
                    Margin: {profitMargin.pct}%
                    {profitMargin.pct < 0   ? ' — selling below cost' :
                     profitMargin.pct < 15  ? ' — low margin' :
                     profitMargin.pct > 150 ? ' — unusually high, verify' : ' — good'}
                  </p>
                )}
              </div>
            </div>

            {watchedPriceMode === 'PACK' && Number(watchedPackSize) > 1 && Number(watchedEnteredPrice) > 0 && (
              <p className="text-xs text-[#64748B]">
                Unit cost: <strong className="text-[#0D4035]">Tsh {currentUnitPrice.toLocaleString('en-TZ', { maximumFractionDigits: 2 })}</strong>
              </p>
            )}

            {/* Price hint */}
            {liveHint && liveHint.status !== 'OK' && (
              <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ${
                liveHint.status === 'HIGH' ? 'bg-amber-50 border border-amber-200 text-[#92400E]' : 'bg-red-50 border border-red-200 text-[#991B1B]'
              }`}>
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <span>
                  {liveHint.status === 'HIGH'
                    ? `Price looks high — more than 2× the median (Tsh ${liveHint.median.toLocaleString('en-TZ', { maximumFractionDigits: 0 })}). Check if this is a pack price entered as a unit price.`
                    : `Price looks low — less than half the median (Tsh ${liveHint.median.toLocaleString('en-TZ', { maximumFractionDigits: 0 })}). Verify the amount.`}
                </span>
              </div>
            )}
            {liveHint && liveHint.status === 'OK' && existingPrices.length >= 2 && (
              <p className="text-xs text-[#1A6B5C]">
                Price is consistent with historical data (median Tsh {liveHint.median.toLocaleString('en-TZ', { maximumFractionDigits: 0 })}).
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={!selectedProduct} leftIcon={<Package size={16} />}>
              Add to cart
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!selectedProduct}
              loading={receiveAllMutation.isPending}
              onClick={handleSubmit((data) => {
                const line = makeCartLine(data);
                if (line) receiveAllMutation.mutate([line]);
              })}
            >
              Receive Stock
            </Button>
          </div>
        </form>
      </Card>

      </div>{/* end left column */}

      {/* ── Cart — right column ─────────────────────────────────────────────── */}
      <div className="xl:sticky xl:top-5">
        <Card
          padding={false}
          header={
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <PackageCheck size={16} className="text-[#1A6B5C]" />
                <span className="text-sm font-semibold text-[#0D4035]">
                  Intake cart
                </span>
                {cart.length > 0 && (
                  <Badge variant="info" size="sm">{cart.length}</Badge>
                )}
              </div>
              {cart.length > 0 && (
                <button type="button" onClick={() => setCart([])} className="text-xs text-[#64748B] hover:text-[#DC2626]">
                  Clear all
                </button>
              )}
            </div>
          }
        >
          {cart.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[#94A3B8]">
              <Package size={28} className="mx-auto mb-2 opacity-30" />
              No items yet. Add a product from the form.
            </div>
          ) : (
            <>
              <div className="divide-y divide-[#D6F0E8]">
                {cart.map(line => {
                  const margin = line.sellingPrice && line.unitPrice > 0
                    ? Math.round(((line.sellingPrice - line.unitPrice) / line.unitPrice) * 100)
                    : null;
                  return (
                    <div key={line.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-[#0D4035] truncate">{productName(line.product)}</p>
                          {line.priceHint && line.priceHint.status !== 'OK' && (
                            <Badge variant="warning" size="sm">{line.priceHint.status === 'HIGH' ? 'Price high' : 'Price low'}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          Batch: {line.batchNumber} · Exp: {line.expiryDate} · Qty: {line.quantity}
                        </p>
                        <p className="text-xs text-[#64748B]">
                          Cost Tsh {line.unitPrice.toLocaleString('en-TZ', { maximumFractionDigits: 0 })}
                          {line.sellingPrice ? ` · Sell Tsh ${line.sellingPrice.toLocaleString('en-TZ', { maximumFractionDigits: 0 })}` : ''}
                          {margin !== null && (
                            <span className={`ml-1 font-medium ${margin < 0 ? 'text-[#DC2626]' : margin < 15 ? 'text-[#D97706]' : 'text-[#1A6B5C]'}`}>
                              · {margin}% margin
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCart(prev => prev.filter(l => l.id !== line.id))}
                        className="p-1.5 text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-[#D6F0E8] px-4 py-4">
                <Button
                  onClick={() => receiveAllMutation.mutate(undefined)}
                  loading={receiveAllMutation.isPending}
                  leftIcon={<PackageCheck size={16} />}
                  className="w-full"
                >
                  Receive all {cart.length} item{cart.length > 1 ? 's' : ''}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      </div>{/* end grid */}
    </div>
  );
};

export default StockIntakePage;
