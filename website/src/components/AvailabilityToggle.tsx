"use client";

import { cn } from "@/lib/utils";

interface AvailabilityToggleProps {
  activeAvailability: "all" | "now" | "future";
  onChange: (availability: "all" | "now" | "future") => void;
}

const options = [
  { label: "All", value: "all" },
  { label: "Available now", value: "now" },
  { label: "Future availability", value: "future" },
] as const;

export default function AvailabilityToggle({
  activeAvailability,
  onChange,
}: AvailabilityToggleProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = activeAvailability === option.value;
        return (
          <button
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition",
              active
                ? "border-primary bg-primary text-white"
                : "border-slate/10 bg-white text-slate/60 hover:text-primary",
            )}
            key={option.label}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
