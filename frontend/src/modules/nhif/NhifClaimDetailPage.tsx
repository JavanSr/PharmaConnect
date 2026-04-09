import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, XCircle, Send, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

const STATUS_VARIANT: Record<string, any> = {
  DRAFT: 'warning', SCRUBBED: 'info', SUBMITTED: 'info',
  APPROVED: 'success', REJECTED: 'danger', RESUBMITTED: 'muted',
};

export const NhifClaimDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const toast = useNotificationStore(s => s.toast);
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const canManage = hasRole(['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN']);

  const { data, isLoading } = useQuery({
    queryKey: ['nhif-claim', id],
    queryFn: () => api.get(`/nhif/claims/${id}`).then(r => r.data),
  });

  const scrubMutation = useMutation({
    mutationFn: () => api.post(`/nhif/claims/${id}/scrub`),
    onSuccess: () => {
      toast.success('Claim scrubbed — review results below');
      qc.invalidateQueries({ queryKey: ['nhif-claim', id] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Scrub failed'),
  });

  const claim = data?.data;

  if (isLoading) return <div className="p-8 text-center text-[#64748B]">Loading...</div>;
  if (!claim) return <div className="p-8 text-center text-[#DC2626]">Claim not found</div>;

  const scrubResults: any[] = claim.scrubResults || [];
  const allPassed = scrubResults.length > 0 && scrubResults.every((r: any) => r.passed);

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link to="/nhif/claims" className="p-2 rounded-xl hover:bg-[#D6F0E8] text-[#64748B] transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-[#0D4035] flex-1">NHIF Claim</h1>
        <Badge variant={STATUS_VARIANT[claim.status] || 'muted'}>{claim.status}</Badge>
        {canManage && claim.status === 'DRAFT' && (
          <Button size="sm" variant="secondary" leftIcon={<RefreshCw size={14} />} loading={scrubMutation.isPending} onClick={() => scrubMutation.mutate()}>
            Scrub Claim
          </Button>
        )}
      </div>

      {/* Claim Details */}
      <Card>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'ICD-10 Code', value: claim.icdCode },
            { label: 'Drug Code', value: claim.drugCode || '—' },
            { label: 'Member Name', value: claim.memberName || '—' },
            { label: 'Quantity', value: claim.quantity },
            { label: 'Claimed Amount', value: `TZS ${(claim.claimedAmount || 0).toLocaleString()}` },
            { label: 'NHIF Reference', value: claim.nhifReferenceNumber || '—' },
            { label: 'VFD Receipt', value: claim.vfdReceiptNumber || '—' },
            { label: 'Created', value: format(new Date(claim.createdAt), 'dd MMM yyyy HH:mm') },
            ...(claim.submittedAt ? [{ label: 'Submitted', value: format(new Date(claim.submittedAt), 'dd MMM yyyy') }] : []),
            ...(claim.approvedAt ? [{ label: 'Approved', value: format(new Date(claim.approvedAt), 'dd MMM yyyy') }] : []),
          ].map(f => (
            <div key={f.label}>
              <p className="text-xs text-[#64748B] mb-0.5">{f.label}</p>
              <p className="text-sm font-medium text-[#0D4035]">{f.value}</p>
            </div>
          ))}
        </div>

        {claim.rejectionCode && (
          <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-200">
            <p className="text-xs font-semibold text-[#DC2626] mb-1">Rejection — {claim.rejectionCode}</p>
            <p className="text-sm text-[#DC2626]">{claim.rejectionReason || 'No reason provided'}</p>
          </div>
        )}
      </Card>

      {/* Scrub Results */}
      {scrubResults.length > 0 && (
        <Card header={
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#0D4035]">Scrub Results</span>
            {allPassed
              ? <Badge variant="success" size="sm">All checks passed</Badge>
              : <Badge variant="danger" size="sm">{scrubResults.filter((r: any) => !r.passed).length} issue(s) found</Badge>
            }
          </div>
        } padding={false}>
          <div className="divide-y divide-[#D6F0E8]">
            {scrubResults.map((r: any) => (
              <div key={r.id} className="flex items-start gap-3 px-5 py-3">
                {r.passed
                  ? <CheckCircle size={16} className="text-[#1A6B5C] shrink-0 mt-0.5" />
                  : <XCircle size={16} className="text-[#DC2626] shrink-0 mt-0.5" />
                }
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#0D4035]">{r.rule.replace(/_/g, ' ')}</p>
                  {!r.passed && r.errorMessage && (
                    <p className="text-xs text-[#DC2626] mt-0.5">{r.errorMessage}</p>
                  )}
                </div>
                <Badge variant={r.passed ? 'success' : 'danger'} size="sm">{r.passed ? 'PASS' : 'FAIL'}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {scrubResults.length === 0 && claim.status === 'DRAFT' && canManage && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-[#D97706]">
          This claim has not been scrubbed yet. Run a scrub check before submitting to NHIF.
        </div>
      )}
    </div>
  );
};
