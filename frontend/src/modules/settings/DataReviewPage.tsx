import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAuth } from '@/hooks/useAuth';
import type { DataReviewQueueEntry, ReviewQueueStatus, ReviewerType } from '@/types';
import { SettingsNav } from './SettingsNav';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING_REVIEW', label: 'Pending review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'RETIRED', label: 'Retired' },
  { value: 'IMPORTED', label: 'Imported' },
  { value: 'DRAFT', label: 'Draft' },
];

const REVIEW_ACTION_OPTIONS = [
  { value: 'PENDING_REVIEW', label: 'Mark pending' },
  { value: 'APPROVED', label: 'Approve' },
  { value: 'REJECTED', label: 'Reject' },
  { value: 'RETIRED', label: 'Retire' },
];

const REVIEWER_TYPE_OPTIONS = [
  { value: 'PLATFORM_PHARMACIST', label: 'Platform pharmacist' },
  { value: 'TMDA_REFERENCE', label: 'TMDA reference' },
];

const statusVariant: Record<ReviewQueueStatus, 'warning' | 'success' | 'danger' | 'muted' | 'info'> = {
  DRAFT: 'muted',
  IMPORTED: 'info',
  PENDING_REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  RETIRED: 'muted',
};

const reviewerTypeLabel: Record<ReviewerType, string> = {
  PLATFORM_PHARMACIST: 'Platform pharmacist',
  TMDA_REFERENCE: 'TMDA reference',
};

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return '{}';
  }
}

function renderDisplayName(actor?: { firstName: string; lastName: string } | null) {
  if (!actor) {
    return 'Unknown reviewer';
  }

  return `${actor.firstName} ${actor.lastName}`.trim();
}

