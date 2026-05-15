import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type { VatInvoice, WholesaleOrder } from '@/types';
import { WholesaleShell } from '@/modules/wholesale/WholesaleShell';

export const OrdersPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const toast = useNotificationStore((state) => state.toast);
  const queryClient = useQueryClient();
  const canScheduleDelivery = ['OWNER', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF', 'SUPER_ADMIN'].includes(user?.role ?? '');
  const [drafts, setDrafts] = React.useState<Record<string, { scheduledDeliveryAt: string; deliveryWindowLabel: string; deliveryNote: string }>>({});

  const ordersQuery = useQuery({
    queryKey: ['buyer-orders'],
    queryFn: () => api.get('/b2b/orders').then((response) => response.data.data as WholesaleOrder[]),
  });
  const invoicesQuery = useQuery({
    queryKey: ['wholesale-invoices'],
    queryFn: () => api.get('/b2b/invoices').then((response) => response.data.data as VatInvoice[]),
  });
  const scheduleDeliveryMutation = useMutation({
    mutationFn: async (payload: { orderId: string; scheduledDeliveryAt: string; deliveryWindowLabel: string; deliveryNote: string }) => {
      const response = await api.patch(`/b2b/orders/${payload.orderId}/delivery-schedule`, payload);
      return response.data.data as WholesaleOrder;
    },
    onSuccess: () => {
      toast.success('Delivery schedule saved');
      queryClient.invalidateQueries({ queryKey: ['buyer-orders'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Could not save delivery schedule');
    },
  });

  const invoiceByOrderId = new Map((invoicesQuery.data ?? []).map((invoice) => [invoice.orderId, invoice]));

  return (
    <WholesaleShell>
      <Card header={<h2 className="text-xl font-semibold text-[#0D4035]">Wholesale orders</h2>}>
        <div className="space-y-3">
          {(ordersQuery.data ?? []).map((order) => (
            <div key={order.id} className="rounded-2xl border border-[#D6F0E8] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-[#0D4035]">{order.orderNumber}</p>
                  <p className="text-sm text-[#64748B]">Tsh {order.totalAmount.toFixed(2)}</p>
                  <p className="text-xs text-[#94A3B8]">{order.items.length} line items</p>
                  {order.scheduledDeliveryAt && (
                    <p className="mt-1 text-xs text-[#64748B]">
                      Scheduled {new Date(order.scheduledDeliveryAt).toLocaleString()}
                      {order.deliveryWindowLabel ? ` · ${order.deliveryWindowLabel}` : ''}
                    </p>
                  )}
                  {order.deliveryNote && <p className="text-xs text-[#94A3B8]">{order.deliveryNote}</p>}
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-[#EDF7F3] px-3 py-1 text-xs font-semibold text-[#0D4035]">{order.status}</span>
                  {invoiceByOrderId.get(order.id)?.efdmsStatus && <p className="mt-2 text-xs font-medium text-[#B45309]">Invoice {invoiceByOrderId.get(order.id)?.efdmsStatus}</p>}
                </div>
              </div>

              {canScheduleDelivery && (
                <div className="mt-4 grid gap-3 rounded-2xl border border-[#E5F2ED] bg-[#F7FCFA] p-4 lg:grid-cols-[1.1fr_0.9fr_1.2fr_auto]">
                  <Input
                    label="Scheduled delivery"
                    type="datetime-local"
                    value={drafts[order.id]?.scheduledDeliveryAt ?? (order.scheduledDeliveryAt ? order.scheduledDeliveryAt.slice(0, 16) : '')}
                    onChange={(event) => setDrafts((current) => ({
                      ...current,
                      [order.id]: {
                        scheduledDeliveryAt: event.target.value,
                        deliveryWindowLabel: current[order.id]?.deliveryWindowLabel ?? order.deliveryWindowLabel ?? '',
                        deliveryNote: current[order.id]?.deliveryNote ?? order.deliveryNote ?? '',
                      },
                    }))}
                  />
                  <Input
                    label="Window"
                    placeholder="Morning route"
                    value={drafts[order.id]?.deliveryWindowLabel ?? order.deliveryWindowLabel ?? ''}
                    onChange={(event) => setDrafts((current) => ({
                      ...current,
                      [order.id]: {
                        scheduledDeliveryAt: current[order.id]?.scheduledDeliveryAt ?? (order.scheduledDeliveryAt ? order.scheduledDeliveryAt.slice(0, 16) : ''),
                        deliveryWindowLabel: event.target.value,
                        deliveryNote: current[order.id]?.deliveryNote ?? order.deliveryNote ?? '',
                      },
                    }))}
                  />
                  <Input
                    label="Delivery note"
                    placeholder="Leave at receiving desk"
                    value={drafts[order.id]?.deliveryNote ?? order.deliveryNote ?? ''}
                    onChange={(event) => setDrafts((current) => ({
                      ...current,
                      [order.id]: {
                        scheduledDeliveryAt: current[order.id]?.scheduledDeliveryAt ?? (order.scheduledDeliveryAt ? order.scheduledDeliveryAt.slice(0, 16) : ''),
                        deliveryWindowLabel: current[order.id]?.deliveryWindowLabel ?? order.deliveryWindowLabel ?? '',
                        deliveryNote: event.target.value,
                      },
                    }))}
                  />
                  <div className="flex items-end">
                    <Button
                      onClick={() => scheduleDeliveryMutation.mutate({
                        orderId: order.id,
                        scheduledDeliveryAt: drafts[order.id]?.scheduledDeliveryAt ?? (order.scheduledDeliveryAt ? order.scheduledDeliveryAt.slice(0, 16) : ''),
                        deliveryWindowLabel: drafts[order.id]?.deliveryWindowLabel ?? order.deliveryWindowLabel ?? '',
                        deliveryNote: drafts[order.id]?.deliveryNote ?? order.deliveryNote ?? '',
                      })}
                      loading={scheduleDeliveryMutation.isPending}
                    >
                      Save schedule
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {ordersQuery.data?.length === 0 && <p className="text-sm text-[#64748B]">No orders yet.</p>}
        </div>
      </Card>
    </WholesaleShell>
  );
};
