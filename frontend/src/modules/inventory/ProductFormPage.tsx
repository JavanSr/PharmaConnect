import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Search, ScanLine, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { useNotificationStore } from '@/stores/notificationStore';
import { api } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';

const DOSAGE_FORMS = [
  'TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'OINTMENT', 'DROPS', 'INHALER', 'SUPPOSITORY', 'POWDER', 'SOLUTION', 'OTHER',
];

const DRUG_CLASSES = [
  'OTC', 'PRESCRIPTION', 'CONTROLLED', 'NARCOTIC',
];

const UNITS_OF_MEASURE = ['Tablets', 'Capsules', 'ml', 'mg', 'g', 'Units', 'Vials', 'Ampoules', 'Sachets', 'Patches', 'Other'];

const STORAGE_CONDITIONS = [
  { value: 'AMBIENT',      label: 'Ambient (Room Temperature 15–25°C)' },
  { value: 'REFRIGERATED', label: 'Refrigerated (2–8°C)' },
  { value: 'FROZEN',       label: 'Frozen (≤−15°C)' },
];

interface FormState {
  name: string;
  genericName: string;
  brandName: string;
  manufacturer: string;
  therapeuticCategory: string;
  drugClass: string;
  description: string;
  sku: string;
  barcode: string;
  dosageForm: string;
  strength: string;
  unitOfMeasure: string;
  packSize: string;
  storageCondition: string;
  isColdChain: boolean;
  tmdaRegistrationNumber: string;
  sellingPrice: string;
  purchasePriceDefault: string;
  reorderLevel: string;
  minStock: string;
}

interface DrugMaster {
  id: string;
  productName: string;
  tmdaRegistrationNumber: string;
  genericName: string;
  brandName?: string | null;
  manufacturer?: string | null;
  therapeuticCategory?: string | null;
  drugClass?: string | null;
  dosageForm?: string | null;
  strength?: string | null;
  unitOfMeasure?: string | null;
  packSize?: number | null;
  storageCondition?: string | null;
  isColdChain?: boolean | null;
  isEssentialMedicine?: boolean | null;
}

const DOSAGE_FORM_MAP: Record<string, string> = {
  TABLET: 'TABLET',
  TABLETS: 'TABLET',
  CAPSULE: 'CAPSULE',
  CAPSULES: 'CAPSULE',
  SYRUP: 'SYRUP',
  INJECTION: 'INJECTION',
  INJECTIONS: 'INJECTION',
  CREAM: 'CREAM',
  OINTMENT: 'OINTMENT',
  DROPS: 'DROPS',
  DROP: 'DROPS',
  INHALER: 'INHALER',
  INHALERS: 'INHALER',
  SUPPOSITORY: 'SUPPOSITORY',
  SUPPOSITORIES: 'SUPPOSITORY',
  POWDER: 'POWDER',
  SOLUTION: 'SOLUTION',
};

const empty: FormState = {
  name: '', genericName: '', brandName: '', manufacturer: '', therapeuticCategory: '', drugClass: '', description: '',
  sku: '', barcode: '', dosageForm: 'TABLET', strength: '',
  unitOfMeasure: 'unit', packSize: '1',
  storageCondition: 'AMBIENT', isColdChain: false,
  tmdaRegistrationNumber: '', sellingPrice: '',
  purchasePriceDefault: '', reorderLevel: '10', minStock: '5',
};

const optionValuesWithCurrent = (options: string[], current: string) =>
  current && !options.includes(current) ? [current, ...options] : options;

const normalizeDosageForm = (value?: string | null) => {
  if (!value) {
    return 'TABLET';
  }

  return DOSAGE_FORM_MAP[value.trim().toUpperCase()] || 'OTHER';
};

