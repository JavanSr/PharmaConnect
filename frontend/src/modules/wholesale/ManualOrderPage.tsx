import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, Search, Send, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useNotificationStore } from '@/stores/notificationStore';
import type { Pharmacy, WholesaleCatalogueItem, WholesaleOrder } from '@/types';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { WholesaleShell } from './WholesaleShell';

type CartLine = WholesaleCatalogueItem & { qty: number };

export const ManualOrderPage: React.FC = () => {
  const toast = useNotificationStore((s) => s.toast);
  const queryClient = useQueryClient();
  const myPharmacyId = usePharmacyStore((s) => s.pharmacy?.id);

  const [buyerSearch, setBuyerSearch] = React.useState('');
  const [selectedBuyer, setSelectedBuyer] = React.useState<Pharmacy | null>(null);
  const [cart, setCart] = React.useState<Map<string, CartLine>>(new Map());
  const [notes, setNotes] = React.useState('');
  const [submitted, setSubmitted] = React.useState<WholesaleOrder | null>(null);

  const pharmacyQuery = useQuery({
    queryKey: ['b2b-pharmacy-search', buyerSearch],
    queryFn: () => api.get('/b2b/pharmacies/search', { params: { q: buyerSearch } }).then((r) => r.data.data as Pharmacy[]),
    enabled: buyerSearch.length >= 2 && !selectedBuyer,
  });

  const catalogueQuery = useQuery({
    queryKey: ['wholesale-catalogue-seller', myPharmacyId],
    queryFn: () =>
      api.get('/b2b/catalogue', { params: { sellerPharmacyId: myPharmacyId } })
        .then((r) => r.data.data as WholesaleCatalogueItem[]),
    enabled: Boolean(myPharmacyId),
  });

  const [productSearch, setProductSearch] = React.useState('');
  const filteredCatalogue = React.useMemo(() => {
    const items = catalogueQuery.data ?? [];
    if (!productSearch.trim()) return items;
    const q = productSearch.toLowerCase();
    return items.filter((i) => i.productName.toLowerCase().includes(q) || (i.genericName?.toLowerCase() ?? '').includes(q));
  }, [catalogueQuery.data, productSearch]);

  function setQty(item: WholesaleCatalogueItem, qty: number) {
    setCart((prev) => {
      const next = new Map(prev);
      if (qty <= 0) next.delete(item.productId);
      else next.set(item.productId, { ...item, qty });
      return next;
    });
  }

  const cartLines = Array.from(cart.values());
  const cartTotal = cartLines.reduce((sum, l) => sum + (l.effectivePrice ?? l.price) * l.qty, 0);

  const submitMutation = useMutation({
    mutationFn: () =>
      api.post('/b2b/orders/manual', {
        buyerPharmacyId: selectedBuyer!.id,
        notes: notes || undefined,
        items: cartLines.map((l) => ({ productId: l.productId, quantity: l.qty })),
      }).then((r) => r.data.data as WholesaleOrder),
    onSuccess: (order) => {
      toast.success(`Order ${order.orderNumber} created`);
      setSubmitted(order);
      setCart(new Map());
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['wholesale-orders-full'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Order creation failed'),
  });

  if (submitted) {
    return (
      <WholesaleShell>
        <Card>
          <div className="space-y-5 py-4">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#D6F0E8]">
                <Send size={22} className="text-[#1A6B5C]" />
              </div>
              <h2 className="text-xl font-semibold text-[#0D4035]">Order created</h2>
              <p className="text-sm text-[#64748B]">{submitted.orderNumber} · {submitted.items.length} line items · Tsh {submitted.totalAmount.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-[#D6F0E8] bg-[#F7FCFA] p-4 space-y-2">
              {submitted.items.map((line) => (
                <div key={line.productId} className="flex justify-between text-sm">
                  <span className="text-[#0D4035]">{line.productName} × {line.quantity}</span>
                  <span className="font-medium text-[#0D4035]">Tsh {line.lineTotal.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-[#D6F0E8] pt-2 text-sm font-semibold text-[#0D4035]">
                <span>Total</span><span>Tsh {submitted.totalAmount.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setSubmitted(null)} className="flex-1">Create another order</Button>
              <Button variant="secondary" onClick={() => { setSubmitted(null); setSelectedBuyer(null); setBuyerSearch(''); }} className="flex-1">
                Change buyer
              </Button>
            </div>
          </div>
        </Card>
      </WholesaleShell>
    );
  }

  return (
    <WholesaleShell>
      <div className="space-y-5">
        <h1 className="text-xl font-semibold text-[#0D4035]">Manual order entry</h1>
        <p className="text-sm text-[#64748B]">Create an order on behalf of a walk-in or phone buyer.</p>

        {/* Step 1: Select buyer */}
        <Card header={<h2 className="text-base font-semibold text-[#0D4035]">1 · Select buyer pharmacy</h2>}>
          {selectedBuyer ? (
            <div className="flex items-center justify-between rounded-2xl border border-[#D6F0E8] bg-[#F7FCFA] p-4">
              <div>
                <p className="font-semibold text-[#0D4035]">{selectedBuyer.name}</p>
                <p className="text-sm text-[#64748B]">{selectedBuyer.subscriptionTier} · {selectedBuyer.region ?? '—'}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => { setSelectedBuyer(null); setBuyerSearch(''); }}>
                Change
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  value={buyerSearch}
                  onChange={(e) => setBuyerSearch(e.target.value)}
                  placeholder="Search pharmacy name…"
                  className="w-full rounded-xl border border-[#D6F0E8] py-2 pl-9 pr-3 text-sm text-[#0D4035] placeholder-[#94A3B8] outline-none focus:border-[#1A6B5C] focus:ring-1 focus:ring-[#1A6B5C]"
                />
              </div>
              {pharmacyQuery.isLoading && <p className="text-sm text-[#64748B]">Searching…</p>}
              {(pharmacyQuery.data ?? []).map((pharmacy) => (
                <button
                  key={pharmacy.id}
                  onClick={() => { setSelectedBuyer(pharmacy); setBuyerSearch(''); }}
                  className="w-full rounded-2xl border border-[#D6F0E8] p-4 text-left hover:bg-[#EDF7F3] transition-colors"
                >
                  <p className="font-medium text-[#0D4035]">{pharmacy.name}</p>
                  <p className="text-xs text-[#64748B]">{pharmacy.subscriptionTier} · {pharmacy.region ?? '—'}</p>
                </button>
              ))}
              {buyerSearch.length >= 2 && !pharmacyQuery.isLoading && (pharmacyQuery.data ?? []).length === 0 && (
                <p className="text-sm text-[#64748B]">No pharmacies found. They must be registered on APOTEKH.</p>
              )}
            </div>
          )}
        </Card>

        {/* Step 2: Build cart */}
        {selectedBuyer && (
          <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
            <Card header={
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-[#0D4035]">2 · Add products</h2>
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products…"
                  className="rounded-xl border border-[#D6F0E8] px-3 py-1.5 text-sm text-[#0D4035] placeholder-[#94A3B8] outline-none focus:border-[#1A6B5C] focus:ring-1 focus:ring-[#1A6B5C]"
                />
              </div>
            }>
              {catalogueQuery.isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-4 border-[#1A6B5C] border-t-transparent" />
                </div>
              )}
              <div className="space-y-2">
                {filteredCatalogue.map((item) => {
                  const inCart = cart.get(item.productId);
                  const price = item.effectivePrice ?? item.price;
                  return (
                    <div key={item.productId} className="flex items-center justify-between gap-4 rounded-xl border border-[#D6F0E8] p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#0D4035]">{item.productName}</p>
                        {item.genericName && <p className="text-xs text-[#94A3B8]">{item.genericName}</p>}
                        <p className="text-xs font-semibold text-[#1A6B5C]">Tsh {price.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {inCart ? (
                          <>
                            <button onClick={() => setQty(item, inCart.qty - 1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-[#D6F0E8] text-[#0D4035] hover:bg-[#EDF7F3]"><Minus size={12} /></button>
                            <span className="w-7 text-center text-sm font-semibold text-[#0D4035]">{inCart.qty}</span>
                            <button onClick={() => setQty(item, inCart.qty + 1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-[#D6F0E8] text-[#0D4035] hover:bg-[#EDF7F3]"><Plus size={12} /></button>
                          </>
                        ) : (
                          <button onClick={() => setQty(item, item.minOrderQuantity)} className="flex items-center gap-1 rounded-full border border-[#1A6B5C] px-3 py-1 text-xs font-medium text-[#1A6B5C] hover:bg-[#EDF7F3]">
                            <Plus size={11} /> Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredCatalogue.length === 0 && !catalogueQuery.isLoading && (
                  <p className="py-4 text-center text-sm text-[#64748B]">No products in catalogue. Add products via Settings first.</p>
                )}
              </div>
            </Card>

            {/* Cart */}
            <Card header={<h2 className="text-base font-semibold text-[#0D4035]">Order summary</h2>}>
              {cartLines.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#64748B]">Add items from the catalogue.</p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {cartLines.map((line) => (
                      <div key={line.productId} className="flex items-center gap-3 rounded-xl border border-[#D6F0E8] p-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[#0D4035] truncate">{line.productName}</p>
                          <p className="text-xs text-[#64748B]">{line.qty} × Tsh {(line.effectivePrice ?? line.price).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <p className="text-sm font-semibold text-[#0D4035]">Tsh {((line.effectivePrice ?? line.price) * line.qty).toLocaleString()}</p>
                          <button onClick={() => setQty(line, 0)} className="text-[#94A3B8] hover:text-[#B91C1C]"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between border-t border-[#D6F0E8] pt-3 text-sm font-semibold text-[#0D4035]">
                    <span>Total</span><span>Tsh {cartTotal.toLocaleString()}</span>
                  </div>
                  <Input label="Notes (optional)" placeholder="Special instructions…" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  <Button
                    className="w-full"
                    leftIcon={<Send size={13} />}
                    onClick={() => submitMutation.mutate()}
                    loading={submitMutation.isPending}
                    disabled={cartLines.length === 0}
                  >
                    Create order for {selectedBuyer.name}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </WholesaleShell>
  );
};
