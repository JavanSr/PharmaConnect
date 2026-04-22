import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import type { WholesaleOrder } from '@/types';
import { WholesaleShell } from '@/modules/wholesale/WholesaleShell';

export const OrdersPage: React.FC = () => {
  const ordersQuery = useQuery({
    queryKey: ['buyer-orders'],
    queryFn: () => api.get('/b2b/orders').then((response) => response.data.data as WholesaleOrder[]),
  });

  return (
    <WholesaleShell>
      <Card header={<h2 className="text-xl font-semibold text-[#0D4035]">Wholesale orders</h2>}>
        <div className="space-y-3">
          {(ordersQuery.data ?? []).map((order) => (
            <div key={order.id} className="rounded-2xl border border-[#D6F0E8] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-[#0D4035]">{order.orderNumber}</p>
                  <p className="text-sm text-[#64748B]">TZS {order.totalAmount.toFixed(2)}</p>
                  <p className="text-xs text-[#94A3B8]">{order.items.length} line items</p>
                </div>
                <span className="rounded-full bg-[#EDF7F3] px-3 py-1 text-xs font-semibold text-[#0D4035]">{order.status}</span>
              </div>
            </div>
          ))}
          {ordersQuery.data?.length === 0 && <p className="text-sm text-[#64748B]">No orders yet.</p>}
        </div>
      </Card>
    </WholesaleShell>
  );
};
