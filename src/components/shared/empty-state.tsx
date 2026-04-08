import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <Card className="flex flex-col items-start gap-4 border-dashed bg-[var(--color-soft)]/65">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-[var(--color-ink)]">{title}</h3>
        <p className="max-w-xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {actionLabel && actionHref ? (
        <Link href={actionHref}>
          <Button>{actionLabel}</Button>
        </Link>
      ) : null}
    </Card>
  );
}
