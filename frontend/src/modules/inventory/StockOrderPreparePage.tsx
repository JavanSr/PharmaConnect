import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Download,
  PackagePlus,
  Search,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { Product, Supplier } from '@/types';
import { groupItemsBySupplier, type LowStockSuggestion, type StockOrder, type StockOrderItem } from './stockOrderTypes';

// ---- Types ------------------------------------------------------------------

type DrugMasterEntry = {
  id: string;
  productName: string;
  genericName: string;
  brandName: string | null;
  manufacturer: string | null;
  dosageForm: string | null;
  strength: string | null;
  storageCondition: string;
  isColdChain: boolean;
  isEssentialMedicine: boolean;
  therapeuticCategory: string | null;
  tmdaRegistrationNumber: string;
};

type SearchResult =
  | { source: 'inventory'; product: Product }
  | { source: 'catalogue'; entry: DrugMasterEntry };

type OrderItemPayload = {
  productId?: string;
  productName: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  supplierId?: string;
  quantityOrdered: number;
  expectedUnitCost?: number;
  notes?: string;
};

type EditableItem = StockOrderItem & { dirty?: boolean };

/** Supplier price option from /suppliers/price-comparison */
type PriceOption = {
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  quantity: number | null;
  minimumOrderQuantity: number | null;
};

// ---- Helpers ----------------------------------------------------------------

function productLabel(product: Pick<Product, 'name' | 'genericName' | 'brandName' | 'strength' | 'dosageForm'>) {
  return [product.name, product.strength, product.dosageForm].filter(Boolean).join(' | ');
}

function itemPayloadFromProduct(
  product: Product | LowStockSuggestion,
  quantity: number,
  supplierId?: string,
): OrderItemPayload {
  return {
    productId: product.id,
    productName: 'name' in product ? product.name : '',
    genericName: product.genericName ?? undefined,
    strength: product.strength ?? undefined,
    dosageForm: product.dosageForm ?? undefined,
    supplierId: supplierId || ('lastSupplierId' in product ? (product.lastSupplierId ?? undefined) : undefined),
    quantityOrdered: Math.max(quantity, 1),
  };
}

function itemPayloadFromCatalogueEntry(entry: DrugMasterEntry): OrderItemPayload {
  return {
    productName: entry.brandName ?? entry.genericName,
    genericName: entry.genericName,
    strength: entry.strength ?? undefined,
    dosageForm: entry.dosageForm ?? undefined,
    quantityOrdered: 1,
  };
}

function fmtTsh(value: number) {
  return `Tsh ${value.toLocaleString('en-TZ', { maximumFractionDigits: 0 })}`;
}

/** Urgency level for a low-stock suggestion */
function suggestionUrgency(s: LowStockSuggestion): 'critical' | 'warning' | 'info' {
  if (s.currentStock <= 0) return 'critical';
  if (s.currentStock < s.reorderLevel / 2) return 'warning';
  return 'info';
}

// ---- Component --------------------------------------------------------------

