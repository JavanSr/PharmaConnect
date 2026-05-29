import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Tag, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useNotificationStore } from '@/stores/notificationStore';
import type { ClientPriceEntry, Pharmacy } from '@/types';
import { WholesaleShell } from './WholesaleShell';

export const ClientPricingPage: React.FC = () => {
  const toast = useNotificationStore((s) => s.toast);
  const queryClient = useQueryClient();
  const [clientSearch, setClientSearch] = React.useState('');
  const [selectedClient, setSelectedClient] = React.useState<Pharmacy | null>(null);
  const [overrideDrafts, setOverrideDrafts] = React.useState<Record<string, string>>({});

  const searchQuery = useQuery({
    queryKey: ['b2b-pharmacy-search', clientSearch],
    queryFn: () => api.get('/b2b/pharmacies/search', { params: { q: clientSearch } }).then((r) => r.data.data as Pharmacy[]),
    enabled: clientSearch.length >= 2 && !selectedClient,
  });

  const pricesQuery = useQuery({
    queryKey: ['client-prices', selectedClient?.id],
    queryFn: () => api.get(`/b2b/clients/${selectedClient!.id}/prices`).then((r) => r.data.data as ClientPriceEntry[]),
    enabled: !!selectedClient,
  });

  React.useEffect(() => {
    if (pricesQuery.data) {
      setOverrideDrafts(
        Object.fromEntries(
          pricesQuery.data.filter((e) => e.hasOverride).map((e) => [e.productId, String(e.overridePriceTzs ?? e.effectivePriceTzs)])
        )
      );
    }
  }, [pricesQuery.data]);

  const saveMutation = useMutation({
    mutationFn: ({ productId, price }: { productId: string; price: number }) =>
      api.post(`/b2b/clients/${selectedClient!.id}/prices`, { productId, overridePriceTzs: price }).then((r) => r.data.data as ClientPriceEntry[]),
    onSuccess: (data) => {
      toast.success('Price override saved');
      queryClient.setQueryData(['client-prices', selectedClient?.id], data);
    },
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Could not save override'),
  });

  const deleteMutation = useMutation({
    mutationFn: (productId: string) =>
      api.delete(`/b2b/clients/${selectedClient!.id}/prices/${productId}`).then(() =>
        queryClient.invalidateQueries({ queryKey: ['client-prices', selectedClient?.id] })
      ),
    onSuccess: () => toast.success('Override removed — tier price restored'),
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Could not remove override'),
  });

  const entries = pricesQuery.data ?? [];

  return (
    <WholesaleShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-[#0D4035]">Client pricing</h1>
          <p className="mt-1 text-sm text-[#64748B]">Set custom per-product prices for a specific buyer pharmacy, overriding their subscription tier price.</p>
        </div>

        {/* Client selector */}
        <Card header={<h2 className="text-base font-semibold text-[#0D4035]">Select buyer pharmacy</h2>}>
          {selectedClient ? (
            <div className="flex items-center justify-between rounded-2xl border border-[#D6F0E8] bg-[#F7FCFA] p-4">
              <div>
                <p className="font-semibold text-[#0D4035]">{selectedClient.name}</p>
                <p className="text-sm text-[#64748B]">{selectedClient.subscriptionTier} · {selectedClient.region ?? '—'}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => { setSelectedClient(null); setClientSearch(''); setOverrideDrafts({}); }}>
                Change
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Search buyer pharmacy name…"
                  className="w-full rounded-xl border border-[#D6F0E8] py-2 pl-9 pr-3 text-sm text-[#0D4035] placeholder-[#94A3B8] outline-none focus:border-[#1A6B5C] focus:ring-1 focus:ring-[#1A6B5C]"
                />
              </div>
              {searchQuery.isLoading && <p className="text-sm text-[#64748B]">Searching…</p>}
              {(searchQuery.data ?? []).map((pharmacy) => (
                <button
                  key={pharmacy.id}
                  onClick={() => { setSelectedClient(pharmacy); setClientSearch(''); }}
                  className="w-full rounded-2xl border border-[#D6F0E8] p-4 text-left hover:bg-[#EDF7F3] transition-colors"
                >
                  <p className="font-medium text-[#0D4035]">{pharmacy.name}</p>
                  <p className="text-xs text-[#64748B]">{pharmacy.subscriptionTier} · {pharmacy.region ?? '—'}</p>
                </button>
              ))}
              {clientSearch.length >= 2 && !searchQuery.isLoading && (searchQuery.data ?? []).length === 0 && (
                <p className="text-sm text-[#64748B]">No pharmacies found. They must be registered on APOTEKH.</p>
              )}
            </div>
          )}
        </Card>

        {/* Price table */}
        {selectedClient && (
          <Card
            header={
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-[#0D4035]">
                  Prices for {selectedClient.name}
                </h2>
                {pricesQuery.isFetching && <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A6B5C] border-t-transparent" />}
              </div>
            }
          >
            {pricesQuery.isLoading && (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#1A6B5C] border-t-transparent" />
              </div>
            )}

            {!pricesQuery.isLoading && entries.length === 0 && (
              <div className="py-8 text-center">
                <Tag size={28} className="mx-auto text-[#AFDFD3]" />
                <p className="mt-3 text-sm text-[#0D4035]">No catalogue products found</p>
                <p className="mt-1 text-xs text-[#64748B]">Add products to your wholesale catalogue first via Settings.</p>
              </div>
            )}

            {entries.length > 0 && (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#64748B]">
                  <span>Product</span>
                  <span className="text-right">Catalogue</span>
                  <span className="text-right">Tier ({selectedClient.subscriptionTier})</span>
                  <span className="text-right">Override</span>
                  <span />
                </div>
                {entries.map((entry) => (
                  <div key={entry.productId} className={`grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 rounded-xl border p-3 ${entry.hasOverride ? 'border-[#AFDFD3] bg-[#EDF7F3]' : 'border-[#D6F0E8]'}`}>
                    <div>
                      <p className="text-sm font-medium text-[#0D4035]">{entry.productName}</p>
                      {entry.genericName && <p className="text-xs text-[#94A3B8]">{entry.genericName}</p>}
                    </div>
                    <p className="text-right text-sm text-[#64748B]">Tsh {entry.cataloguePriceTzs.toLocaleString()}</p>
                    <p className="text-right text-sm text-[#64748B]">Tsh {entry.tierPriceTzs.toLocaleString()}</p>
                    <div className="w-32">
                      <input
                        type="number"
                        value={overrideDrafts[entry.productId] ?? ''}
                        onChange={(e) => setOverrideDrafts((prev) => ({ ...prev, [entry.productId]: e.target.value }))}
                        placeholder={String(entry.tierPriceTzs)}
                        className="w-full rounded-xl border border-[#D6F0E8] px-3 py-1.5 text-right text-sm text-[#0D4035] outline-none focus:border-[#1A6B5C] focus:ring-1 focus:ring-[#1A6B5C]"
                      />
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => saveMutation.mutate({ productId: entry.productId, price: parseFloat(overrideDrafts[entry.productId] ?? '0') || 0 })}
                        loading={saveMutation.isPending && saveMutation.variables?.productId === entry.productId}
                        disabled={!overrideDrafts[entry.productId]}
                      >
                        Save
                      </Button>
                      {entry.hasOverride && (
                        <button
                          onClick={() => deleteMutation.mutate(entry.productId)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D6F0E8] text-[#94A3B8] hover:text-[#B91C1C]"
                          title="Remove override"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <p className="mt-2 text-xs text-[#94A3B8]">
                  Override prices take effect immediately for this buyer's catalogue view. Leave blank to use tier pricing.
                </p>
              </div>
            )}
          </Card>
        )}
      </div>
    </WholesaleShell>
  );
};