export const DataReviewPage: React.FC = () => {
  const { hasRole } = useAuth();
  const toast = useNotificationStore((state) => state.toast);
  const queryClient = useQueryClient();
  const canPlatformReview = hasRole('SUPER_ADMIN');

  const [statusFilter, setStatusFilter] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ReviewQueueStatus>('PENDING_REVIEW');
  const [reviewerType, setReviewerType] = useState<ReviewerType>(canPlatformReview ? 'PLATFORM_PHARMACIST' : 'TMDA_REFERENCE');
  const [notes, setNotes] = useState('');
  const [proposedPayloadText, setProposedPayloadText] = useState('{}');

  const queueQuery = useQuery({
    queryKey: ['review-queue', statusFilter],
    queryFn: () =>
      api.get('/review-queue', {
        params: {
          status: statusFilter || undefined,
          limit: 50,
        },
      }).then((response) => response.data),
  });

  const queueEntries = (queueQuery.data?.data ?? []) as DataReviewQueueEntry[];

  useEffect(() => {
    if (!selectedEntryId && queueEntries.length > 0) {
      setSelectedEntryId(queueEntries[0].id);
    }

    if (selectedEntryId && !queueEntries.some((entry) => entry.id === selectedEntryId) && queueEntries.length > 0) {
      setSelectedEntryId(queueEntries[0].id);
    }
  }, [queueEntries, selectedEntryId]);

  const selectedEntrySummary = useMemo(
    () => queueEntries.find((entry) => entry.id === selectedEntryId) ?? null,
    [queueEntries, selectedEntryId],
  );

  const detailQuery = useQuery({
    queryKey: ['review-queue-detail', selectedEntryId],
    queryFn: () => api.get(`/review-queue/${selectedEntryId}`).then((response) => response.data),
    enabled: Boolean(selectedEntryId),
  });

  const selectedEntry = (detailQuery.data?.data ?? selectedEntrySummary) as DataReviewQueueEntry | null;

  useEffect(() => {
    if (!selectedEntry) {
      return;
    }

    setReviewStatus(selectedEntry.status);
    setReviewerType(selectedEntry.reviewerType ?? (canPlatformReview ? 'PLATFORM_PHARMACIST' : 'TMDA_REFERENCE'));
    setNotes(selectedEntry.notes ?? '');
    setProposedPayloadText(formatJson(selectedEntry.proposedPayload));
  }, [canPlatformReview, selectedEntry?.id]);

  const reviewMutation = useMutation({
    mutationFn: async () => {
      let proposedPayload: unknown;
      try {
        proposedPayload = JSON.parse(proposedPayloadText || '{}');
      } catch {
        throw new Error('Proposed payload must be valid JSON');
      }

      return api.patch(`/review-queue/${selectedEntryId}`, {
        status: reviewStatus,
        reviewerType: canPlatformReview ? reviewerType : 'TMDA_REFERENCE',
        notes: notes.trim() || undefined,
        proposedPayload,
      });
    },
    onSuccess: () => {
      toast.success('Review queue entry updated');
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['review-queue-detail', selectedEntryId] });
    },
    onError: (error: any) => {
      toast.error(error.message || error.response?.data?.message || error.response?.data?.error || 'Failed to update review entry');
    },
  });

  if (!hasRole(['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'])) {
    return (
      <Card>
        <p className="text-sm text-[#64748B]">You do not have access to the review queue.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0D4035]">Data Review Queue</h1>
          <div className="mt-3">
            <SettingsNav />
          </div>
          <p className="mt-1 text-sm text-[#64748B]">
            Review imported catalog and safety records, update wording where needed, and preserve an audit trail.
          </p>
        </div>
        <div className="min-w-[220px]">
          <Select
            label="Status filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={STATUS_OPTIONS}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card
          header={
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[#0D4035]">Queue entries</h2>
              <Badge variant="info" size="sm">{queueEntries.length}</Badge>
            </div>
          }
          padding={false}
        >
          {queueQuery.isLoading ? (
            <div className="p-5 text-sm text-[#64748B]">Loading review queue…</div>
          ) : queueEntries.length === 0 ? (
            <div className="p-5 text-sm text-[#64748B]">No review entries matched the current filter.</div>
          ) : (
            <div className="divide-y divide-[#D6F0E8]">
              {queueEntries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedEntryId(entry.id)}
                  className={`block w-full px-5 py-4 text-left transition-colors ${
                    entry.id === selectedEntryId ? 'bg-[#EDF7F3]' : 'hover:bg-[#F8FCFA]'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant[entry.status]} size="sm">{entry.status.replace(/_/g, ' ')}</Badge>
                    {entry.reviewerType && (
                      <Badge variant="muted" size="sm">{reviewerTypeLabel[entry.reviewerType]}</Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#0D4035]">{entry.entityType}</p>
                  <p className="mt-1 text-xs text-[#64748B] break-all">{entry.entityId}</p>
                  <p className="mt-2 text-xs text-[#64748B]">
                    Updated {format(new Date(entry.updatedAt), 'dd MMM yyyy, HH:mm')}
                  </p>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card
          header={<h2 className="text-sm font-semibold text-[#0D4035]">Review detail</h2>}
          footer={
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  if (!selectedEntry) {
                    return;
                  }
                  setReviewStatus(selectedEntry.status);
                  setReviewerType(selectedEntry.reviewerType ?? (canPlatformReview ? 'PLATFORM_PHARMACIST' : 'TMDA_REFERENCE'));
                  setNotes(selectedEntry.notes ?? '');
                  setProposedPayloadText(formatJson(selectedEntry.proposedPayload));
                }}
              >
                Reset edits
              </Button>
              <Button
                onClick={() => reviewMutation.mutate()}
                loading={reviewMutation.isPending}
                disabled={!selectedEntry}
              >
                Save review decision
              </Button>
            </div>
          }
        >
          {!selectedEntry ? (
            <p className="text-sm text-[#64748B]">Select a queue entry to review its payload and audit history.</p>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-[#D6F0E8] bg-[#F8FCFA] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Entity</p>
                  <p className="mt-2 text-sm font-semibold text-[#0D4035]">{selectedEntry.entityType}</p>
                  <p className="mt-1 break-all text-xs text-[#64748B]">{selectedEntry.entityId}</p>
                </div>
                <div className="rounded-2xl border border-[#D6F0E8] bg-[#F8FCFA] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Source</p>
                  <p className="mt-2 text-sm font-semibold text-[#0D4035]">
                    {selectedEntry.sourceDocument?.title ?? 'No linked source document'}
                  </p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    {selectedEntry.sourceDocument?.sourceName ?? 'Manual queue entry'}
                  </p>
                  {selectedEntry.sourceDocument?.url && (
                    <a
                      href={selectedEntry.sourceDocument.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs font-medium text-[#1A6B5C] hover:underline"
                    >
                      Open source document
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Select
                  label="Decision"
                  value={reviewStatus}
                  onChange={(event) => setReviewStatus(event.target.value as ReviewQueueStatus)}
                  options={REVIEW_ACTION_OPTIONS}
                />
                <Select
                  label="Reviewer type"
                  value={reviewerType}
                  onChange={(event) => setReviewerType(event.target.value as ReviewerType)}
                  options={canPlatformReview ? REVIEWER_TYPE_OPTIONS : REVIEWER_TYPE_OPTIONS.filter((option) => option.value === 'TMDA_REFERENCE')}
                  disabled={!canPlatformReview}
                />
                <div className="rounded-2xl border border-[#D6F0E8] bg-[#F8FCFA] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Last reviewer</p>
                  <p className="mt-2 text-sm font-semibold text-[#0D4035]">
                    {renderDisplayName(selectedEntry.reviewerUser)}
                  </p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    {selectedEntry.reviewedAt ? format(new Date(selectedEntry.reviewedAt), 'dd MMM yyyy, HH:mm') : 'Not reviewed yet'}
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#0D4035]">Reviewer notes</label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-[#D6F0E8] px-3 py-2.5 text-sm text-[#0D4035] outline-none transition-colors focus:border-[#1A6B5C] focus:ring-2 focus:ring-[#1A6B5C]/20"
                  placeholder="Summarize what changed, why it was approved or rejected, or what still needs verification."
                />
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#0D4035]">Current payload</label>
                  <textarea
                    value={formatJson(selectedEntry.currentPayload)}
                    readOnly
                    rows={16}
                    className="w-full rounded-2xl border border-[#D6F0E8] bg-[#F8FCFA] px-3 py-2.5 font-mono text-xs text-[#0D4035] outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#0D4035]">Proposed payload</label>
                  <textarea
                    value={proposedPayloadText}
                    onChange={(event) => setProposedPayloadText(event.target.value)}
                    rows={16}
                    className="w-full rounded-2xl border border-[#D6F0E8] px-3 py-2.5 font-mono text-xs text-[#0D4035] outline-none transition-colors focus:border-[#1A6B5C] focus:ring-2 focus:ring-[#1A6B5C]/20"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#0D4035]">Audit history</h3>
                <div className="mt-3 space-y-3">
                  {(selectedEntry.auditLogs ?? []).length === 0 ? (
                    <p className="text-sm text-[#64748B]">No audit events recorded yet.</p>
                  ) : (
                    selectedEntry.auditLogs!.map((auditLog) => (
                      <div key={auditLog.id} className="rounded-2xl border border-[#D6F0E8] bg-[#F8FCFA] p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="info" size="sm">{auditLog.action.replace(/_/g, ' ')}</Badge>
                          {auditLog.nextStatus && (
                            <Badge variant={statusVariant[auditLog.nextStatus]} size="sm">{auditLog.nextStatus.replace(/_/g, ' ')}</Badge>
                          )}
                        </div>
                        <p className="mt-2 text-sm font-semibold text-[#0D4035]">
                          {renderDisplayName(auditLog.actorUser)}
                        </p>
                        <p className="mt-1 text-xs text-[#64748B]">
                          {format(new Date(auditLog.createdAt), 'dd MMM yyyy, HH:mm')}
                        </p>
                        {auditLog.note && <p className="mt-2 text-sm text-[#0D4035]">{auditLog.note}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
