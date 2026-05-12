import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, Trash2, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';
import type { StaffCredential } from '@/types';

const emptyForm = {
  credentialName: '',
  credentialNumber: '',
  issuingBody: '',
  issuedAt: '',
  expiresAt: '',
  notes: '',
};

export const StaffCredentialsPage: React.FC = () => {
  const [form, setForm] = useState(emptyForm);
  const toast = useNotificationStore((state) => state.toast);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['staff-credentials'],
    queryFn: () => api.get('/compliance/staff-credentials').then((response) => response.data),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/compliance/staff-credentials', {
        credentialName: form.credentialName,
        credentialNumber: form.credentialNumber || undefined,
        issuingBody: form.issuingBody || undefined,
        issuedAt: form.issuedAt || undefined,
        expiresAt: form.expiresAt || undefined,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Staff credential saved');
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['staff-credentials'] });
    },
    onError: () => toast.error('Failed to save credential'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/compliance/staff-credentials/${id}`),
    onSuccess: () => {
      toast.success('Staff credential deleted');
      qc.invalidateQueries({ queryKey: ['staff-credentials'] });
    },
    onError: () => toast.error('Failed to delete credential'),
  });

  const credentials: StaffCredential[] = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-[#0D4035]">Staff Credentials</h1>
          <p className="text-sm text-[#64748B]">Track pharmacist and staff registrations that need proactive renewal.</p>
        </div>
      </div>

      <Card header={<span className="text-sm font-semibold text-[#0D4035]">Add Credential</span>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Credential Name" value={form.credentialName} onChange={(event) => setForm((current) => ({ ...current, credentialName: event.target.value }))} />
          <Input label="Credential Number" value={form.credentialNumber} onChange={(event) => setForm((current) => ({ ...current, credentialNumber: event.target.value }))} />
          <Input label="Issuing Body" value={form.issuingBody} onChange={(event) => setForm((current) => ({ ...current, issuingBody: event.target.value }))} />
          <Input label="Issued At" type="date" value={form.issuedAt} onChange={(event) => setForm((current) => ({ ...current, issuedAt: event.target.value }))} />
          <Input label="Expires At" type="date" value={form.expiresAt} onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))} />
          <Input label="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            leftIcon={<Plus size={16} />}
            loading={createMutation.isPending}
            disabled={!form.credentialName.trim()}
            onClick={() => createMutation.mutate()}
          >
            Save Credential
          </Button>
        </div>
      </Card>

      <Card padding={false}>
        {isLoading ? (
          <div className="p-8 text-center text-[#64748B]">Loading credentials...</div>
        ) : credentials.length === 0 ? (
          <div className="p-10 text-center">
            <ShieldCheck size={36} className="mx-auto mb-3 text-[#D6F0E8]" />
            <p className="text-sm text-[#64748B]">No staff credentials recorded yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#D6F0E8]">
            {credentials.map((credential) => (
              <div key={credential.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-[#0D4035]">{credential.credentialName}</p>
                  <p className="text-xs text-[#64748B]">
                    {credential.issuingBody || 'Issuing body not recorded'}
                    {credential.credentialNumber ? ` · ${credential.credentialNumber}` : ''}
                  </p>
                  <p className="text-xs text-[#64748B] mt-1">
                    {credential.expiresAt ? `Expires ${format(new Date(credential.expiresAt), 'dd MMM yyyy')}` : 'No expiry date'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs rounded-full bg-[#EDF7F3] px-3 py-1 font-medium text-[#0D4035]">{credential.status}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Trash2 size={14} />}
                    loading={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(credential.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
