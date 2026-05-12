import Image from "next/image";
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

export default function Logo({
  size = "md",
  variant = "full",
  className,
}: LogoProps) {
  const markSize = sizeMap[size];
  const isWhite = variant === "white";
  const markSrc = isWhite
    ? "/assets/logo/apotekh-mark-dark.svg"
    : "/assets/logo/apotekh-mark-light.svg";

  if (variant === "mark") {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <Image
          src={markSrc}
          alt="APOTEKH"
          height={markSize}
          width={markSize}
          className="block h-auto shrink-0"
          unoptimized
        />
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src={markSrc}
        alt="APOTEKH"
        height={markSize}
        width={markSize}
        className="block h-auto shrink-0"
        unoptimized
      />
      <span
        className={cn(
          "inline-flex items-baseline gap-0 font-sans font-extrabold leading-none tracking-normal",
          size === "sm" && "text-[1.15rem]",
          size === "md" && "text-[1.55rem]",
          size === "lg" && "text-[2.35rem]",
          size === "xl" && "text-[3rem]",
        )}
        aria-hidden="true"
      >
        <span className={isWhite ? "text-white" : "text-[#0D4035]"}>APOTEK</span>
        <span className="-ml-[0.015em] text-[#7ECFB4]">H</span>
      </span>
    </span>
  );
}
