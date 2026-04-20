import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  AlertTriangle,
  CheckCircle,
  Pill,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  UserRoundSearch,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/lib/api';
import { downloadReceiptPdf } from '@/lib/receiptPdf';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import type { PaymentMethod, Product } from '@/types';
import { DoseCalculator } from './DoseCalculator';
import { PatientSafetyPanel } from './PatientSafetyPanel';
import type { DispensingCartItem, DispensingReceipt, SafetyReviewResponse, SafetySessionPayload } from './types';

const paymentOptions = [
  { value: 'CASH', label: 'Cash' },
  { value: 'MPESA', label: 'M-Pesa' },
  { value: 'TIGOPESA', label: 'Tigo Pesa' },
];

const money = (value: number) =>
  new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
  }).format(value);

type SessionShortcut = {
  label: string;
  ageYears?: number;
  weightKg?: number;
  diagnoses: string[];
  allergies: string[];
  pregnant: boolean;
  breastfeeding: boolean;
  renalImpairment: boolean;
  hepaticImpairment: boolean;
};

type SessionFlagOption = {
  label: string;
  value: boolean;
  setValue: React.Dispatch<React.SetStateAction<boolean>>;
};

const isRetailSafetyTier = (tier?: string | null) => ['STANDARD', 'PREMIUM', 'ENTERPRISE'].includes(tier || '');

