import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Plus, Minus, Trash2, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useNotificationStore } from '@/stores/notificationStore';
import type { WholesaleCatalogueItem, WholesaleOrder } from '@/types';
import { WholesaleShell } from './WholesaleShell';

type CartItem = WholesaleCatalogueItem & { qty: number };

type SubmitResult = {
  sellerPharmacyId: string;
  sellerName: string;
  order?: WholesaleOrder;
  error?: string;
};

export const BuyerOrderPage: React.FC = () => {
  const toast = useNotificationStore((state) => state.toast);
  const queryClient = useQueryClient();
  const [sellerFilter, setSellerFilter] = React.useState('');
  const [cart, setCart] = React.useState<Map<string, CartItem>>(new Map());
  const [notes, setNotes] = React.useState('');
  const [results, setResults] = React.useState<SubmitResult[] | null>(null);

  const catalogueQuery = useQuery({
    queryKey: ['buyer-catalogue'],
    queryFn: () => api.get('/b2b/catalogue').then((r) => r.data.data as WholesaleCatalogueItem[]),
  });

  const sellers = React.useMemo(() => {
    const map = new Map<string, string>();
    (catalogueQuery.data ?? []).forEach((item) => map.set(item.sellerPharmacyId, item.sellerPharmacyName));
    return Array.from(map.entries());
  }, [catalogueQuery.data]);

  const filteredItems = React.useMemo(() => {
    const items = catalogueQuery.data ?? [];
    if (!sellerFilter) return items;
    return items.filter((i) => i.sellerPharmacyId === sellerFilter);
  }, [catalogueQuery.data, sellerFilter]);

  function setQty(item: WholesaleCatalogueItem, qty: number) {
    setCart((prev) => {
      const next = new Map(prev);
      if (qty <= 0) {
        next.delete(item.productId);
      } else {
        next.set(item.productId, { ...item, qty });
      }
      return next;
    });
  }

  const cartLines = Array.from(cart.values());
  const cartTotal = cartLines.reduce((sum, l) => sum + (l.effectivePrice ?? l.price) * l.qty, 0);

  const bySeller = React.useMemo(() => {
    const map = new Map<string, { name: string; lines: CartItem[]; total: number }>();
    for (const line of cartLines) {
      const existing = map.get(line.sellerPharmacyId);
      const lineTotal = (line.effectivePrice ?? line.price) * line.qty;
      if (existing) {
        existing.lines.push(line);
        existing.total += lineTotal;
      } else {
        map.set(line.sellerPharmacyId, { name: line.sellerPharmacyName, lines: [line], total: lineTotal });
      }
    }
    return map;
  }, [cartLines]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const sellers = Array.from(bySeller.entries());
      const settled = await Promise.allSettled(
        sellers.map(([sellerPharmacyId, { lines }]) =>
          api.post('/b2b/orders', {
            sellerPharmacyId,
            notes: notes || undefined,
            items: lines.map((l) => ({ productId: l.productId, quantity: l.qty })),
          }).then((r) => r.data.data as WholesaleOrder)
        )
      );
      return sellers.map(([sellerPharmacyId, { name }], i) => {
        const result = settled[i];
        return result.status === 'fulfilled'
          ? { sellerPharmacyId, sellerName: name, order: result.value }
          : { sellerPharmacyId, sellerName: name, error: extractErrorMessage(result.reason) };
      }) as SubmitResult[];
    },
    onSuccess: (submitResults) => {
      const succeeded = submitResults.filter((r) => r.order);
      const failed = submitResults.filter((r) => r.error);
      if (succeeded.length > 0) {
        setCart((prev) => {
          const next = new Map(prev);
          const succeededSellers = new Set(succeeded.map((r) => r.sellerPharmacyId));
          for (const [productId, item] of next) {
            if (succeededSellers.has(item.sellerPharmacyId)) next.delete(productId);
          }
          return next;
        });
        if (failed.length === 0) setNotes('');
        queryClient.invalidateQueries({ queryKey: ['buyer-orders'] });
      }
      setResults(submitResults);
      if (failed.length === 0) {
        toast.success(`${succeeded.length} order${succeeded.length > 1 ? 's' : ''} submitted`);
      } else if (succeeded.length === 0) {
        toast.error('All orders failed — check details below');
      } else {
        toast.error(`${failed.length} order${failed.length > 1 ? 's' : ''} failed`);
      }
    },
  });

  if (results) {
    const succeeded = results.filter((r) => r.order);
    const failed = results.filter((r) => r.error);
    return (
      <WholesaleShell>
        <Card>
          <div className="space-y-5 py-4">
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#D6F0E8]">
                <Send size={24} className="text-[#1A6B5C]" />
              </div>
              <h2 className="text-xl font-semibold text-[#0D4035]">
                {failed.length === 0 ? 'Orders submitted' : succeeded.length === 0 ? 'Orders failed' : 'Partial submission'}
              </h2>
              <p className="text-sm text-[#64748B]">
                {succeeded.length > 0
                  ? `${succeeded.length} order${succeeded.length > 1 ? 's' : ''} sent to ${succeeded.length > 1 ? 'their suppliers' : 'the supplier'} for confirmation.`
                  : 'No orders were submitted. See errors below.'}
              </p>
            </div>

            <div className="space-y-3">
              {succeeded.map((r) => (
                <div key={r.sellerPharmacyId} className="rounded-2xl border border-[#D6F0E8] bg-[#F7FCFA] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={16} className="text-[#1A6B5C] shrink-0" />
                    <p className="text-sm font-semibold text-[#0D4035]">{r.sellerName}</p>
                    <span className="ml-auto text-xs font-medium text-[#64748B]">{r.order!.orderNumber}</span>
                  </div>
                  <div className="space-y-1.5">
                    {r.order!.items.map((line) => (
                      <div key={line.productId} className="flex justify-between text-sm">
                        <span className="text-[#0D4035]">{line.productName} × {line.quantity}</span>
                        <span className="font-medium text-[#0D4035]">Tsh {line.lineTotal.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 border-t border-[#D6F0E8] pt-3 flex justify-between text-sm font-semibold">
                    <span>Total</span>
                    <span>Tsh {r.order!.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              ))}

              {failed.map((r) => (
                <div key={r.sellerPharmacyId} className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-500 shrink-0" />
                    <p className="text-sm font-semibold text-red-800">{r.sellerName}</p>
                  </div>
                  <p className="mt-1 text-xs text-red-700">{r.error}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button onClick={() => setResults(null)} variant={failed.length > 0 ? 'primary' : 'secondary'} className="flex-1">
                {failed.length > 0 ? 'Retry failed orders' : 'Place another order'}
              </Button>
              {failed.length > 0 && succeeded.length > 0 && (
                <Button onClick={() => { setResults(null); setCart(new Map()); setNotes(''); }} variant="secondary" className="flex-1">
                  Start fresh
                </Button>
              )}
            </div>
          </div>
        </Card>
      </WholesaleShell>
    );
  }

  return (
    <WholesaleShell>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card header={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#0D4035]">Wholesale catalogue</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSellerFilter('')}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${!sellerFilter ? 'border-[#1A6B5C] bg-[#1A6B5C] text-white' : 'border-[#CDE7DE] bg-white text-[#0D4035] hover:bg-[#EDF7F3]'}`}
                >
                  All suppliers
                </button>
                {sellers.map(([id, name]) => (
                  <button
                    key={id}
                    onClick={() => setSellerFilter(id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${sellerFilter === id ? 'border-[#1A6B5C] bg-[#1A6B5C] text-white' : 'border-[#CDE7DE] bg-white text-[#0D4035] hover:bg-[#EDF7F3]'}`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          }>
            {catalogueQuery.isLoading && (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#1A6B5C] border-t-transparent" />
              </div>
            )}
            {!catalogueQuery.isLoading && filteredItems.length === 0 && (
              <p className="py-6 text-center text-sm text-[#64748B]">No wholesale catalogues available yet. Ask your supplier to add products.</p>
            )}
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const inCart = cart.get(item.productId);
                const effectivePrice = item.effectivePrice ?? item.price;

                return (
                  <div
                    key={`${item.catalogueId}-${item.productId}`}
                    className="rounded-2xl border border-[#D6F0E8] p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#0D4035]">{item.productName}</p>
                        {item.genericName && <p className="text-xs text-[#64748B]">{item.genericName}</p>}
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#1A6B5C]">Tsh {effectivePrice.toLocaleString()}</p>
                          <span className="text-xs text-[#94A3B8]">·</span>
                          <p className="text-xs text-[#94A3B8]">{item.sellerPharmacyName}</p>
                        </div>
                        <p className="text-xs text-[#94A3B8]">Min {item.minOrderQuantity} units{item.maxOrderQuantity ? ` · Max ${item.maxOrderQuantity}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {inCart ? (
                          <>
                            <button
                              onClick={() => setQty(item, inCart.qty - 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D6F0E8] text-[#0D4035] hover:bg-[#EDF7F3]"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center text-sm font-semibold text-[#0D4035]">{inCart.qty}</span>
                            <button
                              onClick={() => setQty(item, inCart.qty + 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D6F0E8] text-[#0D4035] hover:bg-[#EDF7F3]"
                            >
                              <Plus size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setQty(item, item.minOrderQuantity)}
                            className="flex items-center gap-1.5 rounded-full border border-[#1A6B5C] bg-white px-3 py-1.5 text-xs font-medium text-[#1A6B5C] hover:bg-[#EDF7F3]"
                          >
                            <Plus size={12} />
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card header={
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-[#1A6B5C]" />
              <h2 className="text-lg font-semibold text-[#0D4035]">Basket ({cartLines.length} items)</h2>
            </div>
          }>
            {cartLines.length === 0 ? (
              <p className="py-4 text-center text-sm text-[#64748B]">Add items from the catalogue. You can order from multiple suppliers at once.</p>
            ) : (
              <div className="space-y-4">
                {Array.from(bySeller.entries()).map(([sellerId, { name, lines, total }]) => (
                  <div key={sellerId}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#64748B]">{name}</p>
                    <div className="space-y-2">
                      {lines.map((line) => (
                        <div key={line.productId} className="flex items-center justify-between gap-3 rounded-xl border border-[#D6F0E8] p-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[#0D4035]">{line.productName}</p>
                            <p className="text-xs text-[#64748B]">{line.qty} × Tsh {(line.effectivePrice ?? line.price).toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <p className="text-sm font-semibold text-[#0D4035]">Tsh {((line.effectivePrice ?? line.price) * line.qty).toLocaleString()}</p>
                            <button onClick={() => setQty(line, 0)} className="text-[#94A3B8] hover:text-[#B91C1C]">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex justify-between text-xs font-semibold text-[#64748B]">
                      <span>Subtotal ({name})</span>
                      <span>Tsh {total.toLocaleString()}</span>
                    </div>
                  </div>
                ))}

                <div className="border-t-2 border-[#0D4035]/10 pt-3 flex justify-between text-sm font-semibold text-[#0D4035]">
                  <span>Grand total · {bySeller.size} supplier{bySeller.size > 1 ? 's' : ''}</span>
                  <span>Tsh {cartTotal.toLocaleString()}</span>
                </div>

                <Input
                  label="Order notes (optional)"
                  placeholder="Special instructions, delivery preference..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />

                <Button
                  className="w-full"
                  leftIcon={<Send size={14} />}
                  onClick={() => submitMutation.mutate()}
                  loading={submitMutation.isPending}
                  disabled={cartLines.length === 0}
                >
                  Send {bySeller.size} order{bySeller.size > 1 ? 's' : ''}
                </Button>
                <p className="text-center text-xs text-[#94A3B8]">
                  Each supplier receives their order separately. You'll be emailed when confirmed.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </WholesaleShell>
  );
};

function extractErrorMessage(error: any): string {
  const code = error?.response?.data?.error;
  if (code === 'INSUFFICIENT_STOCK') {
    const id = error?.response?.data?.productId ?? '';
    const avail = error?.response?.data?.available ?? 0;
    return `Insufficient stock for product ${id}. Available: ${avail}`;
  }
  if (code === 'CREDIT_LIMIT_EXCEEDED') return 'Order exceeds your credit limit with this supplier.';
  if (code === 'CREDIT_BLOCKED') return `Orders blocked: ${error?.response?.data?.blockReason ?? 'contact supplier'}`;
  return code ?? error?.message ?? 'Order could not be submitted';
}
