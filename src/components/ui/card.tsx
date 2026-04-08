import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-[var(--color-border)] bg-white p-6 shadow-[0_16px_40px_rgba(9,34,44,0.06)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