export const DispensingScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useNotificationStore((state) => state.toast);
  const pharmacy = usePharmacyStore((state) => state.pharmacy);
  const user = useAuthStore((state) => state.user);

  const [drugSearch, setDrugSearch] = useState('');
  const [showDrugDropdown, setShowDrugDropdown] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [dose, setDose] = useState('');
  const [counsellingNotes, setCounsellingNotes] = useState('');
  const [cartItems, setCartItems] = useState<DispensingCartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentRef, setPaymentRef] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [receipt, setReceipt] = useState<DispensingReceipt | null>(null);

  const [patientLabel, setPatientLabel] = useState('');
  const [ageYears, setAgeYears] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [diagnosesText, setDiagnosesText] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [pregnant, setPregnant] = useState(false);
  const [breastfeeding, setBreastfeeding] = useState(false);
  const [renalImpairment, setRenalImpairment] = useState(false);
  const [hepaticImpairment, setHepaticImpairment] = useState(false);
  const [sessionShortcuts, setSessionShortcuts] = useState<SessionShortcut[]>([]);
  const [safetyStatus, setSafetyStatus] = useState<{
    review: SafetyReviewResponse | null;
    requiresOverride: boolean;
    overrideDraft?: { reason: string; pic_pin: string };
  }>({ review: null, requiresOverride: false });

  const debouncedDrugSearch = useDebounce(drugSearch, 250);
  const cartTotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.lineTotal, 0), [cartItems]);
  const parsedDiscount = Number(discountAmount || 0);
  const totalDue = Math.max(0, cartTotal - (Number.isFinite(parsedDiscount) ? parsedDiscount : 0));
  const canApplyDiscount = ['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'].includes(user?.role || '');
  const safetyEnabled =
    isRetailSafetyTier(pharmacy?.subscriptionTier) &&
    pharmacy?.pharmacyType !== 'ADDO' &&
    !['WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF', 'DELIVERY_STAFF', 'WHOLESALE_SELLER'].includes(user?.role || '');

  const sessionPayload = useMemo<SafetySessionPayload>(
    () => ({
      pregnant,
      breastfeeding,
      ageYears: ageYears ? Number(ageYears) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined,
      allergies: allergiesText.split(',').map((value) => value.trim()).filter(Boolean),
      diagnoses: diagnosesText.split(',').map((value) => value.trim()).filter(Boolean),
      renalImpairment,
      hepaticImpairment,
    }),
    [
      ageYears,
      allergiesText,
      breastfeeding,
      diagnosesText,
      hepaticImpairment,
      pregnant,
      renalImpairment,
      weightKg,
    ],
  );

  const { data: productResults } = useQuery({
    queryKey: ['dispensing-products', debouncedDrugSearch],
    queryFn: () =>
      api
        .get('/inventory/products', { params: { search: debouncedDrugSearch, limit: 10 } })
        .then((response) => response.data),
    enabled: debouncedDrugSearch.trim().length > 1,
  });

  const products: Product[] = productResults?.data || [];
  const sessionMatches = useMemo(
    () =>
      patientLabel.trim().length < 2
        ? []
        : sessionShortcuts.filter((shortcut) =>
            shortcut.label.toLowerCase().includes(patientLabel.trim().toLowerCase()),
          ),
    [patientLabel, sessionShortcuts],
  );
  const sessionFlagOptions: SessionFlagOption[] = [
    { label: 'Pregnant', value: pregnant, setValue: setPregnant },
    { label: 'Breastfeeding', value: breastfeeding, setValue: setBreastfeeding },
    { label: 'Renal impairment', value: renalImpairment, setValue: setRenalImpairment },
    { label: 'Hepatic impairment', value: hepaticImpairment, setValue: setHepaticImpairment },
  ];

  useEffect(() => {
    setReceipt(null);
  }, [cartItems, paymentMethod, paymentRef]);

  const checkoutMutation = useMutation({
    mutationFn: () =>
      api
        .post('/dispensing/checkout', {
          paymentMethod,
          paymentRef: paymentRef.trim() || undefined,
          discountAmount: canApplyDiscount && parsedDiscount > 0 ? parsedDiscount : undefined,
          discountReason: canApplyDiscount && discountReason.trim() ? discountReason.trim() : undefined,
          safetyContext: safetyEnabled ? sessionPayload : undefined,
          override: safetyStatus.requiresOverride ? safetyStatus.overrideDraft : undefined,
          items: cartItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            dose: item.dose,
            counsellingNotes: item.counsellingNotes,
          })),
        })
        .then((response) => response.data),
    onSuccess: (response) => {
      setReceipt(response.data);
      setCartItems([]);
      setPaymentRef('');
      setDiscountAmount('');
      setDiscountReason('');
      setSelectedDrug(null);
      setDrugSearch('');
      toast.success('Dispensing completed');
      queryClient.invalidateQueries({ queryKey: ['dashboard-stock'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      const serverReview = error.response?.data?.review;
      if (serverReview) {
        setSafetyStatus((current) => ({ ...current, review: serverReview, requiresOverride: true }));
      }
      toast.error(error.response?.data?.error || 'Checkout failed');
    },
  });

  const addToCart = () => {
    if (!selectedDrug) {
      toast.error('Select a medicine first');
      return;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      toast.error('Quantity must be a positive number');
      return;
    }

    const currentStock = selectedDrug.currentStock ?? 0;
    const existingQuantity = cartItems
      .filter((item) => item.product.id === selectedDrug.id)
      .reduce((sum, item) => sum + item.quantity, 0);

    if (quantity + existingQuantity > currentStock) {
      toast.error(`Only ${currentStock} units available`);
      return;
    }

    const unitPrice = Number(selectedDrug.sellingPrice ?? 0);
    const lineTotal = Number((unitPrice * quantity).toFixed(2));
    const lineId = `${selectedDrug.id}:${dose.trim().toLowerCase()}:${counsellingNotes.trim().toLowerCase()}`;

    setCartItems((items) => {
      const existing = items.find((item) => item.id === lineId);
      if (!existing) {
        return [
          ...items,
          {
            id: lineId,
            product: selectedDrug,
            quantity,
            dose: dose.trim() || undefined,
            counsellingNotes: counsellingNotes.trim() || undefined,
            unitPrice,
            lineTotal,
          },
        ];
      }

      const quantityTotal = existing.quantity + quantity;
      return items.map((item) =>
        item.id === lineId
          ? {
              ...item,
              quantity: quantityTotal,
              lineTotal: Number((quantityTotal * item.unitPrice).toFixed(2)),
            }
          : item,
      );
    });

    setSelectedDrug(null);
    setDrugSearch('');
    setQuantity(1);
    setDose('');
    setCounsellingNotes('');
    toast.success('Medicine added to cart');
  };

  const saveSessionShortcut = () => {
    if (!patientLabel.trim()) {
      toast.error('Enter a session label first');
      return;
    }

    const shortcut: SessionShortcut = {
      label: patientLabel.trim(),
      ageYears: ageYears ? Number(ageYears) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined,
      diagnoses: sessionPayload.diagnoses || [],
      allergies: sessionPayload.allergies || [],
      pregnant,
      breastfeeding,
      renalImpairment,
      hepaticImpairment,
    };

    setSessionShortcuts((current) => [
      shortcut,
      ...current.filter((item) => item.label.toLowerCase() !== shortcut.label.toLowerCase()),
    ]);
    toast.success('Session shortcut saved for this browser session');
  };

  const applySessionShortcut = (shortcut: SessionShortcut) => {
    setPatientLabel(shortcut.label);
    setAgeYears(shortcut.ageYears ? String(shortcut.ageYears) : '');
    setWeightKg(shortcut.weightKg ? String(shortcut.weightKg) : '');
    setDiagnosesText(shortcut.diagnoses.join(', '));
    setAllergiesText(shortcut.allergies.join(', '));
    setPregnant(shortcut.pregnant);
    setBreastfeeding(shortcut.breastfeeding);
    setRenalImpairment(shortcut.renalImpairment);
    setHepaticImpairment(shortcut.hepaticImpairment);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0D4035]">Dispensing workflow</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Add products, review session-only safety guidance, then complete payment with FEFO stock allocation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/dispensing/daily-close">
            <Button variant="secondary" size="sm">Daily close</Button>
          </Link>
          <Badge variant={safetyEnabled ? 'success' : 'muted'} size="sm">
            {safetyEnabled ? 'Safety enabled' : 'Basic retail flow'}
          </Badge>
        </div>
      </div>

      {receipt && (
        <Card className="border-[#1A6B5C]/20 bg-[#EDF7F3]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-[#1A6B5C]" />
                <p className="text-sm font-semibold text-[#0D4035]">Dispensing complete</p>
              </div>
              <p className="mt-2 text-sm text-[#475569]">
                Reference {receipt.referenceNumber} | {format(new Date(receipt.createdAt), 'dd MMM yyyy HH:mm')}
              </p>
              <p className="mt-1 text-sm text-[#475569]">
                {receipt.itemCount} item{receipt.itemCount === 1 ? '' : 's'} | {money(receipt.totalAmount)} | {receipt.paymentMethod.replace(/_/g, ' ')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  downloadReceiptPdf({
                    referenceNumber: receipt.referenceNumber,
                    pharmacyName: pharmacy?.name ?? 'PharmaConnect',
                    pharmacyAddress: pharmacy?.address ?? 'Address not set',
                    pharmacyLicence: pharmacy?.licenceNumber ?? 'Licence not set',
                    totalAmount: receipt.totalAmount,
                    paymentMethod: receipt.paymentMethod,
                    items: receipt.lines.map((line) => ({
                      name: line.productName,
                      quantity: line.quantity,
                      unitPrice: line.unitPrice,
                      lineTotal: line.totalAmount,
                    })),
                    createdAt: receipt.createdAt,
                    dispensedBy: user ? `${user.firstName} ${user.lastName}` : 'PharmaConnect user',
                  });
                }}
              >
                Download receipt
              </Button>
              <Button size="sm" onClick={() => setReceipt(null)}>New dispensing</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_420px]">
        <div className="space-y-5">
          <Card
            header={
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <UserRoundSearch size={16} className="text-[#1A6B5C]" />
                  <span className="text-sm font-semibold text-[#0D4035]">Session patient profile</span>
                </div>
                <Badge variant="info" size="sm">No data saved</Badge>
              </div>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative">
                <Input
                  label="Session label"
                  value={patientLabel}
                  onChange={(event) => setPatientLabel(event.target.value)}
                  placeholder="e.g. walk-in child, repeat customer"
                />
                {sessionMatches.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-2xl border border-[#D6F0E8] bg-white shadow-lg">
                    {sessionMatches.map((shortcut) => (
                      <button
                        key={shortcut.label}
                        type="button"
                        onClick={() => applySessionShortcut(shortcut)}
                        className="block w-full border-b border-[#D6F0E8] px-4 py-3 text-left text-sm text-[#0D4035] last:border-b-0 hover:bg-[#EDF7F3]"
                      >
                        {shortcut.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-end">
                <Button variant="secondary" onClick={saveSessionShortcut}>
                  Save session shortcut
                </Button>
              </div>
              <Input
                label="Age (years)"
                type="number"
                min="0"
                value={ageYears}
                onChange={(event) => setAgeYears(event.target.value)}
                placeholder="Optional"
              />
              <Input
                label="Weight (kg)"
                type="number"
                min="0"
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#0D4035]">Diagnoses</label>
                <textarea
                  value={diagnosesText}
                  onChange={(event) => setDiagnosesText(event.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-[#D6F0E8] px-3 py-2.5 text-sm text-[#0D4035] outline-none transition-colors focus:border-[#1A6B5C] focus:ring-2 focus:ring-[#1A6B5C]/20"
                  placeholder="Comma separated, e.g. epilepsy, hypertension in pregnancy"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#0D4035]">Allergies</label>
                <textarea
                  value={allergiesText}
                  onChange={(event) => setAllergiesText(event.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-[#D6F0E8] px-3 py-2.5 text-sm text-[#0D4035] outline-none transition-colors focus:border-[#1A6B5C] focus:ring-2 focus:ring-[#1A6B5C]/20"
                  placeholder="Comma separated, e.g. penicillin, NSAID"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {sessionFlagOptions.map(({ label, value, setValue }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setValue(!value)}
                  className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                    value
                      ? 'border-[#1A6B5C] bg-[#EDF7F3] text-[#0D4035]'
                      : 'border-[#D6F0E8] bg-white text-[#64748B]'
                  }`}
                >
                  <p className="text-xs uppercase tracking-wide">{label}</p>
                  <p className="mt-1 text-sm font-semibold">{value ? 'Yes' : 'No'}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card
            header={
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Pill size={16} className="text-[#1A6B5C]" />
                  <span className="text-sm font-semibold text-[#0D4035]">Medicine entry</span>
                </div>
                {selectedDrug && (
                  <Badge variant="success" size="sm">
                    {money(Number(selectedDrug.sellingPrice ?? 0))}
                  </Badge>
                )}
              </div>
            }
          >
            <div className="relative">
              <Input
                label="Medicine"
                value={selectedDrug ? selectedDrug.genericName || selectedDrug.name : drugSearch}
                onChange={(event) => {
                  setDrugSearch(event.target.value);
                  setSelectedDrug(null);
                  setShowDrugDropdown(true);
                }}
                onFocus={() => setShowDrugDropdown(true)}
                placeholder="Search product name, generic name, barcode, or SKU"
                leftIcon={<Search size={16} />}
              />
              {showDrugDropdown && !selectedDrug && products.length > 0 && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-[#D6F0E8] bg-white shadow-lg">
                  {products.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        setSelectedDrug(product);
                        setDrugSearch('');
                        setShowDrugDropdown(false);
                      }}
                      className="block w-full border-b border-[#D6F0E8] px-4 py-3 text-left last:border-b-0 hover:bg-[#EDF7F3]"
                    >
                      <p className="text-sm font-semibold text-[#0D4035]">
                        {product.genericName || product.name}
                      </p>
                      <p className="mt-1 text-xs text-[#64748B]">
                        {[product.name, product.strength, `Stock: ${product.currentStock ?? 0}`].filter(Boolean).join(' | ')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedDrug && (
              <div className="mt-4 rounded-2xl bg-[#EDF7F3] px-4 py-3">
                <p className="text-sm font-semibold text-[#0D4035]">{selectedDrug.genericName || selectedDrug.name}</p>
                <p className="mt-1 text-xs text-[#64748B]">
                  {[selectedDrug.strength, selectedDrug.dosageForm, selectedDrug.tmdaRegistrationNumber].filter(Boolean).join(' | ')}
                </p>
                <p className="mt-1 text-xs text-[#1A6B5C]">
                  {selectedDrug.currentStock ?? 0} units available
                </p>
              </div>
            )}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Input
                label="Quantity"
                type="number"
                min="1"
                value={String(quantity)}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
              />
              <Input
                label="Dose / directions"
                value={dose}
                onChange={(event) => setDose(event.target.value)}
                placeholder="e.g. 1 tablet twice daily"
              />
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-[#0D4035]">Counselling notes</label>
              <textarea
                value={counsellingNotes}
                onChange={(event) => setCounsellingNotes(event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-[#D6F0E8] px-3 py-2.5 text-sm text-[#0D4035] outline-none transition-colors focus:border-[#1A6B5C] focus:ring-2 focus:ring-[#1A6B5C]/20"
                placeholder="Optional counselling or adherence notes"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button leftIcon={<Plus size={16} />} onClick={addToCart} disabled={!selectedDrug}>
                Add to basket
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedDrug(null);
                  setDrugSearch('');
                  setQuantity(1);
                  setDose('');
                  setCounsellingNotes('');
                }}
              >
                Clear line
              </Button>
            </div>
          </Card>

          <DoseCalculator />
        </div>

        <div className="space-y-5">
          <PatientSafetyPanel
            enabled={safetyEnabled}
            cartItems={cartItems}
            sessionPayload={sessionPayload}
            onStatusChange={setSafetyStatus}
          />

          <Card
            padding={false}
            header={
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={16} className="text-[#1A6B5C]" />
                  <span className="text-sm font-semibold text-[#0D4035]">Basket and payment</span>
                </div>
                <Badge variant={cartItems.length > 0 ? 'success' : 'muted'} size="sm">
                  {cartItems.length} item{cartItems.length === 1 ? '' : 's'}
                </Badge>
              </div>
            }
          >
            {cartItems.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[#64748B]">
                No medicines in the basket yet.
              </div>
            ) : (
              <div className="divide-y divide-[#D6F0E8]">
                {cartItems.map((item) => (
                  <div key={item.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0D4035]">
                          {item.product.genericName || item.product.name}
                        </p>
                        <p className="mt-1 text-xs text-[#64748B]">
                          {item.quantity} x {money(item.unitPrice)} {item.dose ? `| ${item.dose}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#0D4035]">{money(item.lineTotal)}</p>
                        <button
                          type="button"
                          onClick={() => setCartItems((current) => current.filter((cartItem) => cartItem.id !== item.id))}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-[#DC2626] hover:underline"
                        >
                          <Trash2 size={12} />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4 rounded-b-2xl bg-[#F8FAFC] px-5 py-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#64748B]">Subtotal</span>
                <span className="text-sm font-semibold text-[#0D4035]">{money(cartTotal)}</span>
              </div>

              {canApplyDiscount && (
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    label="Discount amount"
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(event) => setDiscountAmount(event.target.value)}
                    placeholder="0"
                  />
                  <Input
                    label="Discount reason"
                    value={discountReason}
                    onChange={(event) => setDiscountReason(event.target.value)}
                    placeholder="Reason required if discount applied"
                  />
                </div>
              )}

              <Select
                label="Payment method"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                options={paymentOptions}
              />

              {paymentMethod !== 'CASH' && (
                <Input
                  label="Payment reference"
                  value={paymentRef}
                  onChange={(event) => setPaymentRef(event.target.value)}
                  placeholder="Transaction reference"
                />
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-[#64748B]">Total due</span>
                <span className="text-xl font-bold text-[#0D4035]">{money(totalDue)}</span>
              </div>

              {safetyStatus.requiresOverride && !safetyStatus.overrideDraft && (
                <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs text-[#92400E]">
                  Add an override reason and PIC PIN in the patient safety panel before checkout.
                </div>
              )}

              {!safetyEnabled && pharmacy?.subscriptionTier === 'ADDO' && (
                <div className="rounded-2xl border border-[#D6F0E8] bg-white px-4 py-3 text-xs text-[#475569]">
                  ADDO dispensing uses the basic sale flow only. Patient safety tools are intentionally hidden.
                </div>
              )}

              <Button
                className="w-full"
                leftIcon={<CheckCircle size={16} />}
                loading={checkoutMutation.isPending}
                disabled={
                  cartItems.length === 0 ||
                  (parsedDiscount > 0 && (!canApplyDiscount || !discountReason.trim())) ||
                  (safetyStatus.requiresOverride && !safetyStatus.overrideDraft)
                }
                onClick={() => checkoutMutation.mutate()}
              >
                Complete dispensing
              </Button>
            </div>
          </Card>

          {receipt?.safetyReview && receipt.safetyReview.requiresPicPin && (
            <div className="flex items-start gap-2 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs text-[#92400E]">
              <AlertTriangle size={14} className="mt-0.5 text-[#D97706]" />
              <p>
                This dispensing included a documented PIC override. The override record is preserved in the permanent audit log.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
