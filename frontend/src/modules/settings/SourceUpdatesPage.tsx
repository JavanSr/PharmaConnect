import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';
import type { SourceSyncNextValue, SourceSyncRun } from '@/types';
import { SettingsNav } from './SettingsNav';

const statusVariant: Record<SourceSyncRun['status'], 'warning' | 'success' | 'danger'> = {
  STARTED: 'warning',
  COMPLETED: 'success',
  FAILED: 'danger',
};

const changeVariant: Record<SourceSyncRun['changes'][number]['changeType'], 'warning' | 'success' | 'danger' | 'muted'> = {
  NEW_SOURCE: 'warning',
  SOURCE_METADATA_UPDATED: 'warning',
  SOURCE_UNCHANGED: 'muted',
  SOURCE_CHECK_FAILED: 'danger',
  SOURCE_NOT_MONITORED: 'warning',
};

function getNextValue(value: unknown): SourceSyncNextValue | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as SourceSyncNextValue;
}

export const SourceUpdatesPage: React.FC = () => {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const toast = useNotificationStore((state) => state.toast);

  if (!hasRole('SUPER_ADMIN')) {
    return (
      <Card>
        <p className="text-sm text-[#64748B]">You do not have access to source updates.</p>
      </Card>
    );
  }

  const runsQuery = useQuery({
    queryKey: ['source-sync-runs'],
    queryFn: () => api.get('/source-sync/runs').then((response) => response.data),
  });

  const runCheckMutation = useMutation({
    mutationFn: () => api.post('/source-sync/runs').then((response) => response.data),
    onSuccess: () => {
      toast.success('Source update check completed');
      queryClient.invalidateQueries({ queryKey: ['source-sync-runs'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Source update check failed');
    },
  });

  const runs = (runsQuery.data?.data ?? []) as SourceSyncRun[];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0D4035]">Source Updates</h1>
          <div className="mt-3">
            <SettingsNav />
          </div>
          <p className="mt-3 text-sm text-[#64748B]">
            Check monitored Tanzania and safety sources, record what changed, and keep an admin-readable update report.
          </p>
        </div>
        <Button onClick={() => runCheckMutation.mutate()} loading={runCheckMutation.isPending}>
          Run source check
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-[#64748B]">Recent runs</p>
          <p className="mt-2 text-2xl font-bold text-[#0D4035]">{runs.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[#64748B]">Latest changes detected</p>
          <p className="mt-2 text-2xl font-bold text-[#0D4035]">{runs[0]?.changesDetected ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[#64748B]">Latest sources checked</p>
          <p className="mt-2 text-2xl font-bold text-[#0D4035]">{runs[0]?.sourcesChecked ?? 0}</p>
        </Card>
      </div>

      <Card>
        {runsQuery.isLoading ? (
          <p className="text-sm text-[#64748B]">Loading source update reports…</p>
        ) : runs.length === 0 ? (
          <p className="text-sm text-[#64748B]">No source update checks have been recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {runs.map((run) => (
              <div key={run.id} className="rounded-2xl border border-[#D6F0E8] bg-[#F8FCFA] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant[run.status]} size="sm">{run.status}</Badge>
                    <Badge variant="info" size="sm">{run.sourcesChecked} checked</Badge>
                    <Badge variant={run.changesDetected > 0 ? 'warning' : 'success'} size="sm">
                      {run.changesDetected} change{run.changesDetected === 1 ? '' : 's'}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#64748B]">
                    {format(new Date(run.startedAt), 'dd MMM yyyy, HH:mm')}
                  </p>
                </div>

                {run.notes && <p className="mt-3 text-sm text-[#0D4035]">{run.notes}</p>}

                <div className="mt-4 space-y-3">
                  {run.changes.map((change) => (
                    <div key={change.id} className="rounded-2xl border border-[#D6F0E8] bg-white p-3">
                      {(() => {
                        const nextValue = getNextValue(change.nextValue);
                        const snapshot = nextValue?.snapshot;

                        return (
                          <>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={changeVariant[change.changeType]} size="sm">
                          {change.changeType.replace(/_/g, ' ')}
                        </Badge>
                        {change.sourceDocument?.title && (
                          <span className="text-xs text-[#64748B]">{change.sourceDocument.title}</span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-[#0D4035]">{change.summary}</p>
                      {snapshot && (
                        <div className="mt-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FCFA] p-3">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="info" size="sm">{snapshot.category.replace(/_/g, ' ')}</Badge>
                            <Badge variant={snapshot.requiresReview ? 'warning' : 'success'} size="sm">
                              {snapshot.requiresReview ? 'Needs review' : 'Aligned'}
                            </Badge>
                            <Badge variant="muted" size="sm">
                              {snapshot.reviewQueueCount} queue item{snapshot.reviewQueueCount === 1 ? '' : 's'}
                            </Badge>
                            {typeof snapshot.importedProductCount === 'number' && (
                              <Badge variant="muted" size="sm">
                                {snapshot.importedProductCount} imported
                              </Badge>
                            )}
                            {typeof snapshot.sourceRecordCount === 'number' && (
                              <Badge variant="muted" size="sm">
                                {snapshot.sourceRecordCount} in source
                              </Badge>
                            )}
                          </div>
                          {snapshot.approvedRuleCounts && (
                            <p className="mt-2 text-xs text-[#64748B]">
                              Approved safety rules:
                              {' '}
                              {[
                                `${snapshot.approvedRuleCounts.interactions} interactions`,
                                `${snapshot.approvedRuleCounts.contraindications} contraindications`,
                                `${snapshot.approvedRuleCounts.warnings} warnings`,
                                `${snapshot.approvedRuleCounts.pregnancyFlags} pregnancy`,
                                `${snapshot.approvedRuleCounts.lactationFlags} lactation`,
                                `${snapshot.approvedRuleCounts.renalFlags} renal`,
                                `${snapshot.approvedRuleCounts.hepaticFlags} hepatic`,
                              ].join(' · ')}
                            </p>
                          )}
                          {snapshot.notes.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {snapshot.notes.map((note) => (
                                <p key={note} className="text-xs text-[#64748B]">{note}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
