"use client";

import { useState } from "react";
import PricingCard from "@/components/PricingCard";
import { TIERS } from "@/lib/data/pricing";
import { cn } from "@/lib/utils";

export default function PricingToggle() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  return (
    <div>
      <div className="inline-flex rounded-full border border-slate/10 bg-white p-1">
        {[
          { label: "Monthly", value: "monthly" as const },
          { label: "Annual", value: "annual" as const },
        ].map((option) => {
          const active = option.value === billing;
          return (
            <button
              className={cn(
                "min-h-11 rounded-full px-4 text-sm font-medium transition",
                active ? "bg-primary text-white" : "text-slate/60 hover:text-primary",
              )}
              key={option.value}
              onClick={() => setBilling(option.value)}
              type="button"
            >
              {option.label}
              {option.value === "annual" ? (
                <span className={cn("ml-2 rounded-full px-2 py-0.5 text-xs", active ? "bg-white/20" : "bg-primary-light text-primary")}>
                  Save ~9%
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="mt-8 overflow-x-auto pb-4 pt-5">
        <div className="flex snap-x snap-mandatory gap-5 lg:grid lg:grid-cols-4 lg:overflow-visible">
          {TIERS.map((tier) => (
            <PricingCard billing={billing} key={tier.id} tier={tier} />
          ))}
        </div>
      </div>
    </div>
  );
}
