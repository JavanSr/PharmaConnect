import React, { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload, FileText, CheckCircle, Trash2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';

type ExtractedProduct = {
  productName: string;
  genericName: string;
  brandName?: string;
  manufacturer?: string;
  dosageForm?: string;
  strength?: string;
  packSize?: string;
  unitOfMeasure?: string;
  tmdaRegistrationNumber?: string;
};

type EditableProduct = ExtractedProduct & {
  _id: string;
  _saved: boolean;
  _error?: string;
};

const DOSAGE_FORM_OPTIONS = [
  '', 'TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'OINTMENT',
  'DROPS', 'INHALER', 'SUPPOSITORY', 'POWDER', 'SOLUTION', 'OTHER',
];

export const CatalogueImportPage: React.FC = () => {
  const toast = useNotificationStore(s => s.toast);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<EditableProduct[]>([]);
  const [saving, setSaving] = useState(false);

  const extractMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post('/catalogue-import/extract', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data as { data: ExtractedProduct[]; count: number });
    },
    onSuccess: ({ data }) => {
      if (data.length === 0) {
        toast.warning('No products found in this PDF. Try a different file or check formatting.');
        return;
      }
      setRows(data.map((p, i) => ({ ...p, _id: `row-${i}`, _saved: false })));
      toast.success(`Extracted ${data.length} product${data.length > 1 ? 's' : ''} — review and save below.`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Extraction failed'),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setRows([]);
    extractMutation.mutate(file);
  };

  const updateRow = (id: string, field: keyof ExtractedProduct, value: string) => {
    setRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value, _error: undefined } : r));
  };

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r._id !== id));
  };

  const saveAll = async () => {
    const pending = rows.filter(r => !r._saved);
    if (pending.length === 0) return;
    setSaving(true);
    const existingRes = await api.get('/inventory/products', { params: { limit: 1000 } });
    const existingNames = new Set(
      (existingRes.data.data ?? []).map((p: any) => String(p.name ?? '').toLowerCase().trim()).filter(Boolean),
    );
    const seenNames = new Set(existingNames);
    const newRows = pending.filter((row) => {
      const name = row.productName.toLowerCase().trim();
      if (!name || seenNames.has(name)) {
        return false;
      }
      seenNames.add(name);
      return true;
    });
    const duplicateCount = pending.length - newRows.length;
    if (duplicateCount > 0) {
      toast.warning(`${duplicateCount} duplicate product${duplicateCount > 1 ? 's' : ''} skipped.`);
    }
    if (newRows.length === 0) {
      setSaving(false);
      toast.info('All products already exist in your catalogue.');
      return;
    }
    let saved = 0;
    const updated = [...rows];
    for (const row of newRows) {
      const idx = updated.findIndex(r => r._id === row._id);
      try {
        await api.post('/inventory/products', {
          name: row.productName,
          genericName: row.genericName,
          brandName: row.brandName || undefined,
          manufacturer: row.manufacturer || undefined,
          dosageForm: row.dosageForm || undefined,
          strength: row.strength || undefined,
          unitOfMeasure: row.unitOfMeasure || undefined,
          tmdaRegistrationNumber: row.tmdaRegistrationNumber || undefined,
        });
        updated[idx] = { ...updated[idx], _saved: true, _error: undefined };
        saved++;
      } catch (e: any) {
        const msg = e?.response?.data?.error || 'Save failed';
        updated[idx] = { ...updated[idx], _error: msg };
      }
    }
    setRows(updated);
    setSaving(false);
    if (saved > 0) toast.success(`${saved} product${saved > 1 ? 's' : ''} added to your inventory`);
    const errors = updated.filter(r => r._error).length;
    if (errors > 0) toast.error(`${errors} product${errors > 1 ? 's' : ''} could not be saved — check highlighted rows`);
  };

  const savedCount = rows.filter(r => r._saved).length;
  const pendingCount = rows.filter(r => !r._saved).length;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-2 text-sm text-[#64748B]">
        <button onClick={() => navigate('/inventory')} className="hover:text-[#0D4035]">Inventory</button>
        <ChevronRight size={14} />
        <span className="text-[#0D4035] font-medium">Import Catalogue</span>
      </div>

      <h1 className="text-xl font-bold text-[#0D4035]">Supplier PDF Import</h1>
      <p className="text-sm text-[#64748B]">
        This assisted PDF workflow is available for later catalogue cleanup. For retail pharmacy onboarding, use Products to upload a CSV or add products manually.
      </p>

      {/* Upload zone */}
      <Card>
        <div
          className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-[#D6F0E8] rounded-2xl px-8 py-10 cursor-pointer hover:border-[#1A6B5C] hover:bg-[#F8FCFA] transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-12 h-12 rounded-full bg-[#EDF7F3] flex items-center justify-center">
            <Upload size={22} className="text-[#1A6B5C]" />
          </div>
          {fileName ? (
            <>
              <FileText size={18} className="text-[#1A6B5C]" />
              <p className="text-sm font-medium text-[#0D4035]">{fileName}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-[#0D4035]">Drop a PDF here or click to browse</p>
              <p className="text-xs text-[#64748B]">Supplier catalogues, price lists, product brochures — max 20 MB</p>
            </>
          )}
          {extractMutation.isPending && (
            <p className="text-sm text-[#1A6B5C] animate-pulse">Analysing PDF…</p>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
      </Card>

      {/* Results table */}
      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-[#0D4035]">{rows.length} products extracted</span>
              {savedCount > 0 && <Badge variant="success" size="sm">{savedCount} saved</Badge>}
              {pendingCount > 0 && <Badge variant="warning" size="sm">{pendingCount} pending</Badge>}
            </div>
            <Button
              onClick={saveAll}
              loading={saving}
              disabled={pendingCount === 0}
            >
              Save {pendingCount} product{pendingCount !== 1 ? 's' : ''} to inventory
            </Button>
          </div>

          <div className="space-y-3">
            {rows.map(row => (
              <Card key={row._id} padding={false}>
                <div className={`px-5 py-4 space-y-3 ${row._saved ? 'opacity-60' : ''} ${row._error ? 'border-l-4 border-red-400' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {row._saved && (
                        <Badge variant="success" size="sm"><CheckCircle size={11} className="inline mr-1" />Saved</Badge>
                      )}
                      {row._error && (
                        <Badge variant="danger" size="sm">{row._error}</Badge>
                      )}
                    </div>
                    {!row._saved && (
                      <button
                        type="button"
                        onClick={() => removeRow(row._id)}
                        className="p-1 text-[#64748B] hover:text-[#DC2626] rounded-lg transition-colors shrink-0"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Input
                      label="Product name"
                      value={row.productName}
                      onChange={e => updateRow(row._id, 'productName', e.target.value)}
                      disabled={row._saved}
                      required
                    />
                    <Input
                      label="Generic name"
                      value={row.genericName}
                      onChange={e => updateRow(row._id, 'genericName', e.target.value)}
                      disabled={row._saved}
                      required
                    />
                    <Input
                      label="Brand name"
                      value={row.brandName ?? ''}
                      onChange={e => updateRow(row._id, 'brandName', e.target.value)}
                      disabled={row._saved}
                    />
                    <Input
                      label="Strength"
                      value={row.strength ?? ''}
                      onChange={e => updateRow(row._id, 'strength', e.target.value)}
                      disabled={row._saved}
                      placeholder="e.g. 500mg"
                    />
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-[#475569]">Dosage form</label>
                      <select
                        className="w-full rounded-xl border border-[#D6F0E8] bg-white px-3 py-2 text-sm text-[#0D4035] focus:outline-none focus:ring-2 focus:ring-[#1A6B5C] disabled:opacity-50"
                        value={row.dosageForm ?? ''}
                        onChange={e => updateRow(row._id, 'dosageForm', e.target.value)}
                        disabled={row._saved}
                      >
                        {DOSAGE_FORM_OPTIONS.map(o => (
                          <option key={o} value={o}>{o || '— select —'}</option>
                        ))}
                      </select>
                    </div>
                    <Input
                      label="Manufacturer"
                      value={row.manufacturer ?? ''}
                      onChange={e => updateRow(row._id, 'manufacturer', e.target.value)}
                      disabled={row._saved}
                    />
                    <Input
                      label="Pack size"
                      value={row.packSize ?? ''}
                      onChange={e => updateRow(row._id, 'packSize', e.target.value)}
                      disabled={row._saved}
                      placeholder="e.g. 30 tablets"
                    />
                    <Input
                      label="TMDA Reg. No."
                      value={row.tmdaRegistrationNumber ?? ''}
                      onChange={e => updateRow(row._id, 'tmdaRegistrationNumber', e.target.value)}
                      disabled={row._saved}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {savedCount === rows.length && (
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => navigate('/inventory/products')}>
                View all products →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
