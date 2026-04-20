import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, RefreshCcw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { listOfflineWrites, OFFLINE_QUEUE_EVENT } from '@/lib/offlineSync';
import { api } from '@/lib/api';
import type { SyncConflict } from '@/types';

export const InventoryConflictsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { pendingWrites, isOnline, isSyncing, flush } = useOfflineSync(false);
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['inventory-conflicts'],
    queryFn: () => api.get('/inventory/conflicts').then((response) => response.data),
  });
  const { data: queuedWrites = [], refetch: refetchQueuedWrites } = useQuery({
    queryKey: ['offline-write-queue'],
    queryFn: () => listOfflineWrites(),
  });

  React.useEffect(() => {
    const handleQueueChange = () => {
      queryClient.invalidateQueries({ queryKey: ['offline-write-queue'] });
    };

    window.addEventListener(OFFLINE_QUEUE_EVENT, handleQueueChange);
    return () => window.removeEventListener(OFFLINE_QUEUE_EVENT, handleQueueChange);
  }, [queryClient]);

  const resolveMutation = useMutation({
    mutationFn: (conflictId: string) => api.patch(`/inventory/conflicts/${conflictId}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-conflicts'] });
    },
  });

  const conflicts: SyncConflict[] = data?.data || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0D4035]">Inventory Conflicts</h1>
          <p className="text-sm text-[#64748B]">Offline or sync mismatches are listed here for review and resolution.</p>
        </div>
        <Button
          variant="secondary"
          leftIcon={<RefreshCcw size={16} />}
          loading={isRefetching}
          onClick={() => {
            void refetch();
            void refetchQueuedWrites();
          }}
        >
          Refresh
        </Button>
      </div>

      <Card>
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle size={18} className="mt-0.5 text-[#D97706]" />
          <div className="space-y-1 text-sm text-[#8A4B00]">
            <p className="font-semibold">Offline sync is additive in this first pass.</p>
            <p>Conflicts can be reviewed and marked resolved here while pending local writes wait safely in IndexedDB for reconnection.</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#0D4035]">Pending local queue</p>
            <p className="text-xs text-[#64748B] mt-1">
              {pendingWrites} write{pendingWrites === 1 ? '' : 's'} pending. {isOnline ? 'Connection is available for sync.' : 'Waiting for connectivity.'}
            </p>
          </div>
          <Button
            variant="secondary"
            loading={isSyncing}
            disabled={!isOnline || pendingWrites === 0}
            onClick={async () => {
              await flush();
              await refetchQueuedWrites();
              await refetch();
            }}
          >
            Sync queue now
          </Button>
        </div>

        {queuedWrites.length > 0 && (
          <div className="mt-4 space-y-2">
            {queuedWrites.map((write) => (
              <div key={write.id} className="rounded-2xl border border-[#D6F0E8] bg-[#F8FAFC] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#0D4035]">{write.entityType} / {write.method}</p>
                  <Badge variant="warning" size="sm">QUEUED</Badge>
                </div>
                <p className="mt-1 text-xs text-[#64748B]">{write.url}</p>
                {write.lastError && (
                  <p className="mt-2 text-xs text-[#DC2626]">Last error: {write.lastError}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card padding={false}>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[#64748B]">Loading conflicts...</div>
        ) : conflicts.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B]">No sync conflicts recorded.</div>
        ) : (
          <div className="divide-y divide-[#D6F0E8]">
            {conflicts.map((conflict) => (
              <div key={conflict.id} className="px-5 py-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#0D4035]">{conflict.entityType} / {conflict.conflictType}</p>
                    <p className="text-xs text-[#64748B]">Entity: {conflict.entityId}</p>
                  </div>
                  <Badge variant={conflict.status === 'OPEN' ? 'warning' : 'success'} size="sm">
                    {conflict.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#EDF7F3] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#1A6B5C]">Local payload</p>
                    <pre className="mt-2 text-xs text-[#0D4035] whitespace-pre-wrap break-words">{JSON.stringify(conflict.localPayload, null, 2)}</pre>
                  </div>
                  <div className="rounded-2xl bg-[#F8FAFC] p-3 border border-[#E2E8F0]">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Server payload</p>
                    <pre className="mt-2 text-xs text-[#0D4035] whitespace-pre-wrap break-words">{JSON.stringify(conflict.serverPayload, null, 2)}</pre>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<CheckCircle2 size={14} />}
                    disabled={conflict.status === 'RESOLVED'}
                    loading={resolveMutation.isPending}
                    onClick={() => resolveMutation.mutate(conflict.id)}
                  >
                    Mark Resolved
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
