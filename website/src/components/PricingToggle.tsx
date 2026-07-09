"use client";

import { useState } from "react";
import PricingCard, { type Billing } from "@/components/PricingCard";
import { TIERS } from "@/lib/data/pricing";
import { cn } from "@/lib/utils";

const OPTIONS: { label: string; value: Billing; badge?: string }[] = [
  { label: "Monthly", value: "monthly" },
  { label: "3 months", value: "quarterly" },
  { label: "6 months", value: "semiannual", badge: "Save 8%" },
  { label: "Annual", value: "annual", badge: "2 months free" },
];

export default function PricingToggle() {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <div>
      <div className="inline-flex max-w-full flex-wrap rounded-full border border-slate/10 bg-white p-1">
        {OPTIONS.map((option) => {
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
              {option.badge ? (
                <span className={cn("ml-2 hidden rounded-full px-2 py-0.5 text-xs sm:inline", active ? "bg-white/20" : "bg-primary-light text-primary")}>
                  {option.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-slate/50 lg:hidden">Swipe to compare all four plans →</p>
      <div className="mt-4 snap-x snap-mandatory overflow-x-auto pb-4 pt-5 lg:mt-8 lg:overflow-visible">
        <div className="flex gap-5 lg:grid lg:grid-cols-4">
          {TIERS.map((tier) => (
            <PricingCard billing={billing} key={tier.id} tier={tier} />
          ))}
        </div>
      </div>
    </div>
  );
}
