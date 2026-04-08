import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "mark" | "white";
  className?: string;
}

const sizes = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
};

export default function Logo({
  size = "md",
  variant = "full",
  className,
}: LogoProps) {
  const markSize = sizes[size];
  const white = variant === "white";
  const showWordmark = variant !== "mark";
  const crossFill = white ? "#FFFFFF" : "var(--pc-primary-dark)";
  const centerFill = white ? "transparent" : "#FFFFFF";
  const centerStroke = white ? "rgba(255,255,255,.45)" : "var(--pc-primary-mid)";

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <svg
        aria-hidden="true"
        width={markSize}
        height={markSize}
        viewBox="0 0 120 120"
        fill="none"
        className="shrink-0"
      >
        <rect x="52" y="8" width="16" height="104" rx="2" fill={crossFill} />
        <rect x="8" y="52" width="104" height="16" rx="2" fill={crossFill} />
        <circle cx="60" cy="16" r="8" fill={crossFill} />
        <circle cx="60" cy="104" r="8" fill={crossFill} />
        <circle cx="16" cy="60" r="8" fill={crossFill} />
        <circle cx="104" cy="60" r="8" fill={crossFill} />
        <circle
          cx="60"
          cy="60"
          r="11"
          fill={centerFill}
          stroke={centerStroke}
          strokeWidth="2.5"
        />
      </svg>
      {showWordmark ? (
        <span
          className="text-[1.1rem] font-semibold leading-none"
          style={{ letterSpacing: "-0.5px" }}
        >
          <span className={white ? "text-white" : "text-primary-dark"}>
            Pharma
          </span>
          <span className={white ? "text-white/80" : "text-primary-mid"}>
            Connect
          </span>
        </span>
      ) : null}
      <span className="sr-only">PharmaConnect</span>
    </div>
  );
}

export function LogoFavicon() {
  return (
    <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <rect width="120" height="120" rx="20" fill="var(--pc-primary)" />
      <rect x="52" y="8" width="16" height="104" rx="2" fill="#FFFFFF" />
      <rect x="8" y="52" width="104" height="16" rx="2" fill="#FFFFFF" />
      <circle cx="60" cy="16" r="8" fill="#FFFFFF" />
      <circle cx="60" cy="104" r="8" fill="#FFFFFF" />
      <circle cx="16" cy="60" r="8" fill="#FFFFFF" />
      <circle cx="104" cy="60" r="8" fill="#FFFFFF" />
      <circle
        cx="60"
        cy="60"
        r="11"
        fill="var(--pc-primary)"
        stroke="rgba(255,255,255,.35)"
        strokeWidth="2.5"
      />
    </svg>
  );
}
