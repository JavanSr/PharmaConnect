import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import type { Product, WholesaleCatalogueItem, WholesaleCreditLimit } from '@/types';
import { WholesaleShell } from './WholesaleShell';

export const WholesaleSettingsPage: React.FC = () => {
  const pharmacy = usePharmacyStore((state) => state.pharmacy);
  const user = useAuthStore((state) => state.user);
  const toast = useNotificationStore((state) => state.toast);
  const queryClient = useQueryClient();
  const canManageWholesaleSettings = ['OWNER', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'].includes(user?.role ?? '');
  const [catalogueDraft, setCatalogueDraft] = React.useState({
    productId: '',
    price: '',
    addoPrice: '',
    standardPrice: '',
    premiumPrice: '',
    enterprisePrice: '',
  });
  const [creditDrafts, setCreditDrafts] = React.useState<Record<string, {
    creditLimit: string;
    paymentTermsDays: string;
    blockNewOrders: boolean;
    blockReason: string;
  }>>({});

  const productsQuery = useQuery({
    queryKey: ['wholesale-settings-products'],
    queryFn: () => api.get('/inventory/products', { params: { limit: 50 } }).then((response) => response.data.data as Product[]),
  });
  const catalogueQuery = useQuery({
    queryKey: ['wholesale-catalogue'],
    queryFn: () => api.get('/b2b/catalogue').then((response) => response.data.data as WholesaleCatalogueItem[]),
  });
  const creditLimitsQuery = useQuery({
    queryKey: ['wholesale-credit-limits'],
    queryFn: () => api.get('/b2b/credit-limits').then((response) => response.data.data as WholesaleCreditLimit[]),
  });

  React.useEffect(() => {
    if (!creditLimitsQuery.data?.length) {
      return;
    }

    setCreditDrafts((current) => {
      const next = { ...current };
      creditLimitsQuery.data.forEach((limit) => {
        if (!next[limit.id]) {
          next[limit.id] = {
            creditLimit: String(limit.creditLimit),
            paymentTermsDays: String(limit.paymentTermsDays),
            blockNewOrders: limit.blockNewOrders,
            blockReason: limit.blockReason ?? '',
          };
        }
      });
      return next;
    });
  }, [creditLimitsQuery.data]);

  const createCatalogueMutation = useMutation({
    mutationFn: async () => {
      const selectedProduct = productsQuery.data?.find((product) => product.id === catalogueDraft.productId);
      const tierPrices: Record<string, number> = {};
      if (catalogueDraft.addoPrice) tierPrices.ADDO = Number(catalogueDraft.addoPrice);
      if (catalogueDraft.standardPrice) tierPrices.STANDARD = Number(catalogueDraft.standardPrice);
      if (catalogueDraft.premiumPrice) tierPrices.PREMIUM = Number(catalogueDraft.premiumPrice);
      if (catalogueDraft.enterprisePrice) tierPrices.ENTERPRISE = Number(catalogueDraft.enterprisePrice);

      await api.post('/b2b/catalogues', {
        title: `${selectedProduct?.genericName || selectedProduct?.name || 'Wholesale'} pricing`,
        items: [
          {
            productId: catalogueDraft.productId,
            price: Number(catalogueDraft.price),
            tierPrices,
          },
        ],
      });
    },
    onSuccess: () => {
      toast.success('Wholesale tier pricing saved');
      setCatalogueDraft({
        productId: '',
        price: '',
        addoPrice: '',
        standardPrice: '',
        premiumPrice: '',
        enterprisePrice: '',
      });
      queryClient.invalidateQueries({ queryKey: ['wholesale-catalogue'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Could not save wholesale pricing');
    },
  });

  const updateCreditLimitMutation = useMutation({
    mutationFn: async (limit: WholesaleCreditLimit) => {
      const draft = creditDrafts[limit.id];
      const response = await api.put(`/b2b/credit-limits/${limit.clientPharmacyId}`, {
        creditLimit: Number(draft.creditLimit),
        outstandingBalance: limit.outstandingBalance,
        paymentTermsDays: Number(draft.paymentTermsDays),
        blockNewOrders: draft.blockNewOrders,
        blockReason: draft.blockReason || null,
      });
      return response.data.data as WholesaleCreditLimit;
    },
    onSuccess: () => {
      toast.success('Credit control updated');
      queryClient.invalidateQueries({ queryKey: ['wholesale-credit-limits'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Could not update credit control');
    },
  });

  return (
    <WholesaleShell>
      <div className="space-y-6">
      <Card>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#1A6B5C]">Wholesale Settings</p>
          <h2 className="text-2xl font-semibold text-[#0D4035]">Wholesale controls stay separate, data stays shared.</h2>
          <p className="max-w-3xl text-sm text-[#4B5563]">
            This outlet is using the same login, team directory, subscriptions, and product records as the retail workspace. Wholesale-only controls live here so order operations can evolve without duplicating core platform data.
          </p>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold text-[#0D4035]">Current outlet</p>
          <p className="mt-2 text-lg font-semibold text-[#0D4035]">{pharmacy?.name ?? 'Active wholesale outlet'}</p>
          <p className="mt-1 text-sm text-[#64748B]">{pharmacy?.subscriptionTier ?? 'WHOLESALE'} tier</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-[#0D4035]">Shared team controls</p>
          <p className="mt-2 text-sm text-[#64748B]">Invite and manage wholesale staff from the shared team directory so audit trails remain unified.</p>
          <Link to="/settings/team" className="mt-4 inline-block">
            <Button variant="secondary" size="sm">Open team settings</Button>
          </Link>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-[#0D4035]">Shared subscription</p>
          <p className="mt-2 text-sm text-[#64748B]">Wholesale billing, hybrid enablement, and outlet tier changes still come from the main subscription workspace.</p>
          <Link to="/settings/subscription" className="mt-4 inline-block">
            <Button variant="secondary" size="sm">Open subscription</Button>
          </Link>
        </Card>
      </div>

      <Card header={<h3 className="text-lg font-semibold text-[#0D4035]">Wholesale operations scope</h3>}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#D6F0E8] bg-[#F7FCFA] p-4">
            <p className="text-sm font-semibold text-[#0D4035]">Managed here</p>
            <ul className="mt-3 space-y-2 text-sm text-[#4B5563]">
              <li>Catalogue pricing and buyer-facing order rules</li>
              <li>Credit exposure, payment terms, and receivables aging</li>
              <li>Delivery scheduling and invoice follow-up</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-[#D6F0E8] bg-[#F7FCFA] p-4">
            <p className="text-sm font-semibold text-[#0D4035]">Shared platform services</p>
            <ul className="mt-3 space-y-2 text-sm text-[#4B5563]">
              <li>Auth, role checks, and multi-outlet selection</li>
              <li>Products, users, and marketplace data</li>
              <li>Audit logs, sync, and subscription entitlements</li>
            </ul>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card header={<h3 className="text-lg font-semibold text-[#0D4035]">Catalogue tier pricing</h3>}>
          <div className="space-y-4">
            {canManageWholesaleSettings && (
              <div className="grid gap-3 rounded-2xl border border-[#D6F0E8] bg-[#F7FCFA] p-4 lg:grid-cols-3">
                <Select
                  label="Product"
                  value={catalogueDraft.productId}
                  onChange={(event) => setCatalogueDraft((current) => ({ ...current, productId: event.target.value }))}
                  options={(productsQuery.data ?? []).map((product) => ({
                    value: product.id,
                    label: product.genericName || product.name,
                  }))}
                  placeholder="Choose a product"
                />
                <Input
                  label="Base price"
                  type="number"
                  value={catalogueDraft.price}
                  onChange={(event) => setCatalogueDraft((current) => ({ ...current, price: event.target.value }))}
                  placeholder="1000"
                />
                <Input
                  label="ADDO price"
                  type="number"
                  value={catalogueDraft.addoPrice}
                  onChange={(event) => setCatalogueDraft((current) => ({ ...current, addoPrice: event.target.value }))}
                  placeholder="900"
                />
                <Input
                  label="Standard price"
                  type="number"
                  value={catalogueDraft.standardPrice}
                  onChange={(event) => setCatalogueDraft((current) => ({ ...current, standardPrice: event.target.value }))}
                  placeholder="1000"
                />
                <Input
                  label="Premium price"
                  type="number"
                  value={catalogueDraft.premiumPrice}
                  onChange={(event) => setCatalogueDraft((current) => ({ ...current, premiumPrice: event.target.value }))}
                  placeholder="950"
                />
                <div className="flex items-end gap-3">
                  <Input
                    label="Enterprise price"
                    type="number"
                    value={catalogueDraft.enterprisePrice}
                    onChange={(event) => setCatalogueDraft((current) => ({ ...current, enterprisePrice: event.target.value }))}
                    placeholder="900"
                  />
                  <Button
                    onClick={() => createCatalogueMutation.mutate()}
                    loading={createCatalogueMutation.isPending}
                    disabled={!catalogueDraft.productId || !catalogueDraft.price}
                  >
                    Save price line
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {(catalogueQuery.data ?? []).slice(0, 8).map((item) => (
                <div key={`${item.catalogueId}-${item.productId}`} className="rounded-2xl border border-[#D6F0E8] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-[#0D4035]">{item.productName}</p>
                      <p className="text-sm text-[#64748B]">
                        Base TZS {item.price.toLocaleString()}
                        {typeof item.effectivePrice === 'number' ? ` · Effective TZS ${item.effectivePrice.toLocaleString()}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(item.tierPrices ?? {}).map(([tier, price]) => (
                        <span key={tier} className="rounded-full bg-[#EDF7F3] px-3 py-1 text-xs font-semibold text-[#0D4035]">
                          {tier}: TZS {Number(price).toLocaleString()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {catalogueQuery.data?.length === 0 && <p className="text-sm text-[#64748B]">No wholesale pricing lines saved yet.</p>}
            </div>
          </div>
        </Card>

        <Card header={<h3 className="text-lg font-semibold text-[#0D4035]">Client credit controls</h3>}>
          <div className="space-y-3">
            {(creditLimitsQuery.data ?? []).map((limit) => (
              <div key={limit.id} className="rounded-2xl border border-[#D6F0E8] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-[#0D4035]">{limit.clientName ?? limit.clientPharmacyId}</p>
                    <p className="text-sm text-[#64748B]">Outstanding TZS {limit.outstandingBalance.toLocaleString()}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${creditDrafts[limit.id]?.blockNewOrders ? 'bg-[#FEF2F2] text-[#B91C1C]' : 'bg-[#EDF7F3] text-[#0D4035]'}`}>
                    {creditDrafts[limit.id]?.blockNewOrders ? 'Blocked' : 'Open'}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <Input
                    label="Credit limit"
                    type="number"
                    value={creditDrafts[limit.id]?.creditLimit ?? String(limit.creditLimit)}
                    onChange={(event) => setCreditDrafts((current) => ({
                      ...current,
                      [limit.id]: {
                        creditLimit: event.target.value,
                        paymentTermsDays: current[limit.id]?.paymentTermsDays ?? String(limit.paymentTermsDays),
                        blockNewOrders: current[limit.id]?.blockNewOrders ?? limit.blockNewOrders,
                        blockReason: current[limit.id]?.blockReason ?? (limit.blockReason ?? ''),
                      },
                    }))}
                    disabled={!canManageWholesaleSettings}
                  />
                  <Input
                    label="Payment terms (days)"
                    type="number"
                    value={creditDrafts[limit.id]?.paymentTermsDays ?? String(limit.paymentTermsDays)}
                    onChange={(event) => setCreditDrafts((current) => ({
                      ...current,
                      [limit.id]: {
                        creditLimit: current[limit.id]?.creditLimit ?? String(limit.creditLimit),
                        paymentTermsDays: event.target.value,
                        blockNewOrders: current[limit.id]?.blockNewOrders ?? limit.blockNewOrders,
                        blockReason: current[limit.id]?.blockReason ?? (limit.blockReason ?? ''),
                      },
                    }))}
                    disabled={!canManageWholesaleSettings}
                  />
                  <Input
                    label="Block reason"
                    value={creditDrafts[limit.id]?.blockReason ?? (limit.blockReason ?? '')}
                    onChange={(event) => setCreditDrafts((current) => ({
                      ...current,
                      [limit.id]: {
                        creditLimit: current[limit.id]?.creditLimit ?? String(limit.creditLimit),
                        paymentTermsDays: current[limit.id]?.paymentTermsDays ?? String(limit.paymentTermsDays),
                        blockNewOrders: current[limit.id]?.blockNewOrders ?? limit.blockNewOrders,
                        blockReason: event.target.value,
                      },
                    }))}
                    disabled={!canManageWholesaleSettings}
                  />
                  <div className="flex items-end gap-3">
                    <button
                      type="button"
                      className={`h-10 rounded-xl border px-4 text-sm font-medium ${creditDrafts[limit.id]?.blockNewOrders ? 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]' : 'border-[#CDE7DE] bg-white text-[#0D4035]'}`}
                      onClick={() => setCreditDrafts((current) => ({
                        ...current,
                        [limit.id]: {
                          creditLimit: current[limit.id]?.creditLimit ?? String(limit.creditLimit),
                          paymentTermsDays: current[limit.id]?.paymentTermsDays ?? String(limit.paymentTermsDays),
                          blockNewOrders: !(current[limit.id]?.blockNewOrders ?? limit.blockNewOrders),
                          blockReason: current[limit.id]?.blockReason ?? (limit.blockReason ?? ''),
                        },
                      }))}
                      disabled={!canManageWholesaleSettings}
                    >
                      {creditDrafts[limit.id]?.blockNewOrders ? 'Blocked' : 'Allow orders'}
                    </button>
                    <Button
                      onClick={() => updateCreditLimitMutation.mutate(limit)}
                      loading={updateCreditLimitMutation.isPending}
                      disabled={!canManageWholesaleSettings}
                    >
                      Save credit rule
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {creditLimitsQuery.data?.length === 0 && <p className="text-sm text-[#64748B]">No client credit rules exist yet. Add them from the backend API until the client directory lands.</p>}
          </div>
        </Card>
      </div>
      </div>
    </WholesaleShell>
  );
};
