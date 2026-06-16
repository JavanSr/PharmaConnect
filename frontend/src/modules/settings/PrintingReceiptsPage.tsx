import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlignLeft, FileText, ImagePlus, Printer, Save, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { api } from '@/lib/api';
import { SettingsNav } from './SettingsNav';

type ReceiptSettings = {
  headerLine1: string;   // pharmacy name — auto-filled, editable
  headerLine2: string;   // address / contact
  footerText: string;    // pharmacy's own counselling / thank-you line
  logoBase64: string;    // data URL — empty string means use APOTEKH logo
  showPcRegNo: boolean;
  showReceiptNumber: boolean;
  autoPrint: boolean;
};

const SETTING_KEY = 'receipt.settings';
const APOTEKH_LOGO = '/assets/logo/apotekh-logo.svg';
const APOTEKH_FOOTER = 'Powered by APOTEKH · apotekh.co.tz · Powering Pharmacies. Protecting Patients.';
const MAX_LOGO_BYTES = 512 * 1024; // 512 KB

const DEFAULTS: ReceiptSettings = {
  headerLine1: '',
  headerLine2: '',
  footerText: 'Thank you for your visit. Please take your medicines as directed.',
  logoBase64: '',
  showPcRegNo: true,
  showReceiptNumber: true,
  autoPrint: false,
};

