import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle,
  Plus,
  ScanLine,
  Search,
  ShoppingCart,
  Trash2,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/lib/api';
import { downloadReceiptPdf } from '@/lib/receiptPdf';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import type { ICD10Code, Patient, Product } from '@/types';

type PaymentMethod = 'CASH' | 'MPESA' | 'TIGOPESA' | 'AIRTEL_MONEY' | 'HALOPESA' | 'INSURANCE';

type ProductSearchResult = Product & {
  currentStock?: number;
  hasNearExpiry?: boolean;
};

interface CartItem {
  id: string;
  product: ProductSearchResult;
  quantity: number;
  dose?: string;
  icdCode?: string;
  icdDescription?: string;
  counsellingNotes?: string;
  unitPrice: number;
  lineTotal: number;
}

interface CheckoutReceipt {
  referenceNumber?: string;
  productName?: string;
  quantity?: number;
  paymentMethod?: PaymentMethod;
  paymentRef?: string | null;
  totalAmount?: number;
  itemCount?: number;
  vfdReceiptNumber?: string | null;
  vfdStatus?: string;
  vfdReceipts?: Array<{
    eventId: string;
    vfdReceiptNumber?: string | null;
    vfdStatus?: string;
  }>;
  lines?: Array<{
    productName: string;
    quantity: number;
    totalAmount: number;
    unitPrice?: number;
    batchNumber?: string;
    vfdReceiptNumber?: string | null;
    vfdStatus?: string;
  }>;
  createdAt?: string;
  dispensedAt?: string;
}

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string; color: string }> = [
  { value: 'CASH', label: 'Cash', color: 'text-[#1A6B5C]' },
  { value: 'MPESA', label: 'M-Pesa', color: 'text-[#00A651]' },
  { value: 'TIGOPESA', label: 'Tigo', color: 'text-[#E60000]' },
  { value: 'AIRTEL_MONEY', label: 'Airtel', color: 'text-[#FF0000]' },
  { value: 'HALOPESA', label: 'Halo', color: 'text-[#F7941D]' },
  { value: 'INSURANCE', label: 'Insurance', color: 'text-[#6D28D9]' },
];

const money = (value: number) =>
  new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
  }).format(value);

const getProductLabel = (product: ProductSearchResult) =>
  product.genericName || product.name;

