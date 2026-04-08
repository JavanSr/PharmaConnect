import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function ComingSoonCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full space-y-4 transition hover:-translate-y-0.5 hover:border-[var(--color-accent)]/30">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-[var(--color-ink)]">{title}</h3>
          <Badge tone="warning">Coming Soon</Badge>
        </div>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-accent)]">
          Explore roadmap
          <ArrowRight className="h-4 w-4" />
        </div>
      </Card>
    </Link>
  );
}
