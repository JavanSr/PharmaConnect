import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { appConfig, navItems } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="hidden w-72 shrink-0 flex-col justify-between border-r border-white/10 bg-[var(--color-sidebar)] px-5 py-6 text-white lg:flex">
      <div className="space-y-8">
        <div className="space-y-2 px-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">Digital health</p>
          <h1 className="text-2xl font-semibold tracking-tight">{appConfig.name}</h1>
          <p className="text-sm text-slate-300">{appConfig.region}</p>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/8 hover:text-white",
                  isActive && "bg-white/10 text-white",
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.title}
                </span>
                {item.comingSoon ? <Badge tone="warning">Soon</Badge> : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-semibold">Phase 2 roadmap</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Analytics, patient workflows, and drug-safety support are visible in-product and ready for future activation.
        </p>
      </div>
    </aside>
  );
}
