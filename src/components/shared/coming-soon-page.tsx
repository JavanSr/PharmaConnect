import { ArrowUpRight, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ComingSoonPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="relative overflow-hidden border-[var(--color-accent)]/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(233,246,247,0.95))]">
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[var(--color-accent)]/10 blur-3xl" />
      <div className="relative space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="warning">Coming Soon</Badge>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock3 className="h-4 w-4" />
            Planned for Phase 2 activation
          </div>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-ink)]">{title}</h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">{description}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--color-ink)]">Business value</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This module is intentionally visible now so pilot pharmacies and future partners can see the platform
              roadmap without introducing unfinished workflows into Phase 1.
            </p>
          </div>
          <div className="rounded-3xl bg-white/80 p-5">
            <p className="text-sm font-semibold text-[var(--color-ink)]">Ready for future plug-in</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Navigation, dashboard placement, and product positioning are already in place so engineering work can plug
              into a stable shell later.
            </p>
          </div>
        </div>
        <a href="mailto:hello@pharmaconnect.tz?subject=PharmaConnect Early Access">
          <Button>
            Request Early Access
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </a>
      </div>
    </Card>
  );
}
