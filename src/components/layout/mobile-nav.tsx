import Link from "next/link";
import { navItems } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function MobileNav({ pathname }: { pathname: string }) {
  return (
    <div className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="flex gap-2 overflow-x-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-2 text-sm font-medium",
              pathname === item.href
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                : "border-[var(--color-border)] bg-white text-slate-600",
            )}
          >
            {item.title}
            {item.comingSoon ? " • Soon" : ""}
          </Link>
        ))}
      </div>
    </div>
  );
}
