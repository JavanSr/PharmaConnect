import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type BadgeVariant =
  | "primary"
  | "amber"
  | "slate"
  | "muted"
  | "coming-soon"
  | "new"
  | "warning"
  | "sponsored";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  primary: "bg-primary text-white",
  amber: "bg-amber text-white",
  slate: "bg-slate text-white",
  muted: "bg-slate/50 text-white",
  "coming-soon": "bg-slate/80 text-white",
  new: "bg-green-600 text-white",
  warning: "bg-amber text-white",
  sponsored: "bg-amber text-white",
};

export default function Badge({
  variant = "primary",
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none",
        variants[variant],
        className,
      )}
    >
      {variant === "sponsored" ? <Lock className="mr-1 flex-shrink-0" size={10} /> : null}
      {children}
    </span>
  );
}
