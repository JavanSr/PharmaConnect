import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { RotateCcw, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';
import type { DispensingEventSummary } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

const money = (value: number) =>
  new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
  }).format(value);

export const DispensingReturnsPage: React.FC = () => {
  const toast = useNotificationStore((state) => state.toast);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeReturnId, setActiveReturnId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('');

  const returnsQuery = useQuery({
    queryKey: ['dispensing-returns', search],
    queryFn: () =>
      api
        .get('/dispensing/events', {
          params: {
            search: search.trim() || undefined,
            limit: 20,
          },
        })
        .then((response) => response.data.data as DispensingEventSummary[]),
  });

  const sortedEvents = useMemo(
    () => (returnsQuery.data ?? []).slice().sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt))),
    [returnsQuery.data],
  );

  const returnMutation = useMutation({
    mutationFn: (eventId: string) =>
      api.post(`/dispensing/returns/${eventId}`, { reason: returnReason.trim() }).then((response) => response.data),
    onSuccess: () => {
      toast.success('Return processed and stock restored');
      setActiveReturnId(null);
      setReturnReason('');
      queryClient.invalidateQueries({ queryKey: ['dispensing-returns'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Return could not be processed');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0D4035]">Dispensing returns</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Search completed receipts, record a return reason, and restore stock through the audited return workflow.
          </p>
        </div>
        <Badge variant="warning" size="sm">Owner or PIC approval only</Badge>
      </div>

      <Card>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            label="Receipt reference"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by RX reference"
          />
          <div className="flex items-end">
            <Button variant="secondary" leftIcon={<Search size={16} />}>
              Search recent sales
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {sortedEvents.length === 0 && (
          <Card>
            <p className="text-sm text-[#64748B]">No dispensing events matched your search yet.</p>
          </Card>
        )}

        {sortedEvents.map((event) => {
          const isOpen = activeReturnId === event.id;
          const isCompleted = event.status === 'COMPLETED';

          return (
            <Card key={event.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[#0D4035]">{event.referenceNumber}</p>
                    <Badge variant={isCompleted ? 'success' : 'muted'} size="sm">
                      {event.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-[#475569]">
                    {money(event.totalAmount)} | {event.itemCount} item{event.itemCount === 1 ? '' : 's'} | {String(event.paymentMethod).replace(/_/g, ' ')}
                  </p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    Sold {format(new Date(event.createdAt), 'dd MMM yyyy HH:mm')}
                  </p>
                  {event.voidReason && (
                    <p className="mt-2 text-xs text-[#92400E]">Return note: {event.voidReason}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {isCompleted ? (
                    <Button
                      size="sm"
                      variant={isOpen ? 'ghost' : 'secondary'}
                      leftIcon={<RotateCcw size={14} />}
                      onClick={() => {
                        setActiveReturnId(isOpen ? null : event.id);
                        setReturnReason('');
                      }}
                    >
                      {isOpen ? 'Cancel return' : 'Start return'}
                    </Button>
                  ) : (
                    <Badge variant="muted" size="sm">Already returned</Badge>
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="mt-4 grid gap-3 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
                  <Input
                    label="Return reason"
                    value={returnReason}
                    onChange={(event) => setReturnReason(event.target.value)}
                    placeholder="Why is this full sale being returned?"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      leftIcon={<RotateCcw size={14} />}
                      loading={returnMutation.isPending}
                      disabled={returnReason.trim().length < 5}
                      onClick={() => returnMutation.mutate(event.id)}
                    >
                      Process return
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
