import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Camera,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Pill,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
  X,
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
import {
  LEGACY_DISPENSING_PAYMENT_METHODS,
  type DispensingPaymentMethodOption,
} from '@/modules/settings/paymentMethodConfig';
import { useAuthStore } from '@/stores/authStore';
import {
  normalizePatientPhone,
  useDispensingPatientStore,
} from '@/stores/dispensingPatientStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { usePaymentMethodStore } from '@/stores/paymentMethodStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import type { PaymentMethod, Product } from '@/types';
import { DoseCalculator } from './DoseCalculator';
import { PatientSafetyPanel } from './PatientSafetyPanel';
import type { DispensingCartItem, DispensingReceipt, SafetyReviewResponse, SafetySessionPayload } from './types';

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
const WALK_IN_LABEL = 'Walk-in customer';

const AwarBadge: React.FC<{ awarClass?: Product['awarClass'] }> = ({ awarClass }) => {
  if (awarClass !== 'WATCH' && awarClass !== 'RESERVE') {
    return null;
  }

  const tooltip = `This antibiotic is classified as ${awarClass} under WHO AWaRe / Tanzania NEMLIT 2021. Dispensing requires a valid prescription from an authorised facility.`;

  return (
    <span title={tooltip} aria-label={tooltip} tabIndex={0}>
      <Badge variant={awarClass === 'WATCH' ? 'warning' : 'danger'} size="sm">
        {awarClass} antibiotic
      </Badge>
    </span>
  );
};

