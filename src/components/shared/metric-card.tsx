import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon}
      </div>
      <div>
        <p className="text-3xl font-semibold tracking-tight text-[var(--color-ink)]">{value}</p>
        <p className="mt-2 text-sm text-slate-500">{helper}</p>
      </div>
    </Card>
  );
}
