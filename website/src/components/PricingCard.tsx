import { Check } from "lucide-react";
import Button from "@/components/ui/Button";
import type { Tier } from "@/lib/data/pricing";

export type Billing = "monthly" | "quarterly" | "semiannual" | "annual";

interface PricingCardProps {
  tier: Tier;
  billing: Billing;
}

const CYCLE = {
  monthly: { multiplier: 1, suffix: "/month", note: null },
  quarterly: { multiplier: 3, suffix: "/3 months", note: null },
  semiannual: { multiplier: 5.5, suffix: "/6 months", note: "Save 8% vs monthly" },
  annual: { multiplier: 10, suffix: "/year", note: "2 months free" },
} as const;

export default function PricingCard({ tier, billing }: PricingCardProps) {
  const cycle = CYCLE[billing];
  const listed =
    billing === "annual" ? tier.annualPrice :
    billing === "semiannual" ? tier.semiAnnualPrice :
    billing === "quarterly" ? tier.quarterlyPrice :
    tier.price;
  const price = listed ?? (tier.price === null ? null : Math.round(tier.price * cycle.multiplier));
  const suffix = cycle.suffix;

  return (
    <article
      className={`group relative flex min-w-[280px] snap-start flex-col rounded-2xl border-2 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg lg:min-w-0 ${
        tier.isPopular
          ? "border-primary shadow-[0_4px_24px_rgba(26,107,92,0.15)] hover:shadow-[0_8px_32px_rgba(26,107,92,0.22)]"
          : "border-slate/10 hover:border-primary/30"
      }`}
    >
      {tier.isPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-white whitespace-nowrap">
          Most popular
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate/50">
          {tier.name}
        </h3>
        <div className="mt-3 flex items-end gap-1.5">
          <p className="font-serif text-3xl leading-none text-slate">
            {price === null ? "Custom" : `${price.toLocaleString()} Tsh`}
          </p>
          {price !== null && (
            <span className="pb-0.5 text-sm text-slate/45">{suffix}</span>
          )}
        </div>
        {cycle.note && price !== null && (
          <p className="mt-1.5 text-xs font-medium text-primary">{cycle.note}</p>
        )}
      </div>

      <ul className="mt-5 flex-1 grid gap-2.5">
        {tier.features.map((feature) => (
          <li className="flex items-start gap-2.5" key={feature}>
            <Check className="mt-0.5 shrink-0 text-primary" size={14} />
            <span className="text-sm leading-snug text-slate/65">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 pt-4 border-t border-slate/8">
        <Button
          className="w-full justify-center"
          href="https://app.apotekh.co.tz/register"
          variant={tier.isPopular ? "amber" : "outline"}
        >
          {tier.cta}
        </Button>
      </div>
    </article>
  );
}
