import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Check, ClipboardList, PackagePlus, Search, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { useNotificationStore } from '@/stores/notificationStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { Product, Supplier } from '@/types';
import { groupItemsBySupplier, type LowStockSuggestion, type StockOrder, type StockOrderItem } from './stockOrderTypes';

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

function productLabel(product: Pick<Product, 'name' | 'genericName' | 'brandName' | 'strength' | 'dosageForm'>) {
  return [product.name, product.strength, product.dosageForm].filter(Boolean).join(' | ');
}

function itemPayloadFromProduct(product: Product | LowStockSuggestion, quantity: number, supplierId?: string): OrderItemPayload {
  return {
    productId: product.id,
    productName: 'name' in product ? product.name : '',
    genericName: product.genericName ?? undefined,
    strength: product.strength ?? undefined,
    dosageForm: product.dosageForm ?? undefined,
    supplierId: supplierId || ('lastSupplierId' in product ? product.lastSupplierId ?? undefined : undefined),
    quantityOrdered: Math.max(quantity, 1),
  };
}

export const StockOrderPreparePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const toast = useNotificationStore((s) => s.toast);
  const prefillLowStock = new URLSearchParams(location.search).get('prefill') === 'low-stock';

  const [search, setSearch] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(prefillLowStock);
  const [orderId, setOrderId] = useState(id ?? '');
  const [items, setItems] = useState<EditableItem[]>([]);
  const [notes, setNotes] = useState('');
  const [expectedBy, setExpectedBy] = useState('');
  const [savedState, setSavedState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [dirtyItemIds, setDirtyItemIds] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebounce(search, 300);
  const saveTimerRef = useRef<number | null>(null);

  const { data: orderData } = useQuery({
    queryKey: ['stock-order', orderId],
    queryFn: () => api.get(`/stock-orders/${orderId}`).then((r) => r.data.data as StockOrder),
    enabled: Boolean(orderId),
  });

  const { data: suggestionsData } = useQuery({
    queryKey: ['stock-order-suggestions'],
    queryFn: () => api.get('/stock-orders/suggestions').then((r) => r.data.data as LowStockSuggestion[]),
  });

  const { data: productData } = useQuery({
    queryKey: ['order-product-search', debouncedSearch],
    queryFn: () =>
      api.get('/inventory/products', { params: { search: debouncedSearch, limit: 12 } }).then((r) => r.data),
    enabled: debouncedSearch.length > 1,
  });

  const { data: supplierData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/inventory/suppliers').then((r) => r.data.data as Supplier[]),
  });

  const suggestions = suggestionsData ?? [];
  const products: Product[] = productData?.data ?? [];
  const suppliers = supplierData ?? [];
  const supplierOptions = [{ value: '', label: 'No supplier assigned' }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))];

  useEffect(() => {
    if (suggestions.length > 0) {
      setSuggestionsOpen(true);
    }
  }, [suggestions.length]);

  useEffect(() => {
    if (!orderData) return;
    setItems((orderData.items ?? []) as EditableItem[]);
    setNotes(orderData.notes ?? '');
    setExpectedBy(orderData.expectedBy ? orderData.expectedBy.slice(0, 10) : '');
  }, [orderData]);

  const createOrderMutation = useMutation({
    mutationFn: (payload: { items: OrderItemPayload[] }) =>
      api.post('/stock-orders', { notes: notes || undefined, expectedBy: expectedBy || undefined, items: payload.items }).then((r) => r.data.data as StockOrder),
    onSuccess: (order) => {
      setOrderId(order.id);
      setItems((order.items ?? []) as EditableItem[]);
      queryClient.invalidateQueries({ queryKey: ['stock-orders'] });
      navigate(`/inventory/stock-orders/${order.id}/edit`, { replace: true });
      setSavedState('saved');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || e.response?.data?.message || 'Failed to create order'),
  });

  const addItemMutation = useMutation({
    mutationFn: (payload: OrderItemPayload) => api.post(`/stock-orders/${orderId}/items`, payload).then((r) => r.data.data as StockOrder),
    onSuccess: (order) => {
      setItems((order.items ?? []) as EditableItem[]);
      queryClient.invalidateQueries({ queryKey: ['stock-order', orderId] });
      setSavedState('saved');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || e.response?.data?.message || 'Failed to add item'),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: Partial<OrderItemPayload> }) =>
      api.patch(`/stock-orders/${orderId}/items/${itemId}`, data).then((r) => r.data.data as StockOrder),
    onSuccess: (order) => {
      setItems((order.items ?? []) as EditableItem[]);
      setSavedState('saved');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || e.response?.data?.message || 'Failed to save item'),
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => api.delete(`/stock-orders/${orderId}/items/${itemId}`).then((r) => r.data.data as StockOrder),
    onSuccess: (order) => {
      setItems((order.items ?? []) as EditableItem[]);
      setSavedState('saved');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || e.response?.data?.message || 'Failed to remove item'),
  });

  const saveOrderMutation = useMutation({
    mutationFn: () => api.patch(`/stock-orders/${orderId}`, { notes, expectedBy: expectedBy || null }).then((r) => r.data.data as StockOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-orders'] });
      setSavedState('saved');
      toast.success('Draft saved');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || e.response?.data?.message || 'Failed to save draft'),
  });

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/stock-orders/${orderId}/submit`).then((r) => r.data.data as StockOrder),
    onSuccess: (order) => {
      toast.success(`${order.orderNumber} submitted`);
      navigate(`/inventory/stock-orders/${order.id}`);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || e.response?.data?.message || 'Failed to submit order'),
  });

  const addPayload = async (payload: OrderItemPayload) => {
    setSavedState('saving');
    if (!orderId) {
      createOrderMutation.mutate({ items: [payload] });
      return;
    }
    addItemMutation.mutate(payload);
  };

  const addProduct = (product: Product) => {
    const defaultSupplierId = (product as any).lastSupplierId ?? '';
    void addPayload(itemPayloadFromProduct(product, 1, defaultSupplierId));
  };

  const addSuggestion = (suggestion: LowStockSuggestion) => {
    void addPayload(itemPayloadFromProduct(suggestion, suggestion.suggestedOrderQuantity, suggestion.lastSupplierId ?? undefined));
  };

  const addAllSuggestions = () => {
    const existingProductIds = new Set(items.map((item) => item.productId).filter(Boolean));
    const payloads = suggestions
      .filter((suggestion) => !existingProductIds.has(suggestion.id))
      .map((suggestion) => itemPayloadFromProduct(suggestion, suggestion.suggestedOrderQuantity, suggestion.lastSupplierId ?? undefined));
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

  const groupedItems = useMemo(() => groupItemsBySupplier(items), [items]);
  const totalItems = items.reduce((sum, item) => sum + item.quantityOrdered, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0D4035]">{orderData?.orderNumber ?? 'Prepare Stock Order'}</h1>
          <p className="text-sm text-[#64748B]">Build a supplier-grouped purchase order from low-stock suggestions or product search.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#64748B]">
          {savedState === 'saving' && 'Saving...'}
          {savedState === 'saved' && <span className="inline-flex items-center gap-1 text-[#1A6B5C]"><Check size={14} /> Saved</span>}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(460px,0.9fr)]">
        <div className="space-y-5">
          <Card header={<span className="text-sm font-semibold text-[#0D4035]">Add products</span>}>
            <Input
              label="Search inventory"
              placeholder="Search by brand, generic, SKU, or barcode"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={16} />}
            />
            {products.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-xl border border-[#D6F0E8]">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center justify-between gap-3 border-b border-[#D6F0E8] px-4 py-3 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0D4035]">{productLabel(product)}</p>
                      <p className="text-xs text-[#64748B]">
                        {[product.brandName && `Brand: ${product.brandName}`, product.genericName && `Generic: ${product.genericName}`, `Stock: ${product.currentStock ?? 0}`].filter(Boolean).join(' | ')}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => addProduct(product)} leftIcon={<PackagePlus size={14} />}>
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card
            header={
              <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setSuggestionsOpen((v) => !v)}>
                <span className="text-sm font-semibold text-[#0D4035]">Low Stock Suggestions</span>
                <Badge variant={suggestions.length > 0 ? 'warning' : 'muted'}>{suggestions.length}</Badge>
              </button>
            }
            padding={suggestionsOpen}
          >
            {suggestionsOpen && (
              <div className="space-y-3">
                {suggestions.length > 0 && (
                  <Button size="sm" variant="secondary" onClick={addAllSuggestions} leftIcon={<ClipboardList size={14} />}>
                    Add All Suggestions
                  </Button>
                )}
                {suggestions.length === 0 && <p className="text-sm text-[#64748B]">No products are at or below reorder level.</p>}
                <div className="space-y-2">
                  {suggestions.map((suggestion) => (
                    <div key={suggestion.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#D6F0E8] px-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#0D4035]">{suggestion.name}</p>
                        <p className="text-xs text-[#64748B]">
                          Stock {suggestion.currentStock} / reorder {suggestion.reorderLevel} | Qty {suggestion.suggestedOrderQuantity} | {suggestion.lastSupplier?.name ?? 'No supplier'}
                        </p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => addSuggestion(suggestion)}>Add</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        <Card
          header={
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-[#0D4035]">Order cart</span>
              <Badge variant="info">{totalItems} units</Badge>
            </div>
          }
        >
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D6F0E8] px-4 py-8 text-center text-sm text-[#64748B]">
              Add products to create a draft order.
            </div>
          ) : (
            <div className="space-y-4">
              {groupedItems.map((group) => (
                <div key={group.key} className="rounded-xl border border-[#D6F0E8]">
                  <div className="border-b border-[#D6F0E8] bg-[#F8FCFA] px-4 py-3">
                    <p className="text-sm font-semibold text-[#0D4035]">{group.supplierName}</p>
                    <p className="text-xs text-[#64748B]">
                      {group.items.length} item{group.items.length === 1 ? '' : 's'}
                      {group.supplier?.phone ? ` | ${group.supplier.phone}` : ''}
                      {group.supplier?.email ? ` | ${group.supplier.email}` : ''}
                    </p>
                  </div>
                  <div className="divide-y divide-[#D6F0E8]">
                    {group.items.map((item) => (
                      <div key={item.id} className="space-y-3 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#0D4035]">{item.productName}</p>
                            <p className="text-xs text-[#64748B]">{[item.genericName, item.strength, item.dosageForm].filter(Boolean).join(' | ')}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItemMutation.mutate(item.id)}
                            className="rounded-lg p-1.5 text-[#64748B] hover:bg-red-50 hover:text-[#DC2626]"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input
                            label="Quantity"
                            type="number"
                            min="1"
                            value={item.quantityOrdered}
                            onChange={(e) => updateLocalItem(item.id, { quantityOrdered: Math.max(Number(e.target.value), 1) })}
                          />
                          <Input
                            label="Expected unit cost"
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.expectedUnitCost ?? ''}
                            onChange={(e) => updateLocalItem(item.id, { expectedUnitCost: e.target.value })}
                          />
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
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Input label="Expected delivery" type="date" value={expectedBy} onChange={(e) => setExpectedBy(e.target.value)} />
            <Input label="Order notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

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
              onClick={() => {
                if (window.confirm('Submit this purchase order?')) submitMutation.mutate();
              }}
            >
              Submit Order
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
