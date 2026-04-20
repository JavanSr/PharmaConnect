import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, Edit2, X, Eye } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useNotificationStore } from '@/stores/notificationStore';
import { api } from '@/lib/api';

const statusColor: Record<string, 'success' | 'warning' | 'danger' | 'muted'> = {
  GREEN: 'success', AMBER: 'warning', RED: 'danger', EXPIRED: 'muted',
};

const BACKEND = import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? '';

export const ComplianceItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [newExpiry, setNewExpiry] = useState('');
  const [viewingDoc, setViewingDoc] = useState<{ url: string; name: string } | null>(null);
  const toast = useNotificationStore(s => s.toast);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['compliance-item', id],
    queryFn: () => api.get(`/compliance/items/${id}`).then(r => r.data),
  });

  const { data: docsData, refetch: refetchDocs } = useQuery({
    queryKey: ['compliance-docs', id],
    queryFn: () => api.get(`/compliance/items/${id}/documents`).then(r => r.data),
  });

  const renewMutation = useMutation({
    mutationFn: () => api.put(`/compliance/items/${id}`, { expiryDate: newExpiry }),
    onSuccess: () => {
      toast.success('Compliance item renewed');
      qc.invalidateQueries({ queryKey: ['compliance-item', id] });
      qc.invalidateQueries({ queryKey: ['compliance-items'] });
      qc.invalidateQueries({ queryKey: ['compliance-health'] });
      setRenewModalOpen(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to renew'),
  });

  const toggleNotApplicable = useMutation({
    mutationFn: () =>
      api.put(`/compliance/items/${id}`, { isNotApplicable: !item.isNotApplicable }),
    onSuccess: () => {
      toast.success(item.isNotApplicable ? 'Marked as applicable' : 'Marked as not applicable');
      qc.invalidateQueries({ queryKey: ['compliance-item', id] });
      qc.invalidateQueries({ queryKey: ['compliance-items'] });
      qc.invalidateQueries({ queryKey: ['compliance-health'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to update'),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('document', file);
      return api.post(`/compliance/items/${id}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast.success('Document uploaded');
      refetchDocs();
    },
    onError: () => toast.error('Upload failed'),
  });

  const item = data?.data;
  const docs = docsData?.data || [];

  if (isLoading) return <div className="p-8 text-center text-[#64748B]">Loading...</div>;
  if (!item) return <div className="p-8 text-center text-[#DC2626]">Item not found</div>;

  const days = differenceInDays(new Date(item.expiryDate), new Date());

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/compliance/items" className="p-2 rounded-xl hover:bg-[#D6F0E8] text-[#64748B] transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-[#0D4035] flex-1">{item.name}</h1>
        {item.isNotApplicable ? (
          <Badge variant="muted">Not Applicable</Badge>
        ) : (
          <Badge variant={statusColor[item.status]}>{item.status}</Badge>
        )}
        <Link to={`/compliance/items/${id}/edit`}>
          <Button size="sm" variant="secondary" leftIcon={<Edit2 size={14} />}>Edit</Button>
        </Link>
        <Button size="sm" onClick={() => setRenewModalOpen(true)}>Renew</Button>
      </div>

      {/* Details card */}
      <Card>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Type', value: item.type.replace(/_/g, ' ') },
            { label: 'Issuing Body', value: item.issuingBody },
            { label: 'Licence Number', value: item.licenceNumber || '—' },
            { label: 'Issue Date', value: item.issueDate ? format(new Date(item.issueDate), 'dd MMM yyyy') : '—' },
            { label: 'Expiry Date', value: format(new Date(item.expiryDate), 'dd MMM yyyy') },
            { label: 'Days Until Expiry', value: item.isNotApplicable ? 'N/A' : days <= 0 ? 'EXPIRED' : `${days} days` },
          ].map(f => (
            <div key={f.label}>
              <p className="text-xs text-[#64748B] mb-0.5">{f.label}</p>
              <p className="text-sm font-medium text-[#0D4035]">{f.value}</p>
            </div>
          ))}
        </div>
        {item.notes && (
          <div className="mt-4 p-3 bg-[#EDF7F3] rounded-xl">
            <p className="text-xs text-[#64748B] mb-1">Notes</p>
            <p className="text-sm text-[#0D4035]">{item.notes}</p>
          </div>
        )}

        {/* Not Applicable toggle */}
        <div className="mt-4 pt-4 border-t border-[#D6F0E8] flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#0D4035]">Not Applicable at this pharmacy</p>
            <p className="text-xs text-[#64748B]">Excludes this item from the compliance health score</p>
          </div>
          <button
            onClick={() => toggleNotApplicable.mutate()}
            disabled={toggleNotApplicable.isPending}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              item.isNotApplicable ? 'bg-[#1A6B5C]' : 'bg-[#D6F0E8]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                item.isNotApplicable ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </Card>

      {/* Documents */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#0D4035]">Documents</span>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={e => e.target.files?.[0] && uploadMutation.mutate(e.target.files[0])}
              />
              <Button size="sm" variant="secondary" leftIcon={<Upload size={14} />} loading={uploadMutation.isPending}>
                Upload
              </Button>
            </label>
          </div>
        }
        padding={false}
      >
        {docs.length === 0 ? (
          <div className="p-8 text-center">
            <FileText size={32} className="text-[#D6F0E8] mx-auto mb-2" />
            <p className="text-sm text-[#64748B]">No documents uploaded yet</p>
            <p className="text-xs text-[#64748B] mt-1">Upload a copy of the licence or certificate for inspection readiness</p>
          </div>
        ) : (
          <div className="divide-y divide-[#D6F0E8]">
            {docs.map((doc: any) => {
              const fileUrl = doc.fileUrl.startsWith('uploads') || doc.fileUrl.startsWith('/uploads')
                ? `${BACKEND}/${doc.fileUrl.replace(/\\/g, '/')}`
                : doc.fileUrl;
              const isPdf = doc.filename?.toLowerCase().endsWith('.pdf');
              const isImage = /\.(jpg|jpeg|png)$/i.test(doc.filename ?? '');
              return (
                <div key={doc.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-[#1A6B5C] shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#0D4035]">{doc.filename}</p>
                      <p className="text-xs text-[#64748B]">{format(new Date(doc.uploadedAt), 'dd MMM yyyy')}</p>
                    </div>
                  </div>
                  {(isPdf || isImage) ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<Eye size={14} />}
                      onClick={() => setViewingDoc({ url: fileUrl, name: doc.filename })}
                    >
                      View
                    </Button>
                  ) : (
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#1A6B5C] hover:underline">
                      Download
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Renew Modal */}
      <Modal
        isOpen={renewModalOpen}
        onClose={() => setRenewModalOpen(false)}
        title="Renew Compliance Item"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setRenewModalOpen(false)}>Cancel</Button>
            <Button onClick={() => renewMutation.mutate()} loading={renewMutation.isPending} disabled={!newExpiry}>
              Save New Expiry
            </Button>
          </div>
        }
      >
        <Input label="New Expiry Date" type="date" value={newExpiry} onChange={e => setNewExpiry(e.target.value)} required />
      </Modal>

      {/* In-app document viewer modal */}
      <Modal
        isOpen={!!viewingDoc}
        onClose={() => setViewingDoc(null)}
        title={viewingDoc?.name ?? 'Document'}
        footer={
          <div className="flex justify-end">
            <Button variant="ghost" leftIcon={<X size={14} />} onClick={() => setViewingDoc(null)}>Close</Button>
          </div>
        }
      >
        {viewingDoc && (
          <div className="w-full" style={{ minHeight: 480 }}>
            {/\.pdf$/i.test(viewingDoc.name) ? (
              <iframe
                src={viewingDoc.url}
                title={viewingDoc.name}
                className="w-full rounded-lg border border-[#D6F0E8]"
                style={{ height: 480 }}
              />
            ) : (
              <img
                src={viewingDoc.url}
                alt={viewingDoc.name}
                className="w-full rounded-lg object-contain"
                style={{ maxHeight: 480 }}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