export const PrintingReceiptsPage: React.FC = () => {
  const pharmacy = usePharmacyStore(s => s.pharmacy);
  const toast = useNotificationStore(s => s.toast);
  const qc = useQueryClient();
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['receipt-settings'],
    queryFn: () => api.get(`/settings/config/${SETTING_KEY}`).then(r => r.data.data?.value as ReceiptSettings | null),
  });

  const { register, handleSubmit, watch, reset, setValue, formState: { isDirty } } = useForm<ReceiptSettings>({
    defaultValues: DEFAULTS,
  });

  React.useEffect(() => {
    if (data) {
      reset({ ...DEFAULTS, ...data });
    } else if (pharmacy && !isLoading) {
      reset({
        ...DEFAULTS,
        headerLine1: pharmacy.name ?? '',
        headerLine2: pharmacy.address ?? '',
      });
    }
  }, [data, pharmacy, isLoading, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: ReceiptSettings) =>
      api.put(`/settings/config/${SETTING_KEY}`, { value: values }),
    onSuccess: () => {
      toast.success('Receipt settings saved');
      qc.invalidateQueries({ queryKey: ['receipt-settings'] });
    },
    onError: () => toast.error('Failed to save'),
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      toast.error('Logo must be under 512 KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setValue('logoBase64', reader.result as string, { shouldDirty: true });
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const watched = watch();
  const logoSrc = watched.logoBase64 || APOTEKH_LOGO;
  const usingApotekhLogo = !watched.logoBase64;

  if (isLoading) {
    return (
      <div className="space-y-5 max-w-2xl">
        <h1 className="text-xl font-bold text-[#0D4035]">Printing & Receipts</h1>
        <SettingsNav />
        <div className="h-64 animate-pulse rounded-2xl bg-[#D6F0E8]" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-bold text-[#0D4035]">Printing & Receipts</h1>
      <SettingsNav />

      <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-5">

        {/* Logo */}
        <Card header={
          <div className="flex items-center gap-2">
            <ImagePlus size={15} className="text-[#1A6B5C]" />
            <span className="text-sm font-semibold text-[#0D4035]">Pharmacy Logo</span>
          </div>
        }>
          <div className="flex items-start gap-5">
            {/* Preview */}
            <div className="flex-shrink-0 w-28 h-28 rounded-2xl border border-[#D6F0E8] bg-[#F8FCFA] flex items-center justify-center overflow-hidden">
              <img
                src={logoSrc}
                alt="Receipt logo"
                className="max-w-full max-h-full object-contain p-2"
              />
            </div>
            <div className="flex-1 space-y-3">
              {usingApotekhLogo ? (
                <div className="rounded-xl bg-[#EDF7F3] border border-[#D6F0E8] px-3 py-2 text-xs text-[#1A6B5C]">
                  No logo uploaded — APOTEKH logo will appear on receipts.
                </div>
              ) : (
                <div className="rounded-xl bg-white border border-[#D6F0E8] px-3 py-2 text-xs text-[#64748B]">
                  Your pharmacy logo is set.
                </div>
              )}
              <div className="flex gap-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<ImagePlus size={14} />}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {usingApotekhLogo ? 'Upload logo' : 'Replace logo'}
                </Button>
                {!usingApotekhLogo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    leftIcon={<Trash2 size={14} />}
                    onClick={() => setValue('logoBase64', '', { shouldDirty: true })}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-[#64748B]">PNG, JPG, or SVG · max 512 KB. Recommended: square or landscape, at least 200 × 200 px.</p>
            </div>
          </div>
        </Card>

        {/* Header */}
        <Card header={
          <div className="flex items-center gap-2">
            <Printer size={15} className="text-[#1A6B5C]" />
            <span className="text-sm font-semibold text-[#0D4035]">Receipt Header</span>
          </div>
        }>
          <div className="space-y-4">
            <Input
              label="Header line 1 (pharmacy name)"
              placeholder="Your pharmacy name"
              {...register('headerLine1')}
            />
            <Input
              label="Header line 2 (address / contact)"
              placeholder="Address, phone, or region"
              {...register('headerLine2')}
            />
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('showPcRegNo')}
                  className="w-4 h-4 rounded border-[#D6F0E8] accent-[#1A6B5C]"
                />
                <span className="text-sm text-[#374151]">Show PC Registration Number on receipt</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('showReceiptNumber')}
                  className="w-4 h-4 rounded border-[#D6F0E8] accent-[#1A6B5C]"
                />
                <span className="text-sm text-[#374151]">Show receipt number</span>
              </label>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <Card header={
          <div className="flex items-center gap-2">
            <AlignLeft size={15} className="text-[#1A6B5C]" />
            <span className="text-sm font-semibold text-[#0D4035]">Receipt Footer</span>
          </div>
        }>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Your message</label>
              <textarea
                {...register('footerText')}
                rows={2}
                placeholder="e.g. Thank you for your visit. Please take your medicines as directed."
                className="w-full rounded-xl border border-[#D6F0E8] bg-white px-3 py-2.5 text-sm text-[#0D4035] resize-none focus:outline-none focus:ring-2 focus:ring-[#1A6B5C]"
              />
              <p className="mt-1 text-xs text-[#64748B]">Counselling reminder or contact details — appears before the APOTEKH line.</p>
            </div>
            <div className="rounded-xl bg-[#F8FCFA] border border-[#D6F0E8] px-3 py-2.5 flex items-center justify-between">
              <p className="text-xs text-[#64748B] italic">{APOTEKH_FOOTER}</p>
              <span className="ml-3 flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#1A6B5C] bg-[#EDF7F3] rounded-full px-2 py-0.5">Always shown</span>
            </div>
          </div>
        </Card>

        {/* Printing behaviour */}
        <Card header={
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-[#1A6B5C]" />
            <span className="text-sm font-semibold text-[#0D4035]">Printing Behaviour</span>
          </div>
        }>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register('autoPrint')}
              className="w-4 h-4 rounded border-[#D6F0E8] accent-[#1A6B5C]"
            />
            <div>
              <p className="text-sm font-medium text-[#0D4035]">Auto-print receipt after dispensing</p>
              <p className="text-xs text-[#64748B]">Opens the print dialog automatically when a sale is completed.</p>
            </div>
          </label>
        </Card>

        {/* Live preview — colours match the PDF exactly */}
        <Card header={<span className="text-sm font-semibold text-[#0D4035]">Preview</span>}>
          <div className="bg-white rounded-xl border border-[#D6F0E8] p-4 space-y-2 font-mono text-xs">
            {/* Logo */}
            <div className="flex justify-center pb-2">
              <img src={logoSrc} alt="Logo" className="h-12 object-contain" />
            </div>
            {/* Pharmacy header — white-on-teal in PDF; shown as teal-on-white here */}
            <p className="font-bold text-center text-sm text-[#1A6B5C]">{watched.headerLine1 || pharmacy?.name || 'Pharmacy Name'}</p>
            {watched.headerLine2 && <p className="text-center text-[#64748B]">{watched.headerLine2}</p>}
            {watched.showPcRegNo && (
              <p className="text-center text-[#64748B]">PC Reg No: {pharmacy?.licenceNumber ?? 'PC/2025/XXXXX'}</p>
            )}
            <p className="text-center text-[#64748B]">─────────────────────</p>
            {/* Section title */}
            <p className="font-bold text-center text-[#1A6B5C]">DISPENSING RECEIPT</p>
            {/* Supporting detail — slate */}
            {watched.showReceiptNumber && <p className="text-[#64748B]">Ref: REC-20250001</p>}
            <p className="text-[#64748B]">Date: {new Date().toLocaleDateString('en-TZ')}</p>
            <p className="text-center text-[#64748B]">─────────────────────</p>
            {/* Operational detail — pc-600 */}
            <p className="text-[#1A6B5C]">Dispensed by: Sample Staff</p>
            <p className="text-[#1A6B5C]">Payment: Cash</p>
            <p className="text-center text-[#64748B]">─────────────────────</p>
            {/* Items — medicine name pc-600 bold, qty slate */}
            <div>
              <div className="flex justify-between text-[#1A6B5C] font-bold">
                <span>Amoxicillin  500mg</span><span>Tsh 3,500</span>
              </div>
              <p className="text-[#64748B] text-[10px]">Qty: 1  ×  Tsh 3,500</p>
            </div>
            <div className="mt-1">
              <div className="flex justify-between text-[#1A6B5C] font-bold">
                <span>Paracetamol  500mg</span><span>Tsh 2,000</span>
              </div>
              <p className="text-[#64748B] text-[10px]">Qty: 2  ×  Tsh 1,000</p>
            </div>
            <p className="text-center text-[#64748B]">─────────────────────</p>
            {/* Total — pc-600 bold */}
            <p className="font-bold text-[#1A6B5C]">TOTAL: Tsh 5,500</p>
            <p className="text-center text-[#64748B]">─────────────────────</p>
            {/* Pharmacy footer — dark grey */}
            {watched.footerText && (
              <p className="text-center text-[#505050] whitespace-pre-wrap">{watched.footerText}</p>
            )}
            {/* Always-on APOTEKH footer — amber, two lines */}
            <div className="pt-1 space-y-0.5">
              <p className="text-center text-[#E8A020] text-xs">Powered by APOTEKH · apotekh.co.tz</p>
              <p className="text-center text-[#E8A020] text-xs">Powering Pharmacies. Protecting Patients.</p>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            leftIcon={<Save size={15} />}
            loading={saveMutation.isPending}
            disabled={!isDirty}
          >
            Save settings
          </Button>
        </div>
      </form>
    </div>
  );
};