export const StockOrderPreparePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const toast = useNotificationStore((s) => s.toast);
  const prefillLowStock = new URLSearchParams(location.search).get('prefill') === 'low-stock';

  // -- Core state -------------------------------------------------------------
  const [search, setSearch] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(prefillLowStock);
  const [orderId, setOrderId] = useState(id ?? '');
  const [items, setItems] = useState<EditableItem[]>([]);
  const [notes, setNotes] = useState('');
  const [savedState, setSavedState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [dirtyItemIds, setDirtyItemIds] = useState<Set<string>>(new Set());
  const immediateSearch = search.trim();
  const saveTimerRef = useRef<number | null>(null);

  // -- New state --------------------------------------------------------------
  /** productId -> currentStock, populated when items are added */
  const [stockContextMap, setStockContextMap] = useState<Map<string, number>>(new Map());
  /** productName -> sorted price options from Supplier Discovery */
  const [priceMap, setPriceMap] = useState<Map<string, PriceOption[]>>(new Map());
  /** itemId set -- which cart rows have the price comparison panel open */
  const [expandedPrices, setExpandedPrices] = useState<Set<string>>(new Set());
  /** productNames currently being fetched */
  const [fetchingPrices, setFetchingPrices] = useState<Set<string>>(new Set());
  /** Submit confirm modal open */
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  /** Export loading state */
  const [exportLoading, setExportLoading] = useState<'text' | null>(null);
  /** Portal link returned after submit — shown so pharmacy can copy/send */
  const [portalResult, setPortalResult] = useState<{ link: string; token: string } | null>(null);
  /** Supplier contact for portal notification */
  const [portalSupplierName, setPortalSupplierName] = useState('');
  const [portalSupplierPhone, setPortalSupplierPhone] = useState('');

  // -- Queries ----------------------------------------------------------------
  const { data: orderData } = useQuery({
    queryKey: ['stock-order', orderId],
    queryFn: () => api.get(`/stock-orders/${orderId}`).then((r) => r.data.data as StockOrder),
    enabled: Boolean(orderId),
  });

  const { data: suggestionsData } = useQuery({
    queryKey: ['stock-order-suggestions'],
    queryFn: () => api.get('/stock-orders/suggestions').then((r) => r.data.data as LowStockSuggestion[]),
    enabled: suggestionsOpen,
  });

  const { data: productData, isFetching: inventoryFetching, isError: inventoryError } = useQuery({
    queryKey: ['order-product-search', immediateSearch],
    queryFn: async ({ signal }) =>
      api
        .get('/inventory/products/suggestions', { params: { search: immediateSearch, limit: 12 }, signal, timeout: 8000 })
        .then((r) => r.data),
    enabled: immediateSearch.length > 1,
    staleTime: 30_000,
    networkMode: 'always',
    retry: 1,
  });

  const { data: catalogueData, isFetching: catalogueFetching, isError: catalogueError } = useQuery({
    queryKey: ['drug-master-search', immediateSearch],
    queryFn: async ({ signal }) =>
      api
        .get('/inventory/drug-master', { params: { q: immediateSearch, limit: 20 }, signal, timeout: 8000 })
        .then((r) => r.data),
    enabled: immediateSearch.length > 1,
    staleTime: 30_000,
    networkMode: 'always',
    retry: 1,
  });

  const { data: supplierData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/inventory/suppliers').then((r) => r.data.data as Supplier[]),
  });

  // -- Derived ----------------------------------------------------------------
  const productsLoading = inventoryFetching || catalogueFetching;
  const productsError = inventoryError && catalogueError && !productsLoading;

  const suggestions = suggestionsData ?? [];
  const inventoryProducts: Product[] = productData?.data ?? [];
  const catalogueEntries: DrugMasterEntry[] = catalogueData?.data ?? [];

  const inventoryGenericNames = new Set(
    inventoryProducts.map((p) => p.genericName?.toLowerCase().trim()).filter(Boolean) as string[],
  );
  const newCatalogueEntries = catalogueEntries.filter(
    (entry) => !inventoryGenericNames.has(entry.genericName.toLowerCase().trim()),
  );
  const mergedResults: SearchResult[] = [
    ...inventoryProducts.map((p): SearchResult => ({ source: 'inventory', product: p })),
    ...newCatalogueEntries.map((e): SearchResult => ({ source: 'catalogue', entry: e })),
  ];

  const suppliers = supplierData ?? [];
  const supplierOptions = [
    { value: '', label: 'No supplier assigned' },
    ...suppliers.map((s) => ({ value: s.id, label: s.name })),
  ];

  const groupedItems = useMemo(() => groupItemsBySupplier(items), [items]);
  const totalUnits = items.reduce((sum, item) => sum + item.quantityOrdered, 0);

  const estimatedTotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const cost = Number(item.expectedUnitCost) || 0;
        return sum + cost * item.quantityOrdered;
      }, 0),
    [items],
  );

  const groupTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const group of groupedItems) {
      const total = group.items.reduce((sum, item) => {
        const cost = Number(item.expectedUnitCost) || 0;
        return sum + cost * item.quantityOrdered;
      }, 0);
      map.set(group.key, total);
    }
    return map;
  }, [groupedItems]);

  // -- Effects ----------------------------------------------------------------
  useEffect(() => {
    if (suggestions.length > 0) setSuggestionsOpen(true);
  }, [suggestions.length]);

  useEffect(() => {
    if (!orderData) return;
    setItems((orderData.items ?? []) as EditableItem[]);
    setNotes(orderData.notes ?? '');
  }, [orderData]);

  // -- Price comparison -------------------------------------------------------
  const fetchPrices = async (productName: string) => {
    if (priceMap.has(productName) || fetchingPrices.has(productName)) return;
    setFetchingPrices((prev) => new Set(prev).add(productName));
    try {
      const r = await api.get('/suppliers/price-comparison', { params: { productName } });
      const options: PriceOption[] = (r.data.data ?? []).sort(
        (a: PriceOption, b: PriceOption) => a.unitPrice - b.unitPrice,
      );
      setPriceMap((prev) => new Map(prev).set(productName, options));
    } catch {
      // silent -- price comparison is non-critical
    } finally {
      setFetchingPrices((prev) => {
        const next = new Set(prev);
        next.delete(productName);
        return next;
      });
    }
  };

  const togglePrices = (item: EditableItem) => {
    const next = new Set(expandedPrices);
    if (next.has(item.id)) {
      next.delete(item.id);
    } else {
      next.add(item.id);
      void fetchPrices(item.productName);
    }
    setExpandedPrices(next);
  };

  // -- Mutations --------------------------------------------------------------
  const createOrderMutation = useMutation({
    mutationFn: (payload: { items: OrderItemPayload[] }) =>
      api.post('/stock-orders', { notes: notes || undefined, items: payload.items }).then((r) => r.data.data as StockOrder),
    onSuccess: (order) => {
      setOrderId(order.id);
      setItems((order.items ?? []) as EditableItem[]);
      queryClient.invalidateQueries({ queryKey: ['stock-orders'] });
      navigate(`/inventory/stock-orders/${order.id}/edit`, { replace: true });
      setSavedState('saved');
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Failed to create order'),
  });

  const addItemMutation = useMutation({
    mutationFn: (payload: OrderItemPayload) =>
      api.post(`/stock-orders/${orderId}/items`, payload).then((r) => r.data.data as StockOrder),
    onSuccess: (order) => {
      setItems((order.items ?? []) as EditableItem[]);
      queryClient.invalidateQueries({ queryKey: ['stock-order', orderId] });
      setSavedState('saved');
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Failed to add item'),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: Partial<OrderItemPayload> }) =>
      api.patch(`/stock-orders/${orderId}/items/${itemId}`, data).then((r) => r.data.data as StockOrder),
    onSuccess: (order) => {
      setItems((order.items ?? []) as EditableItem[]);
      setSavedState('saved');
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Failed to save item'),
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) =>
      api.delete(`/stock-orders/${orderId}/items/${itemId}`).then((r) => r.data.data as StockOrder),
    onSuccess: (order) => {
      setItems((order.items ?? []) as EditableItem[]);
      setSavedState('saved');
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Failed to remove item'),
  });

  const saveOrderMutation = useMutation({
    mutationFn: () => api.patch(`/stock-orders/${orderId}`, { notes }).then((r) => r.data.data as StockOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-orders'] });
      setSavedState('saved');
      toast.success('Draft saved');
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Failed to save draft'),
  });

  const submitMutation = useMutation({
    mutationFn: (opts: { supplierName?: string; supplierPhone?: string }) =>
      api
        .post(`/stock-orders/${orderId}/submit`, opts)
        .then((r) => r.data.data as StockOrder & { portalLink?: string; portalToken?: string }),
    onSuccess: (order) => {
      if (order.portalLink && order.portalToken) {
        setPortalResult({ link: order.portalLink, token: order.portalToken });
      } else {
        toast.success(`${order.orderNumber} submitted`);
        navigate(`/inventory/stock-orders/${order.id}`);
      }
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Failed to submit order'),
  });

  // -- Debounced auto-save ----------------------------------------------------
  useEffect(() => {
    if (!orderId || dirtyItemIds.size === 0) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      const dirtyIds = Array.from(dirtyItemIds);
      setDirtyItemIds(new Set());
      for (const itemId of dirtyIds) {
        const item = items.find((entry) => entry.id === itemId);
        if (!item) continue;
        updateItemMutation.mutate({
          itemId,
          data: {
            quantityOrdered: item.quantityOrdered,
            supplierId: item.supplierId || undefined,
            expectedUnitCost: item.expectedUnitCost ? Number(item.expectedUnitCost) : undefined,
            notes: item.notes ?? undefined,
          },
        });
      }
    }, 800);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [dirtyItemIds, items, orderId]);

  // -- Add helpers ------------------------------------------------------------
  const addPayload = async (payload: OrderItemPayload) => {
    setSavedState('saving');
    if (!orderId) {
      createOrderMutation.mutate({ items: [payload] });
      return;
    }
    addItemMutation.mutate(payload);
  };

  const addProduct = (product: Product) => {
    const existing = items.find((i) => i.productId === product.id);
    if (existing) {
      updateLocalItem(existing.id, { quantityOrdered: existing.quantityOrdered + 1 });
      toast.info(`${product.name} already in order -- quantity updated`);
      return;
    }
    if (product.id) {
      setStockContextMap((prev) => new Map(prev).set(product.id, (product as any).currentStock ?? 0));
    }
    const supplierId = (product as any).lastSupplierId ?? '';
    void addPayload(itemPayloadFromProduct(product, 1, supplierId));
  };

  const addCatalogueEntry = (entry: DrugMasterEntry) => {
    void addPayload(itemPayloadFromCatalogueEntry(entry));
  };

  const addSuggestion = (suggestion: LowStockSuggestion) => {
    const existing = items.find((i) => i.productId === suggestion.id);
    if (existing) {
      toast.info(`${suggestion.name} already in order`);
      return;
    }
    setStockContextMap((prev) => new Map(prev).set(suggestion.id, suggestion.currentStock));
    void addPayload(
      itemPayloadFromProduct(suggestion, suggestion.suggestedOrderQuantity, suggestion.lastSupplierId ?? undefined),
    );
  };

  const addAllSuggestions = () => {
    const existingProductIds = new Set(items.map((item) => item.productId).filter(Boolean));
    const payloads = suggestions
      .filter((s) => !existingProductIds.has(s.id))
      .map((s) => {
        setStockContextMap((prev) => new Map(prev).set(s.id, s.currentStock));
        return itemPayloadFromProduct(s, s.suggestedOrderQuantity, s.lastSupplierId ?? undefined);
      });
    if (payloads.length === 0) {
      toast.info('All suggestions are already in the order');
      return;
    }
    setSavedState('saving');
    if (!orderId) {
      createOrderMutation.mutate({ items: payloads });
      return;
    }
    payloads.forEach((payload) => addItemMutation.mutate(payload));
  };

  const updateLocalItem = (itemId: string, patch: Partial<EditableItem>) => {
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...patch, dirty: true } : item)));
    setDirtyItemIds((prev) => new Set(prev).add(itemId));
    setSavedState('saving');
  };

  // -- Export helpers ---------------------------------------------------------
  const handleExportText = async () => {
    if (!orderId) return;
    setExportLoading('text');
    try {
      const r = await api.get(`/stock-orders/${orderId}/export/text`, { responseType: 'text' });
      const blob = new Blob([r.data as string], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${orderData?.orderNumber ?? 'purchase-order'}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not download order');
    } finally {
      setExportLoading(null);
    }
  };

  const handleWhatsAppGroup = async (
    supplierPhone: string | undefined,
    groupItems: StockOrderItem[],
    supplierName: string,
  ) => {
    const orderNum = orderData?.orderNumber ?? 'Draft';
    const itemLines = groupItems
      .map((item, i) => {
        const parts = [`${i + 1}. ${item.productName}`];
        if (item.genericName) parts.push(`(${item.genericName})`);
        if (item.strength) parts.push(item.strength);
        parts.push(`- Qty: ${item.quantityOrdered}`);
        if (item.expectedUnitCost) parts.push(`@ Tsh ${Number(item.expectedUnitCost).toLocaleString()}`);
        return parts.join(' ');
      })
      .join('\n');
    const text = `*Purchase Order ${orderNum}*\nTo: ${supplierName}\n\n${itemLines}\n\nPlease confirm receipt and availability.`;
    const encoded = encodeURIComponent(text);
    const phone = supplierPhone?.replace(/\D/g, '');
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  // -- Render -----------------------------------------------------------------
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0D4035]">{orderData?.orderNumber ?? 'Prepare Stock Order'}</h1>
          <p className="text-sm text-[#64748B]">
            Build a supplier-grouped purchase order from low-stock suggestions or product search.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {orderId && items.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Download size={14} />}
              loading={exportLoading === 'text'}
              onClick={handleExportText}
            >
              Download TXT
            </Button>
          )}
          <div className="text-xs text-[#64748B]">
            {savedState === 'saving' && 'Saving...'}
            {savedState === 'saved' && (
              <span className="inline-flex items-center gap-1 text-[#1A6B5C]">
                <Check size={14} /> Saved
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(460px,0.9fr)]">
        {/* Left column */}
        <div className="space-y-5">
          {/* Search */}
          <Card header={<span className="text-sm font-semibold text-[#0D4035]">Add products</span>}>
            <Input
              label="Search medicines"
              placeholder="Search by generic name, brand, or strength"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={16} />}
            />
            {immediateSearch.length > 1 && (
              <div className="mt-3">
                {productsLoading && (
                  <p className="rounded-xl border border-[#D6F0E8] px-4 py-3 text-sm text-[#64748B]">
                    Searching for &ldquo;{immediateSearch}&rdquo;...
                  </p>
                )}
                {productsError && (
                  <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                    Could not reach the server.
                  </p>
                )}
                {!productsLoading && !productsError && mergedResults.length === 0 && (
                  <p className="rounded-xl border border-[#D6F0E8] px-4 py-3 text-sm text-[#64748B]">
                    No medicines found for &ldquo;{immediateSearch}&rdquo;. Try a shorter name.
                  </p>
                )}
                {!productsLoading && mergedResults.length > 0 && (
                  <div className="overflow-hidden rounded-xl border border-[#D6F0E8]">
                    {mergedResults.map((result) => {
                      if (result.source === 'inventory') {
                        const product = result.product;
                        const alreadyInCart = items.some((i) => i.productId === product.id);
                        return (
                          <div
                            key={`inv-${product.id}`}
                            className="flex items-center justify-between gap-3 border-b border-[#D6F0E8] px-4 py-3 last:border-0 hover:bg-[#F8FCFA]"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-[#0D4035]">{productLabel(product)}</p>
                                <span className="inline-flex items-center rounded-full bg-[#D6F0E8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1A6B5C]">
                                  In stock
                                </span>
                                {alreadyInCart && (
                                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                    In order
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-[#64748B]">
                                {[
                                  product.genericName && `Generic: ${product.genericName}`,
                                  product.brandName && `Brand: ${product.brandName}`,
                                  `Stock: ${(product as any).currentStock ?? 0}`,
                                ]
                                  .filter(Boolean)
                                  .join(' - ')}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => addProduct(product)}
                              leftIcon={<PackagePlus size={14} />}
                            >
                              {alreadyInCart ? '+1' : 'Add'}
                            </Button>
                          </div>
                        );
                      }

                      const entry = result.entry;
                      return (
                        <div
                          key={`cat-${entry.id}`}
                          className="flex items-center justify-between gap-3 border-b border-[#D6F0E8] px-4 py-3 last:border-0 hover:bg-[#F8FCFA]"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium text-[#0D4035]">
                                {[entry.brandName ?? entry.genericName, entry.strength, entry.dosageForm]
                                  .filter(Boolean)
                                  .join(' | ')}
                              </p>
                              <span className="inline-flex items-center rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                                Drug catalogue
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-[#64748B]">
                              {[
                                `Generic: ${entry.genericName}`,
                                entry.manufacturer && `Mfr: ${entry.manufacturer}`,
                                entry.therapeuticCategory,
                              ]
                                .filter(Boolean)
                                .join(' - ')}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => addCatalogueEntry(entry)}
                            leftIcon={<PackagePlus size={14} />}
                          >
                            Add
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Low-stock suggestions */}
          <Card
            header={
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setSuggestionsOpen((v) => !v)}
              >
                <span className="text-sm font-semibold text-[#0D4035]">Low Stock Suggestions</span>
                <Badge variant={suggestions.length > 0 ? 'warning' : 'muted'}>{suggestions.length}</Badge>
              </button>
            }
            padding={suggestionsOpen}
          >
            {suggestionsOpen && (
              <div className="space-y-3">
                {suggestions.length > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={addAllSuggestions}
                    leftIcon={<ClipboardList size={14} />}
                  >
                    Add All Suggestions
                  </Button>
                )}
                {suggestions.length === 0 && (
                  <p className="text-sm text-[#64748B]">No products are at or below reorder level.</p>
                )}
                <div className="space-y-2">
                  {suggestions.map((suggestion) => {
                    const urgency = suggestionUrgency(suggestion);
                    const alreadyIn = items.some((i) => i.productId === suggestion.id);
                    const borderClass =
                      urgency === 'critical'
                        ? 'border-red-200 bg-red-50/40'
                        : urgency === 'warning'
                          ? 'border-amber-200 bg-amber-50/40'
                          : 'border-[#D6F0E8]';

                    return (
                      <div
                        key={suggestion.id}
                        className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 ${borderClass}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-[#0D4035]">{suggestion.name}</p>
                            {urgency === 'critical' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                                <AlertTriangle size={10} /> Out of stock
                              </span>
                            )}
                            {urgency === 'warning' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                <AlertTriangle size={10} /> Critically low
                              </span>
                            )}
                            {alreadyIn && (
                              <span className="inline-flex items-center rounded-full bg-[#D6F0E8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1A6B5C]">
                                In order
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#64748B]">
                            Stock {suggestion.currentStock} / reorder {suggestion.reorderLevel} - Order qty{' '}
                            {suggestion.suggestedOrderQuantity} - {suggestion.lastSupplier?.name ?? 'No supplier'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => addSuggestion(suggestion)}
                          disabled={alreadyIn}
                        >
                          {alreadyIn ? 'Added' : 'Add'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right column -- cart */}
        <Card
          header={
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-[#0D4035]">Order cart</span>
              <div className="flex items-center gap-2">
                <Badge variant="info">{totalUnits} units</Badge>
                {estimatedTotal > 0 && (
                  <span className="text-xs font-semibold text-[#1A6B5C]">{fmtTsh(estimatedTotal)}</span>
                )}
              </div>
            </div>
          }
        >
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D6F0E8] px-4 py-8 text-center text-sm text-[#64748B]">
              Add products to create a draft order.
            </div>
          ) : (
            <div className="space-y-4">
              {groupedItems.map((group) => {
                const groupTotal = groupTotals.get(group.key) ?? 0;
                return (
                  <div key={group.key} className="rounded-xl border border-[#D6F0E8]">
                    {/* Supplier group header */}
                    <div className="flex items-start justify-between gap-3 border-b border-[#D6F0E8] bg-[#F8FCFA] px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-[#0D4035]">{group.supplierName}</p>
                        <p className="text-xs text-[#64748B]">
                          {group.items.length} item{group.items.length === 1 ? '' : 's'}
                          {group.supplier?.phone ? ` - ${group.supplier.phone}` : ''}
                          {group.supplier?.email ? ` - ${group.supplier.email}` : ''}
                        </p>
                        {groupTotal > 0 && (
                          <p className="mt-0.5 text-xs font-semibold text-[#1A6B5C]">
                            Est. {fmtTsh(groupTotal)}
                          </p>
                        )}
                      </div>
                      {group.supplier && (
                        <button
                          type="button"
                          onClick={() =>
                            handleWhatsAppGroup(group.supplier?.phone ?? undefined, group.items, group.supplierName)
                          }
                          className="flex-shrink-0 rounded-lg border border-[#D6F0E8] px-3 py-1.5 text-xs font-semibold text-[#1A6B5C] hover:bg-[#EDF7F3]"
                          title="Send order to supplier via WhatsApp"
                        >
                          WhatsApp
                        </button>
                      )}
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-[#D6F0E8]">
                      {group.items.map((item) => {
                        const stockCtx = item.productId ? stockContextMap.get(item.productId) : undefined;
                        const prices = priceMap.get(item.productName);
                        const pricesExpanded = expandedPrices.has(item.id);
                        const fetchingThisPrice = fetchingPrices.has(item.productName);
                        const lineTotal =
                          Number(item.expectedUnitCost) > 0
                            ? Number(item.expectedUnitCost) * item.quantityOrdered
                            : null;

                        return (
                          <div key={item.id} className="space-y-3 px-4 py-3">
                            {/* Item name + stock context + remove */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#0D4035]">{item.productName}</p>
                                <p className="text-xs text-[#64748B]">
                                  {[item.genericName, item.strength, item.dosageForm].filter(Boolean).join(' | ')}
                                </p>
                                {stockCtx !== undefined && (
                                  <p className="mt-0.5 text-xs text-[#64748B]">
                                    Currently in stock:{' '}
                                    <span
                                      className={
                                        stockCtx <= 0 ? 'font-bold text-red-600' : 'font-medium text-[#0D4035]'
                                      }
                                    >
                                      {stockCtx} units
                                    </span>
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeItemMutation.mutate(item.id)}
                                className="rounded-lg p-1.5 text-[#64748B] hover:bg-red-50 hover:text-[#DC2626]"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>

                            {/* Fields */}
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <Input
                                  label="Quantity"
                                  type="number"
                                  min="1"
                                  value={item.quantityOrdered}
                                  onChange={(e) =>
                                    updateLocalItem(item.id, { quantityOrdered: Math.max(Number(e.target.value), 1) })
                                  }
                                />
                              </div>
                              <div>
                                <Input
                                  label={`Unit cost (Tsh)${lineTotal ? ` - Total: ${fmtTsh(lineTotal)}` : ''}`}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.expectedUnitCost ?? ''}
                                  onChange={(e) => updateLocalItem(item.id, { expectedUnitCost: e.target.value })}
                                />
                              </div>
                              <Select
                                label="Supplier"
                                options={supplierOptions}
                                value={item.supplierId ?? ''}
                                onChange={(e) => updateLocalItem(item.id, { supplierId: e.target.value || null })}
                              />
                              <Input
                                label="Notes"
                                value={item.notes ?? ''}
                                onChange={(e) => updateLocalItem(item.id, { notes: e.target.value })}
                              />
                            </div>

                            {/* Price comparison toggle */}
                            <button
                              type="button"
                              onClick={() => togglePrices(item)}
                              className="flex items-center gap-1 text-xs text-[#1A6B5C] hover:underline"
                            >
                              {pricesExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              {fetchingThisPrice
                                ? 'Loading supplier prices...'
                                : pricesExpanded
                                  ? 'Hide supplier prices'
                                  : 'Compare supplier prices'}
                            </button>

                            {/* Price comparison panel */}
                            {pricesExpanded && prices && (
                              <div className="overflow-hidden rounded-xl border border-[#D6F0E8]">
                                {prices.length === 0 ? (
                                  <p className="px-4 py-3 text-xs text-[#64748B]">
                                    No supplier prices found for this product in the catalogue.
                                  </p>
                                ) : (
                                  prices.map((p, idx) => (
                                    <div
                                      key={p.supplierId}
                                      className="flex items-center justify-between gap-3 border-b border-[#D6F0E8] px-4 py-2.5 last:border-0"
                                    >
                                      <div>
                                        <p className="text-xs font-medium text-[#0D4035]">{p.supplierName}</p>
                                        {p.minimumOrderQuantity && (
                                          <p className="text-[11px] text-[#64748B]">
                                            MOQ: {p.minimumOrderQuantity} units
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-[#0D4035]">
                                          {fmtTsh(p.unitPrice)}
                                        </span>
                                        {idx === 0 && (
                                          <span className="rounded-full bg-[#D6F0E8] px-2 py-0.5 text-[10px] font-bold uppercase text-[#1A6B5C]">
                                            Cheapest
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            updateLocalItem(item.id, {
                                              supplierId: p.supplierId,
                                              expectedUnitCost: p.unitPrice,
                                            });
                                          }}
                                          className="rounded-lg border border-[#D6F0E8] px-2.5 py-1 text-[11px] font-semibold text-[#1A6B5C] hover:bg-[#EDF7F3]"
                                        >
                                          Use
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Order notes */}
          <div className="mt-5">
            <Input label="Order notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {/* Grand total */}
          {estimatedTotal > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-[#D6F0E8] bg-[#F8FCFA] px-4 py-3">
              <span className="text-sm font-semibold text-[#0D4035]">Estimated total</span>
              <span className="text-base font-bold text-[#1A6B5C]">{fmtTsh(estimatedTotal)}</span>
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              disabled={!orderId || items.length === 0}
              loading={saveOrderMutation.isPending}
              onClick={() => saveOrderMutation.mutate()}
            >
              Save Draft
            </Button>
            <Button
              disabled={!orderId || items.length === 0}
              loading={submitMutation.isPending}
              onClick={() => setConfirmSubmit(true)}
            >
              Submit Order
            </Button>
          </div>
        </Card>
      </div>

      {/* Confirm submit modal */}
      {confirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-1 text-base font-bold text-[#0D4035]">Submit purchase order?</h2>
            <p className="mb-1 text-sm text-[#64748B]">
              {items.length} item{items.length === 1 ? '' : 's'} across {groupedItems.length} supplier
              {groupedItems.length === 1 ? '' : 's'}.
            </p>
            {estimatedTotal > 0 && (
              <p className="mb-3 text-sm font-semibold text-[#1A6B5C]">Estimated total: {fmtTsh(estimatedTotal)}</p>
            )}

            {/* Supplier portal notification */}
            <div className="mb-4 rounded-xl border border-[#D6F0E8] bg-[#F8FCFA] p-3">
              <p className="mb-2 text-xs font-semibold text-[#0D4035]">Send order link to supplier (optional)</p>
              <p className="mb-2 text-[11px] text-[#64748B]">
                If your supplier is not on APOTEKH, we generate a confirmation link they open in any browser.
              </p>
              <input
                className="mb-2 w-full rounded-lg border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] outline-none focus:border-[#1A6B5C]"
                placeholder="Supplier name (e.g. Shelys Pharma)"
                value={portalSupplierName}
                onChange={(e) => setPortalSupplierName(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] outline-none focus:border-[#1A6B5C]"
                placeholder="Phone number (e.g. +255 712 345 678)"
                type="tel"
                value={portalSupplierPhone}
                onChange={(e) => setPortalSupplierPhone(e.target.value)}
              />
            </div>

            <p className="mb-4 text-xs text-[#64748B]">
              Once submitted the order is locked. You can receive stock against it when the delivery arrives.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmSubmit(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                loading={submitMutation.isPending}
                onClick={() => {
                  setConfirmSubmit(false);
                  submitMutation.mutate({
                    supplierName: portalSupplierName.trim() || undefined,
                    supplierPhone: portalSupplierPhone.trim() || undefined,
                  });
                }}
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Portal link modal -- shown after submit when supplier portal was created */}
      {portalResult && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-1 text-base font-bold text-[#0D4035]">Order submitted</h2>
            <p className="mb-3 text-sm text-[#64748B]">
              Your supplier link is ready. Open WhatsApp to send it, or copy the link below.
            </p>
            <a
              href={portalResult.link}
              target="_blank"
              rel="noreferrer"
              className="mb-3 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white"
            >
              Send via WhatsApp
            </a>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Or copy link</p>
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#D6F0E8] bg-[#F8FCFA] px-3 py-2">
              <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#0D4035]">
                {`${window.location.origin.replace('5173','3000').replace('5174','3000')}/supplier-portal/${portalResult.token}`}
              </span>
              <button
                type="button"
                className="flex-shrink-0 rounded-md bg-[#D6F0E8] px-2 py-1 text-[11px] font-semibold text-[#1A6B5C]"
                onClick={() => navigator.clipboard?.writeText(
                  `${window.location.origin.replace('5173','3000').replace('5174','3000')}/supplier-portal/${portalResult.token}`
                )}
              >
                Copy
              </button>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                setPortalResult(null);
                navigate('/inventory/stock-orders');
              }}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
