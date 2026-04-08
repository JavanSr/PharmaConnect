import { ComplianceStatus } from "@prisma/client";
import { eachDayOfInterval, endOfWeek, format, isSameDay, startOfWeek } from "date-fns";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { getEffectiveComplianceStatus } from "@/lib/utils";

export function ComplianceCalendar({
  items,
  range,
}: {
  items: Array<{ id: string; title: string; deadlineDate: Date; status: ComplianceStatus }>;
  range: { start: Date; end: Date };
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(range.start, { weekStartsOn: 1 }),
    end: endOfWeek(range.end, { weekStartsOn: 1 }),
  });

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-ink)]">Calendar view</h3>
        <p className="text-sm text-slate-500">Current-month compliance deadlines and overdue items.</p>
      </div>
      <div className="grid grid-cols-7 gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day} className="px-2 py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-7">
        {days.map((day) => {
          const dayItems = items.filter((item) => isSameDay(item.deadlineDate, day));

          return (
            <div key={day.toISOString()} className="min-h-36 rounded-3xl border border-[var(--color-border)] bg-[var(--color-soft)] p-3">
              <p className="text-sm font-semibold text-[var(--color-ink)]">{format(day, "d MMM")}</p>
              <div className="mt-3 space-y-2">
                {dayItems.length === 0 ? (
                  <p className="text-xs text-slate-400">No deadlines</p>
                ) : (
                  dayItems.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-white p-2">
                      <p className="text-xs font-medium text-[var(--color-ink)]">{item.title}</p>
                      <div className="mt-2">
                        <StatusBadge status={getEffectiveComplianceStatus(item)} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