export const DispensingScreenPage: React.FC = () => {
  const toast = useNotificationStore((s) => s.toast);
  const pharmacy = usePharmacyStore((s) => s.pharmacy);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [patientId, setPatientId] = useState('');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [drugSearch, setDrugSearch] = useState('');
  const [showDrugDropdown, setShowDrugDropdown] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState<ProductSearchResult | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [dose, setDose] = useState('');
  const [icdSearch, setIcdSearch] = useState('');
  const [selectedIcd, setSelectedIcd] = useState<ICD10Code | null>(null);
  const [showIcdDropdown, setShowIcdDropdown] = useState(false);
  const [patientPanelOpen, setPatientPanelOpen] = useState(false);
  const [counsellingNotes, setCounsellingNotes] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentRef, setPaymentRef] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [receipt, setReceipt] = useState<CheckoutReceipt | null>(null);

  const debouncedDrugSearch = useDebounce(drugSearch, 300);
  const debouncedIcdSearch = useDebounce(icdSearch, 250);

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [cartItems]
  );

  const { data: drugResults } = useQuery({
    queryKey: ['dispensing-product-search', debouncedDrugSearch],
    queryFn: () =>
      api
        .get('/inventory/products', {
          params: { search: debouncedDrugSearch, limit: 10 },
        })
        .then((r) => r.data),
    enabled: debouncedDrugSearch.trim().length > 1,
  });

  const { data: icdResults } = useQuery({
    queryKey: ['icd10-search', debouncedIcdSearch],
    queryFn: () =>
      api
        .get('/patients/icd10/search', {
          params: { q: debouncedIcdSearch, limit: 8 },
        })
        .then((r) => r.data),
    enabled: debouncedIcdSearch.trim().length > 1,
  });

  const products: ProductSearchResult[] = drugResults?.data || [];
  const icdCodes: ICD10Code[] = icdResults?.data || [];

  const loadPatientMutation = useMutation({
    mutationFn: () => api.get(`/patients/${patientId.trim()}`).then((r) => r.data),
    onSuccess: (response) => {
      setPatient(response.data);
      toast.success('Patient loaded');
    },
    onError: (error: any) => {
      setPatient(null);
      toast.error(error.response?.data?.error || 'Patient not found');
    },
  });

  const resetLineForm = useCallback(() => {
    setSelectedDrug(null);
    setDrugSearch('');
    setShowDrugDropdown(false);
    setQuantity(1);
    setDose('');
    setSelectedIcd(null);
    setIcdSearch('');
    setShowIcdDropdown(false);
    setCounsellingNotes('');
    setRecipientPhone('');
  }, []);

  const addToCart = useCallback(() => {
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
    const lineTotal = unitPrice * quantity;
    const key = [
      selectedDrug.id,
      dose.trim().toLowerCase(),
      selectedIcd?.code || '',
      counsellingNotes.trim().toLowerCase(),
    ].join('|');

    setCartItems((items) => {
      const existing = items.find((item) => item.id === key);
      if (!existing) {
        return [
          ...items,
          {
            id: key,
            product: selectedDrug,
            quantity,
            dose: dose.trim() || undefined,
            icdCode: selectedIcd?.code,
            icdDescription: selectedIcd?.description,
            counsellingNotes: counsellingNotes.trim() || undefined,
            unitPrice,
            lineTotal,
          },
        ];
      }

      return items.map((item) => {
        if (item.id !== key) return item;
        const quantityTotal = item.quantity + quantity;
        return {
          ...item,
          quantity: quantityTotal,
          lineTotal: quantityTotal * item.unitPrice,
        };
      });
    });

    setReceipt(null);
    resetLineForm();
    toast.success('Medicine added to cart');
  }, [cartItems, counsellingNotes, dose, quantity, resetLineForm, selectedDrug, selectedIcd, toast]);

  const checkoutMutation = useMutation({
    mutationFn: () =>
      api
        .post('/patients/dispense/walk-in', {
          patientId: patient?.id,
          paymentMethod,
          paymentRef: paymentRef.trim() || undefined,
          items: cartItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            dose: item.dose,
            icdCode: item.icdCode,
            counsellingNotes: item.counsellingNotes,
            unitPrice: item.unitPrice,
          })),
        })
        .then((r) => r.data),
    onSuccess: (response) => {
      setReceipt(response.data);
      setCartItems([]);
      setPaymentRef('');
      resetLineForm();
      queryClient.invalidateQueries({ queryKey: ['dispensing-product-search'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stock'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-today'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
      toast.success('Checkout completed');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Checkout failed');
    },
  });

  const receiptSummary = useMemo(() => {
    if (!receipt) return null;

    const lines = receipt.lines ?? [];
    const productName =
      lines.length > 1
        ? `${lines.length} medicines`
        : lines[0]?.productName || receipt.productName || 'Medicines';
    const quantity =
      lines.length > 0
        ? lines.reduce((sum, line) => sum + line.quantity, 0)
        : receipt.quantity ?? 0;
    const vfdReceiptNumber =
      receipt.vfdReceiptNumber ||
      receipt.vfdReceipts?.find((entry) => entry.vfdReceiptNumber)?.vfdReceiptNumber ||
      lines.find((line) => line.vfdReceiptNumber)?.vfdReceiptNumber ||
      null;
    const totalAmount = receipt.totalAmount ?? lines.reduce((sum, line) => sum + line.totalAmount, 0);
    const payment = (receipt.paymentMethod || paymentMethod).replace(/_/g, ' ');
    const unitPrice =
      lines.length === 1
        ? lines[0].unitPrice ?? (lines[0].quantity > 0 ? lines[0].totalAmount / lines[0].quantity : 0)
        : quantity > 0
          ? totalAmount / quantity
          : 0;
    const items =
      lines.length > 0
        ? lines.map((line) => ({
            productName: line.productName,
            quantity: line.quantity,
            unitPrice: line.unitPrice ?? (line.quantity > 0 ? line.totalAmount / line.quantity : 0),
            totalAmount: line.totalAmount,
            batchNumber: line.batchNumber,
            vfdReceiptNumber: line.vfdReceiptNumber,
          }))
        : [
            {
              productName,
              quantity,
              unitPrice,
              totalAmount,
              vfdReceiptNumber,
            },
          ];
    const date = format(new Date(receipt.createdAt || receipt.dispensedAt || Date.now()), 'dd MMM yyyy HH:mm');
    const itemText =
      lines.length > 0
        ? lines
            .map(
              (line) =>
                `${line.productName} - ${line.quantity} units - TZS ${line.totalAmount.toLocaleString()}`
            )
            .join('\n')
        : `Product: ${productName}\nQty: ${quantity} units`;

    return {
      productName,
      quantity,
      totalAmount,
      payment,
      paymentMethod: receipt.paymentMethod || paymentMethod,
      paymentRef: receipt.paymentRef || undefined,
      unitPrice,
      items,
      vfdReceiptNumber,
      date,
      whatsappText:
        `Receipt from ${pharmacy?.name ?? 'PharmaConnect'}\n` +
        `${itemText}\n` +
        `Amount: TZS ${totalAmount.toLocaleString()}\n` +
        `Payment: ${payment}\n` +
        `VFD No: ${vfdReceiptNumber ?? 'Pending'}\n` +
        `Date: ${date}`,
    };
  }, [paymentMethod, pharmacy?.name, receipt]);

  const normalisePhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('255')) return digits;
    if (digits.startsWith('0')) return `255${digits.slice(1)}`;
    return `255${digits}`;
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#0D4035]">Dispensing</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Build a medicine cart, verify prices, then checkout with payment details.
        </p>
      </div>

      {receipt && receiptSummary && (
        <div className="p-5 bg-[#D6F0E8] rounded-2xl border border-[#1A6B5C]/20 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-[#1A6B5C]" />
            <p className="text-sm font-semibold text-[#1A6B5C]">Dispensing Complete</p>
          </div>

          <div className="bg-white rounded-xl p-4 space-y-2">
            <div className="space-y-2">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-[#64748B]">Medicines</span>
                <span className="font-medium text-[#0D4035] text-right">
                  {receiptSummary.items.length} item{receiptSummary.items.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="space-y-1.5">
                {receiptSummary.items.map((item, index) => (
                  <div key={`${item.productName}-${index}`} className="rounded-lg bg-[#F8FAFC] px-3 py-2 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium text-[#0D4035]">{item.productName}</span>
                      <span className="font-semibold text-[#1A6B5C] shrink-0">
                        TZS {item.totalAmount.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[#64748B] mt-0.5">
                      {item.quantity} units x TZS {item.unitPrice.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#64748B]">Quantity</span>
              <span className="font-medium text-[#0D4035]">{receiptSummary.quantity} units</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#64748B]">Amount</span>
              <span className="font-bold text-[#0D4035]">TZS {receiptSummary.totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#64748B]">Payment</span>
              <span className="font-medium text-[#0D4035]">{receiptSummary.payment}</span>
            </div>
            <div className="pt-1 border-t border-[#D6F0E8] flex justify-between gap-4 text-xs">
              <span className="text-[#64748B]">VFD No.</span>
              <span className={receiptSummary.vfdReceiptNumber ? 'text-[#1A6B5C] font-mono' : 'text-[#D97706]'}>
                {receiptSummary.vfdReceiptNumber ?? 'Queued - will sync'}
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#0D4035] block mb-1.5">
              Customer WhatsApp Number
            </label>
            <div className="flex items-center gap-1.5 bg-white border border-[#D6F0E8] rounded-xl px-3 h-10 focus-within:border-[#1A6B5C]">
              <span className="text-sm text-[#64748B] shrink-0">+255</span>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="712 345 678"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, '').slice(0, 12))}
                className="flex-1 text-sm text-[#0D4035] bg-transparent outline-none"
              />
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              Enter number to send the receipt directly.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                downloadReceiptPdf({
                  pharmacyName: pharmacy?.name ?? 'PharmaConnect',
                  pharmacyAddress: pharmacy?.address,
                  productName: receiptSummary.productName,
                  quantity: receiptSummary.quantity,
                  unitPrice: receiptSummary.unitPrice,
                  totalAmount: receiptSummary.totalAmount,
                  paymentMethod: receiptSummary.paymentMethod,
                  paymentRef: receiptSummary.paymentRef,
                  vfdReceiptNumber: receiptSummary.vfdReceiptNumber,
                  items: receiptSummary.items,
                  dispensedAt: receiptSummary.date,
                  dispensedBy: user ? `${user.firstName} ${user.lastName}` : 'PharmaConnect user',
                });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A6B5C] text-white rounded-xl text-xs font-semibold hover:bg-[#145748] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download PDF
            </button>

            <a
              href={
                recipientPhone.replace(/\D/g, '').length >= 9
                  ? `https://wa.me/${normalisePhone(recipientPhone)}?text=${encodeURIComponent(receiptSummary.whatsappText)}`
                  : '#'
              }
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                if (recipientPhone.replace(/\D/g, '').length < 9) {
                  event.preventDefault();
                  toast.error('Enter a valid phone number first');
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                recipientPhone.replace(/\D/g, '').length >= 9
                  ? 'bg-[#25D366] text-white hover:bg-[#1ebe5d]'
                  : 'bg-[#D6F0E8] text-[#64748B] cursor-not-allowed'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M11.998 0C5.373 0 0 5.373 0 12c0 2.122.558 4.112 1.532 5.836L.05 23.95l6.281-1.648A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.625 0 11.998 0zm.002 21.818a9.805 9.805 0 01-5.003-1.368l-.358-.214-3.724.977.994-3.634-.234-.373A9.796 9.796 0 012.18 12c0-5.42 4.402-9.818 9.82-9.818 5.418 0 9.82 4.398 9.82 9.818 0 5.42-4.402 9.818-9.82 9.818z" />
              </svg>
              {recipientPhone.replace(/\D/g, '').length >= 9 ? 'Send on WhatsApp' : 'Enter number first'}
            </a>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setReceipt(null);
                setRecipientPhone('');
              }}
            >
              New Dispensing
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-5 items-start">
        <div className="space-y-5">
          <Card
            header={
              <button
                type="button"
                className="flex items-center justify-between w-full text-left"
                onClick={() => setPatientPanelOpen((open) => !open)}
              >
                <span className="text-sm font-semibold text-[#0D4035] flex items-center gap-2">
                  <User size={16} /> Patient
                  {patient && <Badge variant="success" size="sm">Linked</Badge>}
                  {!patient && <Badge variant="muted" size="sm">Walk-in</Badge>}
                </span>
                <span className="text-xs text-[#64748B]">
                  {patientPanelOpen ? 'Collapse' : 'Link patient'}
                </span>
              </button>
            }
          >
            {patientPanelOpen && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                  <Input
                    label="Patient UUID (optional)"
                    value={patientId}
                    onChange={(e) => {
                      setPatientId(e.target.value);
                      setPatient(null);
                    }}
                    placeholder="Paste patient ID for safety history..."
                    leftIcon={<User size={16} />}
                  />
                  <Button
                    className="md:self-end"
                    variant="secondary"
                    loading={loadPatientMutation.isPending}
                    disabled={patientId.trim().length < 2}
                    onClick={() => loadPatientMutation.mutate()}
                  >
                    Load patient
                  </Button>
                </div>

                {patient && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-[#EDF7F3] rounded-xl">
                      <p className="text-xs text-[#64748B]">Chronic conditions</p>
                      <p className="text-sm font-medium text-[#0D4035] mt-1">
                        {patient.chronicConditions?.length ? patient.chronicConditions.join(', ') : 'None recorded'}
                      </p>
                    </div>
                    <div className="p-3 bg-[#EDF7F3] rounded-xl">
                      <p className="text-xs text-[#64748B]">Active medicines</p>
                      <p className="text-sm font-medium text-[#0D4035] mt-1">
                        {patient.activeMedications?.length ? patient.activeMedications.join(', ') : 'None recorded'}
                      </p>
                    </div>
                    <div className="p-3 bg-[#EDF7F3] rounded-xl">
                      <p className="text-xs text-[#64748B]">Allergy flags</p>
                      <p className="text-sm font-medium text-[#0D4035] mt-1">
                        {Object.entries(patient.allergyFlags || {}).filter(([, enabled]) => enabled).map(([key]) => key).join(', ') || 'None recorded'}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>

          <Card
            header={
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#0D4035]">Medicine entry</span>
                {selectedDrug && (
                  <Badge variant={Number(selectedDrug.sellingPrice ?? 0) > 0 ? 'success' : 'warning'} size="sm">
                    {Number(selectedDrug.sellingPrice ?? 0) > 0 ? money(Number(selectedDrug.sellingPrice)) : 'No price set'}
                  </Badge>
                )}
              </div>
            }
          >
            <div className="space-y-5">
              <div className="relative">
                <Input
                  label="Medicine"
                  value={selectedDrug ? getProductLabel(selectedDrug) : drugSearch}
                  onChange={(e) => {
                    setDrugSearch(e.target.value);
                    setSelectedDrug(null);
                    setShowDrugDropdown(true);
                  }}
                  onFocus={() => setShowDrugDropdown(true)}
                  placeholder="Search product name, generic name, or barcode..."
                  leftIcon={<Search size={16} />}
                  rightIcon={<ScanLine size={16} className="text-[#1A6B5C]" />}
                />
                {showDrugDropdown && products.length > 0 && !selectedDrug && (
                  <div className="absolute z-30 top-full mt-1 w-full bg-white border border-[#D6F0E8] rounded-xl shadow-lg overflow-hidden">
                    {products.map((product) => {
                      const price = Number(product.sellingPrice ?? 0);
                      return (
                        <button
                          key={product.id}
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-[#EDF7F3] border-b border-[#D6F0E8] last:border-0"
                          onClick={() => {
                            setSelectedDrug(product);
                            setDrugSearch('');
                            setShowDrugDropdown(false);
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#0D4035] truncate">
                                {getProductLabel(product)}
                              </p>
                              <p className="text-xs text-[#64748B]">
                                {[product.strength, product.dosageForm, `Stock: ${product.currentStock ?? 0}`]
                                  .filter(Boolean)
                                  .join(' - ')}
                              </p>
                            </div>
                            <span className="text-xs font-semibold text-[#1A6B5C] shrink-0">
                              {price > 0 ? money(price) : 'No price'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedDrug && (
                <div className="p-3 bg-[#EDF7F3] rounded-xl flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0D4035] truncate">{getProductLabel(selectedDrug)}</p>
                    <p className="text-xs text-[#64748B]">
                      {[selectedDrug.strength, selectedDrug.dosageForm, selectedDrug.tmdaRegistrationNumber]
                        .filter(Boolean)
                        .join(' - ')}
                    </p>
                    <p className="text-xs text-[#1A6B5C] mt-1">
                      {money(Number(selectedDrug.sellingPrice ?? 0))} per unit - {selectedDrug.currentStock ?? 0}{' '}
                      {selectedDrug.unitOfMeasure || 'units'} available
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetLineForm}
                    className="text-xs text-[#DC2626] hover:underline shrink-0"
                  >
                    Change
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#0D4035] block mb-1">Quantity</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                      className="w-10 h-10 rounded-xl border border-[#D6F0E8] flex items-center justify-center text-[#0D4035] hover:bg-[#EDF7F3] font-bold text-lg"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                      className="w-20 h-10 text-center text-lg font-bold border border-[#D6F0E8] rounded-xl focus:outline-none focus:border-[#1A6B5C]"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((current) => current + 1)}
                      className="w-10 h-10 rounded-xl border border-[#D6F0E8] flex items-center justify-center text-[#0D4035] hover:bg-[#EDF7F3] font-bold text-lg"
                    >
                      +
                    </button>
                    {selectedDrug?.currentStock !== undefined && (
                      <span className="text-xs text-[#64748B]">
                        Stock: {selectedDrug.currentStock}
                      </span>
                    )}
                  </div>
                </div>
                <Input
                  label="Dose / directions"
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                  placeholder="e.g. 1 tablet twice daily"
                />
              </div>

              <div className="relative">
                <Input
                  label="ICD-10 code (optional)"
                  value={selectedIcd ? `${selectedIcd.code} - ${selectedIcd.description}` : icdSearch}
                  onChange={(e) => {
                    setIcdSearch(e.target.value);
                    setSelectedIcd(null);
                    setShowIcdDropdown(true);
                  }}
                  onFocus={() => setShowIcdDropdown(true)}
                  placeholder="Search diagnosis code..."
                />
                {showIcdDropdown && icdCodes.length > 0 && !selectedIcd && (
                  <div className="absolute z-20 top-full mt-1 w-full bg-white border border-[#D6F0E8] rounded-xl shadow-lg overflow-hidden">
                    {icdCodes.map((code) => (
                      <button
                        key={code.id}
                        type="button"
                        className="w-full text-left px-4 py-2.5 hover:bg-[#EDF7F3] border-b border-[#D6F0E8] last:border-0"
                        onClick={() => {
                          setSelectedIcd(code);
                          setIcdSearch('');
                          setShowIcdDropdown(false);
                        }}
                      >
                        <p className="text-sm font-medium text-[#0D4035]">{code.code}</p>
                        <p className="text-xs text-[#64748B]">{code.description}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0D4035] mb-1">Counselling notes</label>
                <textarea
                  value={counsellingNotes}
                  onChange={(e) => setCounsellingNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#D6F0E8] text-sm text-[#0D4035] resize-none focus:outline-none focus:ring-2 focus:ring-[#1A6B5C]/20 focus:border-[#1A6B5C]"
                  placeholder="Warnings, adherence guidance, or patient advice..."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="flex-1"
                  leftIcon={<Plus size={16} />}
                  onClick={addToCart}
                  disabled={!selectedDrug}
                >
                  Add to cart
                </Button>
                <Button variant="ghost" onClick={resetLineForm}>Clear line</Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:sticky lg:top-4">
          <Card
            padding={false}
            header={
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#0D4035] flex items-center gap-2">
                  <ShoppingCart size={16} /> Cart and payment
                </span>
                <Badge variant={cartItems.length ? 'success' : 'muted'} size="sm">
                  {cartItems.length} item{cartItems.length === 1 ? '' : 's'}
                </Badge>
              </div>
            }
          >
            {cartItems.length === 0 ? (
              <div className="p-8 text-center">
                <ShoppingCart size={28} className="mx-auto text-[#94A3B8]" />
                <p className="text-sm font-medium text-[#0D4035] mt-3">No medicines in cart</p>
                <p className="text-xs text-[#64748B] mt-1">Add medicines before checkout.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#D6F0E8]">
                {cartItems.map((item) => (
                  <div key={item.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0D4035] truncate">{getProductLabel(item.product)}</p>
                        <p className="text-xs text-[#64748B]">
                          {item.quantity} x {money(item.unitPrice)}
                          {item.dose ? ` - ${item.dose}` : ''}
                        </p>
                        {item.icdCode && (
                          <p className="text-xs text-[#1A6B5C] mt-0.5">
                            {item.icdCode}{item.icdDescription ? ` - ${item.icdDescription}` : ''}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-[#0D4035]">{money(item.lineTotal)}</p>
                        <button
                          type="button"
                          onClick={() => setCartItems((items) => items.filter((cartItem) => cartItem.id !== item.id))}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-[#DC2626] hover:underline"
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="p-5 bg-[#EDF7F3] rounded-b-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#64748B]">Total due</span>
                <span className="text-2xl font-bold text-[#0D4035]">{money(cartTotal)}</span>
              </div>

              {cartItems.some((item) => item.unitPrice <= 0) && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertTriangle size={16} className="text-[#D97706] mt-0.5" />
                  <p className="text-xs text-[#92400E]">
                    One or more medicines have no selling price, so the total may be incomplete.
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-[#0D4035] block mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(option.value);
                        setPaymentRef('');
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                        paymentMethod === option.value
                          ? 'bg-[#1A6B5C] text-white border-[#1A6B5C]'
                          : `bg-white ${option.color} border-[#D6F0E8] hover:border-[#1A6B5C]`
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {paymentMethod !== 'CASH' && paymentMethod !== 'INSURANCE' && (
                  <div className="mt-2">
                    <Input
                      placeholder="Transaction reference (optional)"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <Button
                className="w-full"
                leftIcon={<CheckCircle size={16} />}
                loading={checkoutMutation.isPending}
                disabled={cartItems.length === 0}
                onClick={() => checkoutMutation.mutate()}
              >
                Checkout and dispense
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {patient && (
        <div className="flex items-start gap-2 text-xs text-[#64748B]">
          <AlertOctagon size={14} className="text-[#D97706] mt-0.5" />
          <p>
            Patient interaction checks for inventory products are still limited until Product records are fully mapped to the clinical drug database.
          </p>
        </div>
      )}
    </div>
  );
};
