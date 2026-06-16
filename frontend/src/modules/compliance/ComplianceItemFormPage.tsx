import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Upload, FileText, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useNotificationStore } from '@/stores/notificationStore';
import { api } from '@/lib/api';

const COMPLIANCE_TYPES = [
  { value: 'TMDA_PREMISE',    label: 'TMDA Premise Licence' },
  { value: 'PC_IN_CHARGE',    label: 'Pharmacist In-Charge Certificate (PC)' },
  { value: 'PC_TECHNOLOGIST', label: 'Pharmaceutical Technologist Registration (PC)' },
  { value: 'DLDM_CERT',       label: 'DLDM Certificate (TMDA)' },
  { value: 'COLD_CHAIN',      label: 'Cold Chain Certification' },
  { value: 'NARCOTICS',       label: 'Narcotics / Controlled Substances Licence' },
  { value: 'BUSINESS_LICENCE',label: 'Business Licence (BRELA)' },
  { value: 'CUSTOM',          label: 'Custom / Other' },
];

interface FormState {
  type: string;
  name: string;
  issuingBody: string;
  licenceNumber: string;
  issueDate: string;
  expiryDate: string;
  notes: string;
}

const empty: FormState = {
  type: 'TMDA_PREMISE',
  name: '',
  issuingBody: '',
  licenceNumber: '',
  issueDate: '',
  expiryDate: '',
  notes: '',
};

export const ComplianceItemFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useNotificationStore(s => s.toast);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(empty);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['compliance-item', id],
    queryFn: () => api.get(`/compliance/items/${id}`).then(r => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (data?.data) {
      const d = data.data;
      setForm({
        type: d.type || 'TMDA_PREMISE',
        name: d.name || '',
        issuingBody: d.issuingBody || '',
        licenceNumber: d.licenceNumber || '',
        issueDate: d.issueDate ? d.issueDate.split('T')[0] : '',
        expiryDate: d.expiryDate ? d.expiryDate.split('T')[0] : '',
        notes: d.notes || '',
      });
    }
  }, [data]);

  // Auto-fill name when type changes (new items only)
  useEffect(() => {
    if (!isEdit) {
      const match = COMPLIANCE_TYPES.find(t => t.value === form.type);
      if (match && form.type !== 'CUSTOM') {
        setForm(f => ({ ...f, name: match.label }));
      }
    }
  }, [form.type, isEdit]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        type: form.type,
        name: form.name,
        issuingBody: form.issuingBody,
        licenceNumber: form.licenceNumber || undefined,
        issueDate: form.issueDate || undefined,
        expiryDate: form.expiryDate,
        notes: form.notes || undefined,
      };
      if (isEdit) {
        return api.put(`/compliance/items/${id}`, payload);
      }
      return api.post('/compliance/items', payload);
    },
    onSuccess: async (res) => {
      const itemId = isEdit ? id : res.data.data.id;
      // Upload document if one was selected
      if (pendingFile && itemId) {
        const fd = new FormData();
        fd.append('document', pendingFile);
        await api.post(`/compliance/items/${itemId}/documents`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      toast.success(isEdit ? 'Compliance item updated' : 'Compliance item added');
      qc.invalidateQueries({ queryKey: ['compliance-items'] });
      qc.invalidateQueries({ queryKey: ['compliance-health'] });
      navigate('/compliance/items');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to save'),
  });

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  const isValid = form.name && form.issuingBody && form.expiryDate;

  if (isEdit && isLoading) return <div className="p-8 text-center text-[#64748B]">Loading...</div>;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link to="/compliance/items" className="p-2 rounded-xl hover:bg-[#D6F0E8] text-[#64748B] transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-[#0D4035]">
          {isEdit ? 'Edit Compliance Item' : 'Add Compliance Item'}
        </h1>
      </div>

      <Card>
        <div className="space-y-5">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Item Details</p>

          <Select
            label="Compliance Type *"
            value={form.type}
            onChange={set('type')}
            options={COMPLIANCE_TYPES}
          />

          <Input
            label="Item Name *"
            value={form.name}
            onChange={set('name')}
            placeholder="e.g. TMDA Premise Licence 2025"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Issuing Body *"
              value={form.issuingBody}
              onChange={set('issuingBody')}
              placeholder="e.g. TMDA, Pharmacy Council"
              required
            />
            <Input
              label="Registration Number"
              value={form.licenceNumber}
              onChange={set('licenceNumber')}
              placeholder="e.g. PC/2025/XXXXX or TZ/MED/XXXX"
            />
            <Input
              label="Issue Date"
              type="date"
              value={form.issueDate}
              onChange={set('issueDate')}
            />
            <Input
              label="Expiry Date *"
              type="date"
              value={form.expiryDate}
              onChange={set('expiryDate')}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#0D4035] block mb-1">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={set('notes')}
              placeholder="Any additional notes or renewal reminders..."
              className="w-full px-3 py-2 text-sm border border-[#D6F0E8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A6B5C]/20 focus:border-[#1A6B5C] resize-none"
            />
          </div>
        </div>
      </Card>

      {/* Document Upload */}
      <Card header={<span className="text-sm font-semibold text-[#0D4035]">Attach Document (optional)</span>}>
        <p className="text-xs text-[#64748B] mb-3">Upload a copy of the licence or certificate. PDF, JPG, or PNG — max 5 MB.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={e => setPendingFile(e.target.files?.[0] ?? null)}
        />
        {pendingFile ? (
          <div className="flex items-center gap-3 p-3 bg-[#EDF7F3] rounded-xl border border-[#D6F0E8]">
            <FileText size={18} className="text-[#1A6B5C] shrink-0" />
            <p className="text-sm text-[#0D4035] flex-1 truncate">{pendingFile.name}</p>
            <button
              type="button"
              onClick={() => { setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              className="p-1 rounded-lg hover:bg-red-50 text-[#64748B] hover:text-[#DC2626]"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center gap-2 p-6 border-2 border-dashed border-[#D6F0E8] rounded-xl hover:border-[#1A6B5C] hover:bg-[#EDF7F3] transition-colors cursor-pointer"
          >
            <Upload size={24} className="text-[#64748B]" />
            <p className="text-sm text-[#64748B]">Click to browse or drag a file here</p>
          </button>
        )}
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={() => navigate('/compliance/items')}>Cancel</Button>
        <Button
          leftIcon={<Save size={16} />}
          loading={saveMutation.isPending}
          disabled={!isValid}
          onClick={() => saveMutation.mutate()}
        >
          {isEdit ? 'Save Changes' : 'Add Item'}
        </Button>
      </div>
    </div>
  );
};
