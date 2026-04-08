import Link from "next/link";
import { BookOpenText, CalendarClock, LayoutDashboard, Package2, Plus } from "lucide-react";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { ComingSoonCard } from "@/components/shared/coming-soon-card";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { appConfig, comingSoonModules } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
import { formatLongDate } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational dashboard"
        description="A focused control center for the Arusha pilot, combining inventory visibility, regulatory tracking, and the latest knowledge content."
        actions={
          <>
            <Link href="/inventory/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add product
              </Button>
            </Link>
            <Link href="/compliance/new">
              <Button variant="secondary">Add compliance item</Button>
            </Link>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total inventory items" value={data.inventorySummary.totalItems} helper="Live products in active stock" icon={<Package2 className="h-5 w-5 text-[var(--color-accent)]" />} />
        <MetricCard label="Low stock items" value={data.inventorySummary.lowStockItems} helper="At or below reorder level" icon={<LayoutDashboard className="h-5 w-5 text-[var(--color-accent)]" />} />
        <MetricCard label="Upcoming compliance" value={data.complianceSummary.upcoming} helper="Deadlines still pending" icon={<CalendarClock className="h-5 w-5 text-[var(--color-accent)]" />} />
        <MetricCard label="Published articles" value={data.publishedArticles} helper="Knowledge Hub content available" icon={<BookOpenText className="h-5 w-5 text-[var(--color-accent)]" />} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <AlertsPanel
          inventoryAlerts={{
            lowStockItems: data.alerts.lowStockItems,
            expiringSoon: data.alerts.expiringSoon,
          }}
          complianceAlerts={{
            upcomingCompliance: data.alerts.upcomingCompliance,
            overdueCompliance: data.alerts.overdueCompliance,
          }}
        />

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-ink)]">Featured article</h3>
              <p className="text-sm text-slate-500">Highlighted guidance from the Knowledge Hub.</p>
            </div>
            <Badge tone="info">{appConfig.region}</Badge>
          </div>
          {data.featuredArticle ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                  {formatLongDate(data.featuredArticle.updatedAt)}
                </p>
                <h4 className="text-xl font-semibold tracking-tight text-[var(--color-ink)]">
                  {data.featuredArticle.title}
                </h4>
                <p className="text-sm leading-6 text-slate-600">{data.featuredArticle.summary}</p>
              </div>
              <Link href={`/knowledge-hub/${data.featuredArticle.id}`}>
                <Button variant="secondary">Read article</Button>
              </Link>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No featured article published yet.</p>
          )}
        </Card>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-ink)]">Active modules</h3>
              <p className="text-sm text-slate-500">Phase 1 is fully functional and demo-ready.</p>
            </div>
            <Badge tone="success">Phase 1 live</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Inventory",
                body: "Track stock, expiry, reorder levels, and recent movements.",
                href: "/inventory",
              },
              {
                title: "Knowledge Hub",
                body: "Publish operational guidance, regulatory updates, and safety content.",
                href: "/knowledge-hub",
              },
              {
                title: "Compliance Tracker",
                body: "Monitor renewals, reminder dates, and overdue tasks.",
                href: "/compliance",
              },
              {
                title: "Analytics",
                body: "Review current stock, expiry, and compliance signals.",
                href: "/analytics",
              },
            ].map((module) => (
              <Link key={module.href} href={module.href}>
                <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-soft)] p-5 transition hover:-translate-y-0.5">
                  <h4 className="text-lg font-semibold text-[var(--color-ink)]">{module.title}</h4>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{module.body}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-ink)]">Coming Soon</h3>
            <p className="text-sm text-slate-500">Phase 2 modules are positioned in-product for partner and investor demos.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            {comingSoonModules.map((module) => (
              <ComingSoonCard key={module.href} {...module} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