export const DispensingScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useNotificationStore((state) => state.toast);
  const pharmacy = usePharmacyStore((state) => state.pharmacy);
  const user = useAuthStore((state) => state.user);
  const weightInputRef = useRef<HTMLInputElement>(null);
  const pharmacyPatientProfiles = useDispensingPatientStore(
    (state) => state.profilesByPharmacy[pharmacy?.id ?? 'default'] ?? [],
  );
  const upsertPatientProfile = useDispensingPatientStore((state) => state.upsertProfile);
  const cachedPaymentMethods = usePaymentMethodStore(
    (state) => state.methodsByPharmacy[pharmacy?.id ?? 'default'] ?? LEGACY_DISPENSING_PAYMENT_METHODS,
  );
  const cachePaymentMethods = usePaymentMethodStore((state) => state.setMethods);

  const [drugSearch, setDrugSearch] = useState('');
  const [showDrugDropdown, setShowDrugDropdown] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [counsellingNotes, setCounsellingNotes] = useState('');
  const [cartItems, setCartItems] = useState<DispensingCartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentRef, setPaymentRef] = useState('');
  const [prescriptionPhoto, setPrescriptionPhoto] = useState<File | null>(null);
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [receipt, setReceipt] = useState<DispensingReceipt | null>(null);

  const [showPatientPanel, setShowPatientPanel] = useState(false);
  const [patientLabel, setPatientLabel] = useState(WALK_IN_LABEL);
  const [patientPhone, setPatientPhone] = useState('');
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
  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.quantity, 0),
    [cartItems],
  );
  const parsedDiscount = Number(discountAmount || 0);
  const totalDue = Math.max(0, cartTotal - (Number.isFinite(parsedDiscount) ? parsedDiscount : 0));
  const canApplyDiscount = ['OWNER', 'PHARMACIST_IN_CHARGE', 'LOCUM', 'SUPER_ADMIN'].includes(user?.role || '');
  const normalizedPatientPhone = useMemo(() => normalizePatientPhone(patientPhone), [patientPhone]);
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
  const paymentMethodsQuery = useQuery({
    queryKey: ['dispensing-payment-methods', pharmacy?.id],
    queryFn: () => api.get('/dispensing/payment-methods').then((response) => response.data),
    enabled: Boolean(pharmacy?.id && user),
    staleTime: 60_000,
  });

  const products: Product[] = productResults?.data || [];
  const serverPaymentMethods = (paymentMethodsQuery.data?.data?.methods ?? []) as DispensingPaymentMethodOption[];
  const availablePaymentMethods =
    serverPaymentMethods.length > 0
      ? serverPaymentMethods
      : cachedPaymentMethods.length > 0
        ? cachedPaymentMethods
        : LEGACY_DISPENSING_PAYMENT_METHODS;
  const paymentOptions = availablePaymentMethods.map((method) => ({
    value: method.code,
    label: method.label,
  }));
  const selectedPaymentOption = availablePaymentMethods.find((method) => method.code === paymentMethod) ?? availablePaymentMethods[0];
  const sessionMatches = useMemo(
    () =>
      patientLabel.trim().length < 2
        ? []
        : sessionShortcuts.filter((shortcut) =>
            shortcut.label.toLowerCase().includes(patientLabel.trim().toLowerCase()),
          ),
    [patientLabel, sessionShortcuts],
  );
  const phoneMatches = useMemo(
    () =>
      normalizedPatientPhone.length < 3
        ? []
        : pharmacyPatientProfiles.filter((profile) => profile.normalizedPhone.includes(normalizedPatientPhone)),
    [normalizedPatientPhone, pharmacyPatientProfiles],
  );
  const sessionFlagOptions: SessionFlagOption[] = [
    { label: 'Pregnant', value: pregnant, setValue: setPregnant },
    { label: 'Breastfeeding', value: breastfeeding, setValue: setBreastfeeding },
    { label: 'Renal impairment', value: renalImpairment, setValue: setRenalImpairment },
    { label: 'Hepatic impairment', value: hepaticImpairment, setValue: setHepaticImpairment },
  ];
  const requiredPatientInputKeys = useMemo(
    () => new Set((safetyStatus.review?.requiredPatientInputs ?? []).map((item) => item.key)),
    [safetyStatus.review?.requiredPatientInputs],
  );
  const numericAgeYears = ageYears ? Number(ageYears) : undefined;
  const numericWeightKg = weightKg ? Number(weightKg) : undefined;
  const isPaediatricPatient = typeof numericAgeYears === 'number' && numericAgeYears >= 0 && numericAgeYears < 12;
  const paediatricWeightRequired = cartItems.length > 0 && isPaediatricPatient && !numericWeightKg;
  const showPatientChecks =
    cartItems.length > 0 &&
    (requiredPatientInputKeys.has('diagnoses') ||
      requiredPatientInputKeys.has('allergies') ||
      requiredPatientInputKeys.has('pregnant') ||
      requiredPatientInputKeys.has('breastfeeding') ||
      requiredPatientInputKeys.has('renalImpairment') ||
      requiredPatientInputKeys.has('hepaticImpairment'));

  const resetPatientProfile = () => {
    setPatientLabel(WALK_IN_LABEL);
    setPatientPhone('');
    setAgeYears('');
    setWeightKg('');
    setDiagnosesText('');
    setAllergiesText('');
    setPregnant(false);
    setBreastfeeding(false);
    setRenalImpairment(false);
    setHepaticImpairment(false);
    setShowPatientPanel(false);
  };

  const applyPatientProfile = (profile: {
    phone?: string;
    name: string;
    ageYears?: number;
    weightKg?: number;
    diagnoses: string[];
    allergies: string[];
    pregnant: boolean;
    breastfeeding: boolean;
    renalImpairment: boolean;
    hepaticImpairment: boolean;
  }) => {
    setPatientLabel(profile.name);
    setPatientPhone(profile.phone ?? '');
    setAgeYears(profile.ageYears ? String(profile.ageYears) : '');
    setWeightKg(profile.weightKg ? String(profile.weightKg) : '');
    setDiagnosesText(profile.diagnoses.join(', '));
    setAllergiesText(profile.allergies.join(', '));
    setPregnant(profile.pregnant);
    setBreastfeeding(profile.breastfeeding);
    setRenalImpairment(profile.renalImpairment);
    setHepaticImpairment(profile.hepaticImpairment);
  };

  useEffect(() => {
    setReceipt(null);
  }, [cartItems, paymentMethod, paymentRef]);
  useEffect(() => {
    if (pharmacy?.id && serverPaymentMethods.length > 0) {
      cachePaymentMethods(pharmacy.id, serverPaymentMethods);
    }
  }, [cachePaymentMethods, pharmacy?.id, serverPaymentMethods]);
  useEffect(() => {
    if (!availablePaymentMethods.some((method) => method.code === paymentMethod)) {
      setPaymentMethod('CASH');
    }
  }, [availablePaymentMethods, paymentMethod]);

  const checkoutMutation = useMutation({
    mutationFn: () => {
      const checkoutPayload = {
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
          counsellingNotes: item.counsellingNotes,
        })),
      };

      if (prescriptionPhoto) {
        const formData = new FormData();
        formData.append('checkout', JSON.stringify(checkoutPayload));
        formData.append('prescriptionPhoto', prescriptionPhoto);
        return api.post('/dispensing/checkout', formData).then((response) => response.data);
      }

      return api.post('/dispensing/checkout', checkoutPayload).then((response) => response.data);
    },
    onSuccess: (response) => {
      setReceipt(response.data);
      setCartItems([]);
      setPaymentRef('');
      setPrescriptionPhoto(null);
      setDiscountAmount('');
      setDiscountReason('');
      setSelectedDrug(null);
      setDrugSearch('');
      resetPatientProfile();
      toast.success('Dispensing completed');
      queryClient.invalidateQueries({ queryKey: ['dashboard-stock'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
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

  const addToCart = async () => {
    if (!selectedDrug) {
      toast.error('Select a medicine first');
      return;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      toast.error('Quantity must be a positive number');
      return;
    }

    let latestSelectedDrug = selectedDrug;
    try {
      const response = await api.get(`/inventory/products/${selectedDrug.id}`);
      if (response.data?.data && !Array.isArray(response.data.data)) {
        latestSelectedDrug = response.data.data as Product;
        setSelectedDrug(latestSelectedDrug);
      }
    } catch {
      // Keep the current selection if the refresh fails; the existing validation below still applies.
    }

    if (!latestSelectedDrug.sellingPrice) {
      toast.error('This product has no selling price set. Update it in Inventory first.');
      return;
    }

    const currentStock = latestSelectedDrug.currentStock ?? 0;
    const existingQuantity = cartItems
      .filter((item) => item.product.id === latestSelectedDrug.id)
      .reduce((sum, item) => sum + item.quantity, 0);

    if (quantity + existingQuantity > currentStock) {
      toast.error(`Only ${currentStock} units available`);
      return;
    }

    const unitPrice = Number(latestSelectedDrug.sellingPrice ?? 0);
    const lineTotal = Number((unitPrice * quantity).toFixed(2));
    const lineId = `${latestSelectedDrug.id}:${counsellingNotes.trim().toLowerCase()}`;

    setCartItems((items) => {
      const existing = items.find((item) => item.id === lineId);
      if (!existing) {
        return [
          ...items,
          {
            id: lineId,
            product: latestSelectedDrug,
            quantity,
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
    applyPatientProfile({
      ...shortcut,
      name: shortcut.label,
    });
  };

  const handleSearchOrRegister = () => {
    if (!normalizedPatientPhone) {
      toast.error('Enter a phone number first');
      return;
    }

    const existingProfile = pharmacyPatientProfiles.find(
      (profile) => profile.normalizedPhone === normalizedPatientPhone,
    );

    if (existingProfile) {
      applyPatientProfile({
        ...existingProfile,
        phone: existingProfile.phone,
      });
      toast.success(`Loaded ${existingProfile.name} from local patient cache`);
      return;
    }

    const trimmedName = patientLabel.trim();
    if (!trimmedName || trimmedName === WALK_IN_LABEL) {
      toast.error('Enter a patient name to register this phone number');
      return;
    }

    const pharmacyId = pharmacy?.id ?? 'default';
    upsertPatientProfile(pharmacyId, {
      phone: patientPhone.trim(),
      normalizedPhone: normalizedPatientPhone,
      name: trimmedName,
      ageYears: ageYears ? Number(ageYears) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined,
      diagnoses: sessionPayload.diagnoses || [],
      allergies: sessionPayload.allergies || [],
      pregnant,
      breastfeeding,
      renalImpairment,
      hepaticImpairment,
      updatedAt: new Date().toISOString(),
    });
    toast.success('Patient saved locally for this pharmacy');
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
          {['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'].includes(user?.role || '') && (
            <Link to="/dispensing/daily-close">
              <Button variant="secondary" size="sm">Daily close</Button>
            </Link>
          )}
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
                {receipt.prescriptionPhotoPath && (
                  <p className="mt-1 text-xs font-medium text-[#1A6B5C]">Prescription photo attached</p>
                )}
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
          {/* Patient bar — collapsed by default, expands on toggle */}
          <div className="rounded-2xl border border-[#D6F0E8] bg-white overflow-hidden">
            {/* Bar */}
            <button
              type="button"
              onClick={() => setShowPatientPanel((v) => !v)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 hover:bg-[#EDF7F3] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <UserRound size={15} className={patientLabel === WALK_IN_LABEL ? 'text-[#94A3B8]' : 'text-[#1A6B5C]'} />
                <span className={`text-sm font-medium ${patientLabel === WALK_IN_LABEL ? 'text-[#64748B]' : 'text-[#0D4035]'}`}>
                  {patientLabel === WALK_IN_LABEL ? 'Walk-in' : patientLabel}
                </span>
                {patientLabel === WALK_IN_LABEL && (
                  <span className="text-xs text-[#94A3B8]">Walk-in default</span>
                )}
                {patientPhone && patientLabel !== WALK_IN_LABEL && (
                  <span className="text-xs text-[#94A3B8]">{patientPhone}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {patientLabel !== WALK_IN_LABEL && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); resetPatientProfile(); setShowPatientPanel(false); }}
                    className="rounded-full p-0.5 text-[#94A3B8] hover:text-[#DC2626] transition-colors"
                    aria-label="Reset to walk-in"
                  >
                    <X size={13} />
                  </button>
                )}
                <span className="text-xs text-[#94A3B8]">
                  {showPatientPanel ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </span>
              </div>
            </button>

            {/* Expandable panel */}
            {showPatientPanel && (
              <div className="border-t border-[#D6F0E8] px-4 py-4 space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[180px]">
                    <Input
                      label="Phone number"
                      value={patientPhone}
                      onChange={(event) => setPatientPhone(event.target.value)}
                      placeholder="Search or register by phone"
                    />
                  </div>
                  <Button onClick={handleSearchOrRegister}>Search/Register</Button>
                  <Button variant="ghost" onClick={resetPatientProfile}>Use walk-in</Button>
                </div>

                {phoneMatches.length > 0 && (
                  <div className="space-y-2">
                    {phoneMatches.map((profile) => (
                      <button
                        key={profile.normalizedPhone}
                        type="button"
                        onClick={() => { applyPatientProfile({ ...profile, phone: profile.phone }); setShowPatientPanel(false); }}
                        className="flex w-full items-center justify-between rounded-2xl border border-[#D6F0E8] bg-[#F8FAFC] px-4 py-3 text-left hover:bg-[#EDF7F3]"
                      >
                        <span>
                          <span className="block text-sm font-semibold text-[#0D4035]">{profile.name}</span>
                          <span className="mt-0.5 block text-xs text-[#64748B]">{profile.phone}</span>
                        </span>
                        <Badge variant="info" size="sm">Load</Badge>
                      </button>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <Input
                    label="Patient name / label"
                    value={patientLabel}
                    onChange={(event) => setPatientLabel(event.target.value || WALK_IN_LABEL)}
                    placeholder="Enter name to register a new patient"
                  />
                  {sessionMatches.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-2xl border border-[#D6F0E8] bg-white shadow-lg">
                      {sessionMatches.map((shortcut) => (
                        <button
                          key={shortcut.label}
                          type="button"
                          onClick={() => { applySessionShortcut(shortcut); setShowPatientPanel(false); }}
                          className="block w-full border-b border-[#D6F0E8] px-4 py-3 text-left text-sm text-[#0D4035] last:border-b-0 hover:bg-[#EDF7F3]"
                        >
                          {shortcut.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Age (years)"
                    type="number"
                    min="0"
                    value={ageYears}
                    onChange={(event) => setAgeYears(event.target.value)}
                    placeholder="Optional"
                  />
                  <Input
                    ref={weightInputRef}
                    label="Weight (kg)"
                    type="number"
                    min="0"
                    value={weightKg}
                    onChange={(event) => setWeightKg(event.target.value)}
                    placeholder="Optional"
                  />
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={saveSessionShortcut}>Save shortcut</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowPatientPanel(false)}>Done</Button>
                </div>
              </div>
            )}
          </div>

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
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[#0D4035]">
                          {product.genericName || product.name}
                        </p>
                        <AwarBadge awarClass={product.awarClass} />
                      </div>
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
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[#0D4035]">{selectedDrug.genericName || selectedDrug.name}</p>
                  <AwarBadge awarClass={selectedDrug.awarClass} />
                </div>
                <p className="mt-1 text-xs text-[#64748B]">
                  {[selectedDrug.strength, selectedDrug.dosageForm, selectedDrug.tmdaRegistrationNumber].filter(Boolean).join(' | ')}
                </p>
                <p className="mt-1 text-xs text-[#1A6B5C]">
                  {selectedDrug.currentStock ?? 0} units available
                </p>
              </div>
            )}

            <div className="mt-4">
              <Input
                label="Quantity"
                type="number"
                min="1"
                value={String(quantity)}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
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
                  setCounsellingNotes('');
                }}
              >
                Clear line
              </Button>
            </div>
          </Card>

          {showPatientChecks && (
            <Card
              header={
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <UserRound size={16} className="text-[#1A6B5C]" />
                    <span className="text-sm font-semibold text-[#0D4035]">Rule-triggered patient checks</span>
                  </div>
                  <Badge variant="warning" size="sm">
                    After medicine selection
                  </Badge>
                </div>
              }
            >
              <div className="rounded-2xl bg-[#F8FAFC] px-4 py-3 text-xs text-[#64748B]">
                {(safetyStatus.review?.requiredPatientInputs ?? []).map((item) => item.reason).join(' ')}
              </div>

              {(requiredPatientInputKeys.has('diagnoses') || requiredPatientInputKeys.has('allergies')) && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {requiredPatientInputKeys.has('diagnoses') && (
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
                  )}
                  {requiredPatientInputKeys.has('allergies') && (
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
                  )}
                </div>
              )}

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {sessionFlagOptions
                  .filter(({ label }) => {
                    const key =
                      label === 'Pregnant'
                        ? 'pregnant'
                        : label === 'Breastfeeding'
                          ? 'breastfeeding'
                          : label === 'Renal impairment'
                            ? 'renalImpairment'
                            : 'hepaticImpairment';
                    return requiredPatientInputKeys.has(key);
                  })
                  .map(({ label, value, setValue }) => (
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
          )}

          <DoseCalculator
            patientAgeYears={ageYears}
            patientWeightKg={weightKg}
            pediatricWeightRequired={paediatricWeightRequired}
            onRequestWeight={() => weightInputRef.current?.focus()}
          />
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
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[#0D4035]">
                            {item.product.genericName || item.product.name}
                          </p>
                          <AwarBadge awarClass={item.product.awarClass} />
                        </div>
                        <p className="mt-1 text-xs text-[#64748B]">{item.quantity} x {money(item.unitPrice)}</p>
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

              {selectedPaymentOption && selectedPaymentOption.code !== 'CASH' && (
                <div className="rounded-2xl border border-[#D6F0E8] bg-white px-4 py-3 text-sm text-[#475569]">
                  <p className="font-semibold text-[#0D4035]">{selectedPaymentOption.label}</p>
                  {selectedPaymentOption.phoneNumber && (
                    <p className="mt-1">Pay to: {selectedPaymentOption.phoneNumber}</p>
                  )}
                  {selectedPaymentOption.note && (
                    <p className="mt-1">{selectedPaymentOption.note}</p>
                  )}
                  {paymentMethodsQuery.isError && selectedPaymentOption.source !== 'legacy' && (
                    <p className="mt-1 text-xs text-[#92400E]">
                      Using the last cached payment settings while offline or when the server is unavailable.
                    </p>
                  )}
                </div>
              )}

                {selectedPaymentOption?.requiresReference && (
                  <Input
                    label="Payment reference"
                    value={paymentRef}
                    onChange={(event) => setPaymentRef(event.target.value)}
                    placeholder="Transaction reference"
                  />
                )}

                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-[#374151]">
                    <Camera size={15} className="text-[#1A6B5C]" />
                    Prescription photo (optional)
                  </label>
                  <input
                    aria-label="Prescription photo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    capture="environment"
                    onChange={(event) => setPrescriptionPhoto(event.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-[#0D4035] file:mr-4 file:rounded-xl file:border-0 file:bg-[#EDF7F3] file:px-4 file:py-2 file:font-medium file:text-[#1A6B5C] hover:file:bg-[#D6F0E8]"
                  />
                  <p className="mt-2 text-xs text-[#64748B]">
                    Use the phone camera or upload an image if you want to keep the original prescription with this sale.
                  </p>
                  {prescriptionPhoto && (
                    <div className="mt-2 flex items-center justify-between rounded-2xl border border-[#D6F0E8] bg-white px-3 py-2 text-sm text-[#0D4035]">
                      <span className="truncate">{prescriptionPhoto.name}</span>
                      <Button size="sm" variant="ghost" onClick={() => setPrescriptionPhoto(null)}>
                        Clear
                      </Button>
                    </div>
                  )}
                </div>

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
