import Link from "next/link";
import { Plus } from "lucide-react";
import { deleteComplianceItemAction } from "@/actions/compliance";
import { ComplianceCalendar } from "@/components/compliance/calendar";
import { EmptyState } from "@/components/shared/empty-state";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireUser } from "@/lib/auth";
import { getComplianceData } from "@/lib/data";
import { canManageCompliance } from "@/lib/permissions";
import { formatLongDate, getDeadlineLabel, getEffectiveComplianceStatus } from "@/lib/utils";

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; view?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const data = await getComplianceData(user, params);
  const canManage = canManageCompliance(user.role);
  const view = params.view === "calendar" ? "calendar" : "list";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Regulatory compliance tracker"
        description="Keep pharmacy renewals, inspections, and documentation deadlines visible so teams can avoid preventable lapses."
        actions={
          canManage ? (
            <Link href="/compliance/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add item
              </Button>
            </Link>
          ) : undefined
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Upcoming deadlines" value={data.summary.upcoming} helper="Pending items still on track" />
        <MetricCard label="Overdue items" value={data.summary.overdue} helper="Past due and not completed" />
        <MetricCard label="Completed" value={data.summary.completed} helper="Closed compliance tasks" />
        <MetricCard
          label="Next reminder"
          value={data.summary.nextReminder ? formatLongDate(data.summary.nextReminder.reminderDate) : "None"}
          helper={data.summary.nextReminder ? data.summary.nextReminder.title : "No reminder within 14 days"}
        />
      </section>

      <Card>
        <form className="grid gap-4 lg:grid-cols-[1fr_180px_180px_auto]">
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Search by title, category, or authority" />
          <Select name="status" defaultValue={params.status ?? "all"}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </Select>
          <Select name="view" defaultValue={view}>
            <option value="list">List view</option>
            <option value="calendar">Calendar view</option>
          </Select>
          <Button type="submit" variant="secondary">
            Update view
          </Button>
        </form>
      </Card>

      {view === "calendar" ? (
        <ComplianceCalendar
          items={data.items.map((item) => ({
            id: item.id,
            title: item.title,
            deadlineDate: item.deadlineDate,
            status: item.status,
          }))}
          range={data.calendarRange}
        />
      ) : (
        <Card className="overflow-hidden p-0">
          {data.items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No compliance items found"
                description="Create the first deadline or change the filters to see more records."
                actionLabel={canManage ? "Add item" : undefined}
                actionHref={canManage ? "/compliance/new" : undefined}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--color-soft)] text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-medium">Item</th>
                    <th className="px-5 py-4 font-medium">Authority</th>
                    <th className="px-5 py-4 font-medium">Deadline</th>
                    <th className="px-5 py-4 font-medium">Reminder</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                    <th className="px-5 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id} className="border-t border-[var(--color-border)]">
                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold text-[var(--color-ink)]">{item.title}</p>
                        <p className="text-slate-500">{item.category}</p>
                        {item.notes ? <p className="mt-1 text-xs text-slate-400">{item.notes}</p> : null}
                      </td>
                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold text-[var(--color-ink)]">{item.authority}</p>
                        <p className="text-slate-500">Created by {item.createdBy.name}</p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold text-[var(--color-ink)]">{formatLongDate(item.deadlineDate)}</p>
                        <p className="text-slate-500">{getDeadlineLabel(item.deadlineDate)}</p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold text-[var(--color-ink)]">{formatLongDate(item.reminderDate)}</p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <StatusBadge status={getEffectiveComplianceStatus(item)} />
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          {canManage ? (
                            <>
                              <Link href={`/compliance/${item.id}/edit`}>
                                <Button variant="secondary">Edit</Button>
                              </Link>
                              <form action={deleteComplianceItemAction.bind(null, item.id)}>
                                <Button type="submit" variant="ghost">
                                  Delete
                                </Button>
                              </form>
                            </>
                          ) : (
                            <span className="text-slate-400">View only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
