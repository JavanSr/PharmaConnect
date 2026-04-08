import Link from "next/link";
import { AlertTriangle, CalendarClock, PillBottle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatLongDate } from "@/lib/utils";

export function AlertsPanel({
  inventoryAlerts,
  complianceAlerts,
}: {
  inventoryAlerts: {
    lowStockItems: Array<{ id: string; productName: string; quantity: number; reorderLevel: number }>;
    expiringSoon: Array<{ id: string; productName: string; expiryDate: Date }>;
  };
  complianceAlerts: {
    upcomingCompliance: Array<{ id: string; title: string; deadlineDate: Date }>;
    overdueCompliance: Array<{ id: string; title: string; deadlineDate: Date }>;
  };
}) {
  return (
    <Card className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-ink)]">Operational alerts</h3>
          <p className="text-sm text-slate-500">Live issues that need attention this week.</p>
        </div>
        <AlertTriangle className="h-5 w-5 text-[var(--color-accent)]" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-3 rounded-3xl bg-[var(--color-soft)] p-4">
          <div className="flex items-center gap-2">
            <PillBottle className="h-4 w-4 text-[var(--color-accent)]" />
            <p className="font-semibold text-[var(--color-ink)]">Inventory alerts</p>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            {inventoryAlerts.lowStockItems.map((item) => (
              <Link key={item.id} href="/inventory" className="block rounded-2xl bg-white p-3 hover:border-[var(--color-accent)]">
                <p className="font-medium text-[var(--color-ink)]">{item.productName}</p>
                <p>Low stock: {item.quantity} units left vs reorder level {item.reorderLevel}.</p>
              </Link>
            ))}
            {inventoryAlerts.expiringSoon.map((item) => (
              <Link key={item.id} href="/inventory" className="block rounded-2xl bg-white p-3">
                <p className="font-medium text-[var(--color-ink)]">{item.productName}</p>
                <p>Near expiry on {formatLongDate(item.expiryDate)}.</p>
              </Link>
            ))}
            {inventoryAlerts.lowStockItems.length === 0 && inventoryAlerts.expiringSoon.length === 0 ? (
              <p>No inventory alerts right now.</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 rounded-3xl bg-[var(--color-soft)] p-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-[var(--color-accent)]" />
            <p className="font-semibold text-[var(--color-ink)]">Compliance alerts</p>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            {complianceAlerts.overdueCompliance.map((item) => (
              <Link key={item.id} href="/compliance?status=overdue" className="block rounded-2xl bg-white p-3">
                <p className="font-medium text-[var(--color-ink)]">{item.title}</p>
                <p>Overdue since {formatLongDate(item.deadlineDate)}.</p>
              </Link>
            ))}
            {complianceAlerts.upcomingCompliance.map((item) => (
              <Link key={item.id} href="/compliance?status=pending" className="block rounded-2xl bg-white p-3">
                <p className="font-medium text-[var(--color-ink)]">{item.title}</p>
                <p>Upcoming deadline on {formatLongDate(item.deadlineDate)}.</p>
              </Link>
            ))}
            {complianceAlerts.overdueCompliance.length === 0 &&
            complianceAlerts.upcomingCompliance.length === 0 ? (
              <p>No compliance alerts right now.</p>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
