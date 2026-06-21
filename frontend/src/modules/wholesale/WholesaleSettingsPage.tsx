import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search, Trash2, UserPlus, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import type { Pharmacy, Product, Supplier, WholesaleCatalogueItem, WholesaleCreditLimit } from '@/types';
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
  const [clientSearch, setClientSearch] = React.useState('');
  const [newClientId, setNewClientId] = React.useState('');
  const [newClientLimit, setNewClientLimit] = React.useState('500000');

  // Supplier management state
  const blankSupplier = { name: '', contactName: '', phone: '', email: '', address: '' };
  const [supplierForm, setSupplierForm] = React.useState(blankSupplier);
  const [editingSupplierId, setEditingSupplierId] = React.useState<string | null>(null);

  const productsQuery = useQuery({
    queryKey: ['wholesale-settings-products'],
    queryFn: () => api.get('/inventory/products', { params: { limit: 50 } }).then((response) => response.data.data as Product[]),
  });

  const suppliersQuery = useQuery({
    queryKey: ['b2b-suppliers'],
    queryFn: () => api.get('/b2b/suppliers').then((r) => r.data.data as Supplier[]),
  });

  const createSupplierMutation = useMutation({
    mutationFn: () => api.post('/b2b/suppliers', {
      name: supplierForm.name.trim(),
      contactName: supplierForm.contactName.trim() || undefined,
      phone: supplierForm.phone.trim() || undefined,
      email: supplierForm.email.trim() || undefined,
      address: supplierForm.address.trim() || undefined,
    }).then((r) => r.data.data as Supplier),
    onSuccess: () => {
      toast.success('Supplier added');
      setSupplierForm(blankSupplier);
      queryClient.invalidateQueries({ queryKey: ['b2b-suppliers'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Could not add supplier'),
  });

  const updateSupplierMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/b2b/suppliers/${id}`, {
      name: supplierForm.name.trim(),
      contactName: supplierForm.contactName.trim() || undefined,
      phone: supplierForm.phone.trim() || undefined,
      email: supplierForm.email.trim() || undefined,
      address: supplierForm.address.trim() || undefined,
    }).then((r) => r.data.data as Supplier),
    onSuccess: () => {
      toast.success('Supplier updated');
      setSupplierForm(blankSupplier);
      setEditingSupplierId(null);
      queryClient.invalidateQueries({ queryKey: ['b2b-suppliers'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Could not update supplier'),
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/b2b/suppliers/${id}`),
    onSuccess: () => {
      toast.success('Supplier removed');
      queryClient.invalidateQueries({ queryKey: ['b2b-suppliers'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Could not remove supplier'),
  });

  function startEditSupplier(supplier: Supplier) {
    setEditingSupplierId(supplier.id);
    setSupplierForm({
      name: supplier.name,
      contactName: supplier.contactName ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      address: '',
    });
  }

  const pharmacySearchQuery = useQuery({
    queryKey: ['pharmacy-search', clientSearch],
    queryFn: () => api.get('/b2b/pharmacies/search', { params: { q: clientSearch } }).then((r) => r.data.data as Pharmacy[]),
    enabled: clientSearch.length >= 2,
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

  const removeCatalogueItemMutation = useMutation({
    mutationFn: ({ catalogueId, productId }: { catalogueId: string; productId: string }) =>
      api.delete(`/b2b/catalogues/${catalogueId}/items/${productId}`),
    onSuccess: () => {
      toast.success('Product removed from catalogue');
      queryClient.invalidateQueries({ queryKey: ['wholesale-catalogue'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.error ?? 'Could not remove product'),
  });

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

  const addClientMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/b2b/credit-limits/${newClientId}`, {
        creditLimit: Number(newClientLimit),
        paymentTermsDays: 30,
        blockNewOrders: false,
      });
    },
    onSuccess: () => {
      toast.success('Client added with default credit limit');
      setNewClientId('');
      setClientSearch('');
      queryClient.invalidateQueries({ queryKey: ['wholesale-credit-limits'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Could not add client');
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

      {/* ── Supplier management ─────────────────────────────────────── */}
      <Card header={<h3 className="text-lg font-semibold text-[#0D4035]">Your suppliers</h3>}>
        <p className="mb-4 text-sm text-[#64748B]">
          Suppliers you buy stock from (manufacturers, distributors). Required before creating purchase orders.
        </p>
        {canManageWholesaleSettings && (
          <div className="mb-4 grid gap-3 rounded-2xl border border-[#D6F0E8] bg-[#F7FCFA] p-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              label="Supplier name *"
              value={supplierForm.name}
              onChange={(e) => setSupplierForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Shelys Pharma Ltd"
            />
            <Input
              label="Contact name"
              value={supplierForm.contactName}
              onChange={(e) => setSupplierForm((f) => ({ ...f, contactName: e.target.value }))}
              placeholder="Sales rep name"
            />
            <Input
              label="Phone"
              value={supplierForm.phone}
              onChange={(e) => setSupplierForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+255 7XX XXX XXX"
            />
            <Input
              label="Email"
              type="email"
              value={supplierForm.email}
              onChange={(e) => setSupplierForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="orders@supplier.co.tz"
            />
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
              {editingSupplierId ? (
                <>
                  <Button
                    onClick={() => updateSupplierMutation.mutate(editingSupplierId)}
                    loading={updateSupplierMutation.isPending}
                    disabled={!supplierForm.name.trim()}
                    className="flex-1"
                  >
                    Save changes
                  </Button>
                  <button
                    onClick={() => { setEditingSupplierId(null); setSupplierForm(blankSupplier); }}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D6F0E8] text-[#94A3B8] hover:text-[#64748B]"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <Button
                  leftIcon={<Plus size={14} />}
                  onClick={() => createSupplierMutation.mutate()}
                  loading={createSupplierMutation.isPending}
                  disabled={!supplierForm.name.trim()}
                  className="flex-1"
                >
                  Add supplier
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {(suppliersQuery.data ?? []).map((supplier) => (
            <div key={supplier.id} className={`flex items-start justify-between gap-4 rounded-2xl border p-4 ${editingSupplierId === supplier.id ? 'border-[#1A6B5C] bg-[#EDF7F3]' : 'border-[#D6F0E8]'}`}>
              <div>
                <p className="font-medium text-[#0D4035]">{supplier.name}</p>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-[#64748B]">
                  {supplier.contactName && <span>{supplier.contactName}</span>}
                  {supplier.phone && <span>{supplier.phone}</span>}
                  {supplier.email && <span>{supplier.email}</span>}
                </div>
              </div>
              {canManageWholesaleSettings && (
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => startEditSupplier(supplier)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D6F0E8] text-[#94A3B8] hover:text-[#1A6B5C]"
                    title="Edit"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => deleteSupplierMutation.mutate(supplier.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D6F0E8] text-[#94A3B8] hover:text-[#B91C1C]"
                    title="Remove"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {suppliersQuery.data?.length === 0 && (
            <p className="text-sm text-[#64748B]">No suppliers yet. Add your first supplier above to enable purchase orders.</p>
          )}
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
              {(catalogueQuery.data ?? []).map((item) => (
                <div key={`${item.catalogueId}-${item.productId}`} className="rounded-2xl border border-[#D6F0E8] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#0D4035]">{item.productName}</p>
                      <p className="text-sm text-[#64748B]">
                        Base Tsh {item.price.toLocaleString()}
                        {typeof item.effectivePrice === 'number' ? ` · Effective Tsh ${item.effectivePrice.toLocaleString()}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {Object.entries(item.tierPrices ?? {}).map(([tier, price]) => (
                        <span key={tier} className="rounded-full bg-[#EDF7F3] px-3 py-1 text-xs font-semibold text-[#0D4035]">
                          {tier}: Tsh {Number(price).toLocaleString()}
                        </span>
                      ))}
                      {canManageWholesaleSettings && (
                        <button
                          onClick={() => removeCatalogueItemMutation.mutate({ catalogueId: item.catalogueId, productId: item.productId })}
                          disabled={removeCatalogueItemMutation.isPending}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D6F0E8] text-[#94A3B8] hover:border-red-200 hover:text-[#B91C1C]"
                          title="Remove from catalogue"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {catalogueQuery.data?.length === 0 && <p className="text-sm text-[#64748B]">No wholesale pricing lines saved yet.</p>}
            </div>
          </div>
        </Card>

        <Card header={<h3 className="text-lg font-semibold text-[#0D4035]">Client credit controls</h3>}>
          <div className="space-y-4">
            {canManageWholesaleSettings && (
              <div className="rounded-2xl border border-[#D6F0E8] bg-[#F7FCFA] p-4 space-y-3">
                <p className="text-sm font-semibold text-[#0D4035]">Add a buyer pharmacy</p>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    className="w-full rounded-xl border border-[#D6F0E8] bg-white py-2 pl-9 pr-3 text-sm text-[#0D4035] placeholder:text-[#94A3B8] focus:border-[#1A6B5C] focus:outline-none"
                    placeholder="Search pharmacy name..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />
                </div>
                {(pharmacySearchQuery.data ?? []).length > 0 && (
                  <div className="space-y-2">
                    {pharmacySearchQuery.data!.map((p) => (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-colors ${newClientId === p.id ? 'border-[#1A6B5C] bg-[#EDF7F3]' : 'border-[#E5E7EB] hover:border-[#1A6B5C]'}`}
                        onClick={() => setNewClientId(p.id)}
                      >
                        <div>
                          <p className="text-sm font-medium text-[#0D4035]">{p.name}</p>
                          <p className="text-xs text-[#64748B]">{p.region} · {p.subscriptionTier}</p>
                        </div>
                        {newClientId === p.id && <div className="h-4 w-4 rounded-full bg-[#1A6B5C]" />}
                      </div>
                    ))}
                  </div>
                )}
                {clientSearch.length >= 2 && (pharmacySearchQuery.data ?? []).length === 0 && !pharmacySearchQuery.isLoading && (
                  <p className="text-xs text-[#94A3B8]">No pharmacies found. They must be registered on APOTEKH.</p>
                )}
                {newClientId && (
                  <div className="flex items-end gap-3">
                    <Input
                      label="Initial credit limit (Tsh)"
                      type="number"
                      value={newClientLimit}
                      onChange={(e) => setNewClientLimit(e.target.value)}
                    />
                    <Button
                      leftIcon={<UserPlus size={14} />}
                      onClick={() => addClientMutation.mutate()}
                      loading={addClientMutation.isPending}
                    >
                      Add client
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="mt-4 space-y-3">
            {(creditLimitsQuery.data ?? []).map((limit) => (
              <div key={limit.id} className="rounded-2xl border border-[#D6F0E8] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-[#0D4035]">{limit.clientName ?? limit.clientPharmacyId}</p>
                    <p className="text-sm text-[#64748B]">Outstanding Tsh {limit.outstandingBalance.toLocaleString()}</p>
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
            {creditLimitsQuery.data?.length === 0 && <p className="text-sm text-[#64748B]">No client credit rules yet. Search above to add a buyer pharmacy.</p>}
          </div>
        </Card>
      </div>
      </div>
    </WholesaleShell>
  );
};
