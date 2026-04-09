import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}

const variants = {
  primary: "bg-primary text-white hover:bg-primary-dark",
  ghost: "bg-transparent text-primary hover:bg-primary-light",
  outline: "border border-primary bg-white text-primary hover:bg-primary-light",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export default function Button({
  variant = "primary",
  size = "md",
  children,
  href,
  onClick,
  type = "button",
  disabled,
  className,
}: ButtonProps) {
  const classNameValue = cn(
    "inline-flex items-center justify-center rounded-lg font-semibold transition duration-150 disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );

  if (href) {
    return (
      <Link className={classNameValue} href={href} aria-disabled={disabled}>
        {children}
      </Link>
    );
  }

  return (
    <button
      className={classNameValue}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}
