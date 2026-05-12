import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "mark" | "white";
  className?: string;
}

const sizeMap = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
};

function NexusCross({ color, ringColor }: { color: string; ringColor: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" className="h-full w-full">
      <rect x="43.3" y="6.7" width="13.3" height="86.6" rx="1.7" fill={color} />
      <rect x="6.7" y="43.3" width="86.6" height="13.3" rx="1.7" fill={color} />
      <circle cx="50" cy="13.3" r="6.7" fill={color} />
      <circle cx="50" cy="86.7" r="6.7" fill={color} />
      <circle cx="13.3" cy="50" r="6.7" fill={color} />
      <circle cx="86.7" cy="50" r="6.7" fill={color} />
      <circle cx="50" cy="50" r="9.2" fill="none" stroke={ringColor} strokeWidth="2" />
    </svg>
  );
}

export default function Logo({
  size = "md",
  variant = "full",
  className,
}: LogoProps) {
  const markSize = sizeMap[size];
  const isWhite = variant === "white";
  const markColor = isWhite ? "#FFFFFF" : "#1A6B5C";
  const ringColor = "rgba(255,255,255,0.35)";
  const pharmaColor = isWhite ? "#FFFFFF" : "#0D4035";
  const connectColor = isWhite ? "#FFFFFF" : "#2A9478";

  if (variant === "mark") {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <span style={{ height: markSize, width: markSize }}>
          <NexusCross color={markColor} ringColor={ringColor} />
        </span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span style={{ height: markSize, width: markSize }}>
        <NexusCross color={markColor} ringColor={ringColor} />
      </span>
      <span
        className="font-serif text-[clamp(1rem,2vw,2rem)] leading-none"
        style={{ letterSpacing: "-0.5px" }}
      >
        <span style={{ color: pharmaColor }}>Pharma</span>
        <span style={{ color: connectColor }}>Connect</span>
      </span>
    </span>
  );
}
