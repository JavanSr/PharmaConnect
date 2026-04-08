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
        {(["monthly", "annual"] as const).map((option) => (
          <button
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold capitalize transition",
              billing === option
                ? "bg-primary text-white"
                : "text-slate/55 hover:text-primary",
            )}
            key={option}
            onClick={() => setBilling(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
      <div className="mt-8 flex snap-x gap-5 overflow-x-auto pb-4 lg:grid lg:grid-cols-5 lg:overflow-visible">
        {TIERS.map((tier) => (
          <PricingCard billing={billing} key={tier.id} tier={tier} />
        ))}
      </div>
    </div>
  );
}