export const ProductFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useNotificationStore(s => s.toast);
  const [form, setForm] = useState<FormState>(empty);
  const [drugSearch, setDrugSearch] = useState('');
  const [selectedDrug, setSelectedDrug] = useState<DrugMaster | null>(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const debouncedSearch = useDebounce(drugSearch, 300);

  const { data: drugResults } = useQuery({
    queryKey: ['drug-master-search', debouncedSearch],
    queryFn: () =>
      api.get('/inventory/drug-master', { params: { q: debouncedSearch } }).then(r => r.data),
    enabled: debouncedSearch.trim().length >= 2 && !selectedDrug,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get(`/inventory/products/${id}`).then(r => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (data?.data) {
      const p = data.data;
      if (p.drugMasterId) {
        setSelectedDrug({
          id: p.drugMasterId,
          productName: p.name || p.genericName || '',
          genericName: p.genericName || p.name || '',
          brandName: p.brandName || '',
          manufacturer: p.manufacturer || '',
          therapeuticCategory: p.therapeuticCategory || '',
          drugClass: p.drugClass || '',
          dosageForm: normalizeDosageForm(p.dosageForm),
          strength: p.strength || '',
          unitOfMeasure: p.unitOfMeasure || 'unit',
          packSize: p.packSize ?? 1,
          storageCondition: p.storageCondition || 'AMBIENT',
          isColdChain: p.coldChainRequired || p.isColdChain || false,
          tmdaRegistrationNumber: p.tmdaRegistrationNumber || '',
          isEssentialMedicine: false,
        });
      } else {
        setSelectedDrug(null);
      }
      setForm({
        name: p.name || '',
        genericName: p.genericName || '',
        brandName: p.brandName || '',
        manufacturer: p.manufacturer || '',
        therapeuticCategory: p.therapeuticCategory || '',
        drugClass: p.drugClass || '',
        description: p.description || '',
        sku: p.sku || '',
        barcode: p.barcode || '',
        dosageForm: normalizeDosageForm(p.dosageForm),
        strength: p.strength || '',
        unitOfMeasure: p.unitOfMeasure || 'unit',
        packSize: String(p.packSize ?? 1),
        storageCondition: p.storageCondition || 'AMBIENT',
        isColdChain: p.coldChainRequired || p.isColdChain || false,
        tmdaRegistrationNumber: p.tmdaRegistrationNumber || '',
        sellingPrice: p.sellingPrice != null ? String(p.sellingPrice) : '',
        purchasePriceDefault: p.purchasePriceDefault != null ? String(p.purchasePriceDefault) : '',
        reorderLevel: String(p.reorderLevel ?? 10),
        minStock: String(p.minStock ?? 5),
      });
    }
  }, [data]);

  const drugs: DrugMaster[] = drugResults?.data ?? [];
  const clinicalFieldsLocked = Boolean(selectedDrug);
  const showManualFallbackNotice = debouncedSearch.trim().length >= 2 && !selectedDrug && drugs.length === 0;
  const verificationStatus = data?.data?.verificationStatus as string | undefined;
  const loadedDrugMasterId = data?.data?.drugMasterId as string | undefined;
  const canClearSelectedDrug = !loadedDrugMasterId || selectedDrug?.id !== loadedDrugMasterId;

  const selectDrug = (drug: DrugMaster) => {
    setSelectedDrug(drug);
    setDrugSearch('');
    setForm(f => ({
      ...f,
      name: drug.productName || (drug.brandName ? `${drug.genericName} (${drug.brandName})` : drug.genericName),
      genericName: drug.genericName,
      brandName: drug.brandName || '',
      manufacturer: drug.manufacturer || '',
      therapeuticCategory: drug.therapeuticCategory || '',
      drugClass: drug.drugClass || '',
      dosageForm: normalizeDosageForm(drug.dosageForm),
      strength: drug.strength || '',
      unitOfMeasure: drug.unitOfMeasure || 'unit',
      packSize: String(drug.packSize ?? 1),
      storageCondition: drug.storageCondition || 'AMBIENT',
      isColdChain: Boolean(drug.isColdChain),
      tmdaRegistrationNumber: drug.tmdaRegistrationNumber || '',
    }));
  };

  const handleBarcodeDetected = useCallback((barcode: string) => {
    const value = barcode.trim();
    if (!value) return;

    setSelectedDrug(null);
    setDrugSearch(value);
    setForm(f => ({ ...f, barcode: value }));
    setShowBarcodeScanner(false);
    toast.success('Barcode captured');
  }, [toast]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        genericName: form.genericName || undefined,
        brandName: form.brandName || undefined,
        drugClass: form.drugClass || undefined,
        description: form.description || undefined,
        sku: form.sku || undefined,
        barcode: form.barcode || undefined,
        manufacturer: form.manufacturer || undefined,
        therapeuticCategory: form.therapeuticCategory || undefined,
        dosageForm: form.dosageForm || undefined,
        strength: form.strength || undefined,
        unitOfMeasure: form.unitOfMeasure,
        packSize: parseInt(form.packSize, 10) || 1,
        storageCondition: form.storageCondition,
        coldChainRequired: form.isColdChain,
        tmdaRegistrationNumber: form.tmdaRegistrationNumber || undefined,
        drugMasterId: selectedDrug?.id ?? undefined,
        sellingPrice: form.sellingPrice ? parseFloat(form.sellingPrice) : undefined,
        purchasePriceDefault: form.purchasePriceDefault ? parseFloat(form.purchasePriceDefault) : undefined,
        reorderLevel: parseInt(form.reorderLevel, 10) || 10,
        minStock: parseInt(form.minStock, 10) || 5,
      };
      return isEdit
        ? api.put(`/inventory/products/${id}`, payload)
        : api.post('/inventory/products', payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Product updated' : 'Product created');
      qc.invalidateQueries({ queryKey: ['products'] });
      navigate('/inventory/products');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to save product'),
  });

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  if (isEdit && isLoading) return <div className="p-8 text-center text-[#64748B]">Loading...</div>;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link to="/inventory/products" className="p-2 rounded-xl hover:bg-[#D6F0E8] text-[#64748B] transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-[#0D4035] flex-1">{isEdit ? 'Edit Product' : 'Add Product'}</h1>
      </div>

      <Card>
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-4">
          Search Master Catalogue
        </p>
        <div className="relative">
          <Input
            label="Search by generic name, brand name, TMDA number, or MSD code"
            value={drugSearch}
            onChange={e => {
              setSelectedDrug(null);
              setDrugSearch(e.target.value);
            }}
            placeholder="e.g. Amoxicillin, Paracetamol, TZ-TMDA-0001, 10030001..."
            leftIcon={<Search size={16} />}
            rightIcon={
              <button
                type="button"
                aria-label={showBarcodeScanner ? 'Close barcode scanner' : 'Open barcode scanner'}
                title={showBarcodeScanner ? 'Close barcode scanner' : 'Open barcode scanner'}
                onClick={() => setShowBarcodeScanner(open => !open)}
                className="rounded-lg p-1 text-[#64748B] transition-colors hover:bg-[#EDF7F3] hover:text-[#1A6B5C]"
              >
                {showBarcodeScanner ? <X size={16} /> : <ScanLine size={16} />}
              </button>
            }
          />
          {drugs.length > 0 && !selectedDrug && (
            <div className="absolute z-10 top-full mt-1 w-full bg-white border border-[#D6F0E8] rounded-xl shadow-lg overflow-hidden">
              {drugs.map((drug) => (
                <button
                  key={drug.id}
                  type="button"
                  onClick={() => selectDrug(drug)}
                  className="w-full text-left px-4 py-3 hover:bg-[#EDF7F3] border-b border-[#D6F0E8] last:border-0"
                >
                  <p className="text-sm font-medium text-[#0D4035]">
                    {drug.genericName}
                    {drug.strength && <span className="text-[#64748B]"> &middot; {drug.strength}</span>}
                    {drug.dosageForm && <span className="text-[#64748B]"> &middot; {drug.dosageForm}</span>}
                  </p>
                  {drug.tmdaRegistrationNumber && (
                    <p className="text-xs text-[#1A6B5C] mt-0.5">{drug.tmdaRegistrationNumber}</p>
                  )}
                  {drug.isEssentialMedicine && (
                    <span className="inline-flex mt-2 text-xs bg-[#D6F0E8] text-[#1A6B5C] px-2 py-0.5 rounded-full font-medium">NEML</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        {showBarcodeScanner && (
          <div className="mt-3">
            <BarcodeScanner
              label="Scan barcode for this product"
              placeholder="Scan or type product barcode"
              onDetected={handleBarcodeDetected}
            />
          </div>
        )}
        {showManualFallbackNotice && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-medium text-[#92400E]">No master-catalog match found yet.</p>
            <p className="text-xs text-[#B45309] mt-1">
              You can continue with manual entry. The product will be marked unverified and queued for later review.
            </p>
          </div>
        )}
        {selectedDrug && (
          <div className="mt-3 flex items-center justify-between gap-3 bg-[#D6F0E8] rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[#0D4035]">
                {selectedDrug.genericName}
                {selectedDrug.brandName && <span className="text-[#64748B]"> &middot; {selectedDrug.brandName}</span>}
                {selectedDrug.strength && <span> &middot; {selectedDrug.strength}</span>}
                {selectedDrug.dosageForm && <span> &middot; {selectedDrug.dosageForm}</span>}
              </p>
              {selectedDrug.manufacturer && (
                <p className="text-xs text-[#64748B]">Mfr: {selectedDrug.manufacturer}</p>
              )}
              <p className="text-xs text-[#1A6B5C]">{selectedDrug.tmdaRegistrationNumber}</p>
            </div>
            {canClearSelectedDrug && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDrug(null);
                  setDrugSearch('');
                }}
                className="text-xs text-[#64748B] hover:text-[#DC2626]"
              >
                Clear
              </button>
            )}
          </div>
        )}
        {!selectedDrug && verificationStatus === 'UNVERIFIED' && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-medium text-[#92400E]">This product is currently unverified.</p>
            <p className="text-xs text-[#B45309] mt-1">
              It was saved without a linked master-catalog record and remains in the review queue until matched later.
            </p>
          </div>
        )}
      </Card>

      {/* Basic Information */}
      <Card>
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-4">Basic Information</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Generic Name *" value={form.genericName} onChange={set('genericName')} placeholder="e.g. Amoxicillin" required disabled={clinicalFieldsLocked} readOnly={clinicalFieldsLocked} />
          <Input label="Brand / Trade Name" value={form.brandName} onChange={set('brandName')} placeholder="e.g. Amoxil" disabled={clinicalFieldsLocked} readOnly={clinicalFieldsLocked} />
          <Input label="Product Name *" value={form.name} onChange={set('name')} placeholder="Display name shown in dispensing" required disabled={clinicalFieldsLocked} readOnly={clinicalFieldsLocked} />
          <Input label="Manufacturer" value={form.manufacturer} onChange={set('manufacturer')} placeholder="e.g. Shelys, Cipla" disabled={clinicalFieldsLocked} readOnly={clinicalFieldsLocked} />
          <Input label="Therapeutic Category" value={form.therapeuticCategory} onChange={set('therapeuticCategory')} placeholder="e.g. Antibiotic, Anti-diabetic" disabled={clinicalFieldsLocked} readOnly={clinicalFieldsLocked} />
          <Select
            label="Drug Class"
            value={form.drugClass}
            onChange={set('drugClass')}
            disabled={clinicalFieldsLocked}
            options={[{ value: '', label: 'Select drug class...' }, ...optionValuesWithCurrent(DRUG_CLASSES, form.drugClass).map(c => ({ value: c, label: c }))]}
          />
          <Input label="SKU / Item Code" value={form.sku} onChange={set('sku')} placeholder="Internal stock code" />
          <Input label="Barcode (EAN/UPC)" value={form.barcode} onChange={set('barcode')} placeholder="Scan or enter barcode" />
          <Input label="TMDA Registration No." value={form.tmdaRegistrationNumber} onChange={set('tmdaRegistrationNumber')} placeholder="TZ-TMDA-XXX" disabled={clinicalFieldsLocked} readOnly={clinicalFieldsLocked} />
          {selectedDrug && (
            <p className="text-xs text-[#64748B] sm:col-span-2">
              Catalog-linked fields are pre-filled from the master catalog. Only pricing, thresholds, and local stock details can be edited.
            </p>
          )}
        </div>
        <div className="mt-4">
          <label className="text-sm font-medium text-[#0D4035] block mb-1">Description / Indications</label>
          <textarea
            rows={2}
            value={form.description}
            onChange={set('description')}
            placeholder="Brief description of indications and clinical use..."
            readOnly={clinicalFieldsLocked}
            disabled={clinicalFieldsLocked}
            className="w-full px-3 py-2 text-sm border border-[#D6F0E8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A6B5C]/20 focus:border-[#1A6B5C] resize-none disabled:bg-gray-50 disabled:text-[#64748B] disabled:cursor-not-allowed"
          />
        </div>
      </Card>

      {/* Dosage & Packaging */}
      <Card>
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-4">Dosage &amp; Packaging</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Dosage Form"
            value={form.dosageForm}
            onChange={set('dosageForm')}
            disabled={clinicalFieldsLocked}
            options={optionValuesWithCurrent(DOSAGE_FORMS, form.dosageForm).map(f => ({ value: f, label: f }))}
          />
          <Input label="Strength" value={form.strength} onChange={set('strength')} placeholder="e.g. 500mg, 250mg/5ml, 10IU" disabled={clinicalFieldsLocked} readOnly={clinicalFieldsLocked} />
          <Select
            label="Unit of Measure"
            value={form.unitOfMeasure}
            onChange={set('unitOfMeasure')}
            disabled={clinicalFieldsLocked}
            options={optionValuesWithCurrent(UNITS_OF_MEASURE, form.unitOfMeasure).map(u => ({ value: u, label: u }))}
          />
          <Input label="Pack Size (units per pack)" type="number" value={form.packSize} onChange={set('packSize')} min="1" placeholder="e.g. 30 for a blister of 30 tabs" disabled={clinicalFieldsLocked} readOnly={clinicalFieldsLocked} />
        </div>
      </Card>

      {/* Storage */}
      <Card>
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-4">Storage Conditions</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Storage Condition"
            value={form.storageCondition}
            onChange={set('storageCondition')}
            disabled={clinicalFieldsLocked}
            options={STORAGE_CONDITIONS}
          />
          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="coldChain"
              checked={form.isColdChain}
              onChange={e => setForm(f => ({ ...f, isColdChain: e.target.checked }))}
              disabled={clinicalFieldsLocked}
              className="w-4 h-4 rounded border-[#D6F0E8] text-[#1A6B5C] accent-[#1A6B5C]"
            />
            <label htmlFor="coldChain" className="text-sm text-[#0D4035]">Requires cold-chain management (temperature log)</label>
          </div>
        </div>
      </Card>

      {/* Pricing */}
      <Card>
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-4">Pricing</p>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Default Purchase Price (Tsh)"
            type="number"
            value={form.purchasePriceDefault}
            onChange={set('purchasePriceDefault')}
            placeholder="Cost price per unit"
            min="0"
          />
          <Input
            label="Selling Price (Tsh)"
            type="number"
            value={form.sellingPrice}
            onChange={set('sellingPrice')}
            placeholder="Retail price per unit"
            min="0"
          />
        </div>
        {form.purchasePriceDefault && form.sellingPrice && (
          <p className="text-xs text-[#1A6B5C] mt-2">
            Margin: Tsh {(parseFloat(form.sellingPrice) - parseFloat(form.purchasePriceDefault)).toLocaleString()}
            {' '}({Math.round(((parseFloat(form.sellingPrice) - parseFloat(form.purchasePriceDefault)) / parseFloat(form.purchasePriceDefault)) * 100)}%)
          </p>
        )}
      </Card>

      {/* Stock Thresholds */}
      <Card>
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-4">Stock Thresholds</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input label="Reorder Level" type="number" value={form.reorderLevel} onChange={set('reorderLevel')} min="0" />
            <p className="text-xs text-[#64748B] mt-1">Alert fires when stock reaches this level</p>
          </div>
          <div>
            <Input label="Minimum Stock" type="number" value={form.minStock} onChange={set('minStock')} min="0" />
            <p className="text-xs text-[#64748B] mt-1">Critical low-stock floor</p>
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={() => navigate('/inventory/products')}>Cancel</Button>
        <Button
          leftIcon={<Save size={16} />}
          loading={mutation.isPending}
          disabled={!form.name || !form.genericName}
          onClick={() => mutation.mutate()}
        >
          {isEdit ? 'Save Changes' : 'Create Product'}
        </Button>
      </div>
    </div>
  );
};
