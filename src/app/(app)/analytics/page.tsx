import { Activity, BarChart3, CalendarClock, FileCheck2, Package2, TrendingDown } from "lucide-react";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

export default async function AnalyticsPage() {
  const user = await requireUser();
  const data = await getDashboardData(user);

  const totalProducts = data.inventorySummary.totalItems;
  const lowStockItems = data.inventorySummary.lowStockItems;
  const nearExpiryItems = data.inventorySummary.expiringSoon;
  const complianceOpen = data.complianceSummary.upcoming + data.complianceSummary.overdue;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Current analytics"
        description="A lightweight Phase 1 view of live inventory and compliance signals."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total products"
          value={totalProducts}
          helper="Active inventory records"
          icon={<Package2 className="h-5 w-5 text-[var(--color-accent)]" />}
        />
        <MetricCard
          label="Low-stock items"
          value={lowStockItems}
          helper="At or below reorder level"
          icon={<TrendingDown className="h-5 w-5 text-[var(--color-accent)]" />}
        />
        <MetricCard
          label="Near-expiry items"
          value={nearExpiryItems}
          helper="Within the configured warning window"
          icon={<CalendarClock className="h-5 w-5 text-[var(--color-accent)]" />}
        />
        <MetricCard
          label="NHIF success rate"
          value="Pending"
          helper="Awaiting formal NHIF API agreement"
          icon={<FileCheck2 className="h-5 w-5 text-[var(--color-accent)]" />}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-ink)]">Operational signals</h3>
              <p className="text-sm text-slate-500">Useful live counts for the current pilot scope.</p>
            </div>
            <Badge tone="success">Phase 1 live</Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {[
              { label: "Open compliance items", value: complianceOpen },
              { label: "Overdue compliance items", value: data.complianceSummary.overdue },
              { label: "Out-of-stock items", value: data.inventorySummary.outOfStock },
              { label: "Published knowledge articles", value: data.publishedArticles },
            ].map((item) => (
              <div key={item.label} className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-soft)] p-4">
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[var(--color-soft)] p-3 text-[var(--color-accent)]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-ink)]">What this includes</h3>
              <p className="text-sm text-slate-500">No separate analytics engine yet.</p>
            </div>
          </div>
          <div className="space-y-3 text-sm leading-6 text-slate-600">
            <p>This page reuses live operational data that already powers inventory, compliance, and dashboard alerts.</p>
            <p>NHIF analytics remains marked as pending until API integration is formally available.</p>
          </div>
          <div className="flex items-center gap-2 rounded-[24px] bg-[var(--color-soft)] p-4 text-sm text-slate-600">
            <Activity className="h-4 w-4 text-[var(--color-accent)]" />
            Simple, current, and safe for Phase 1 demos.
          </div>
        </Card>
      </section>
    </div>
  );
}
