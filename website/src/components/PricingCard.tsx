import { Check } from "lucide-react";
import Button from "@/components/ui/Button";
import type { Tier } from "@/lib/data/pricing";

interface PricingCardProps {
  tier: Tier;
  billing: "monthly" | "annual";
}

export default function PricingCard({ tier, billing }: PricingCardProps) {
  const annualPrice = tier.price === null ? null : tier.price * 11;
  const price = billing === "annual" ? (tier.annualPrice ?? annualPrice) : tier.price;
  const suffix = billing === "annual" ? "/year" : "/month";

  return (
    <article
      className={`relative min-w-[280px] snap-start rounded-2xl border-2 bg-white p-6 ${
        tier.isPopular ? "border-primary shadow-card" : "border-slate/10"
      }`}
    >
      {tier.isPopular ? (
        <div className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
          Most popular
        </div>
      ) : null}
      <h3 className="text-base font-medium text-slate">{tier.name}</h3>
      <div className="mt-4 flex items-end gap-2">
        <p className="font-serif text-4xl leading-none text-slate">
          {price === null ? "Custom pricing" : `${price.toLocaleString()} Tsh`}
        </p>
        <span className="pb-1 text-sm text-slate/50">{price === null ? "" : suffix}</span>
      </div>
      {billing === "annual" && price !== null ? (
        <p className="mt-2 text-xs text-primary">2 months free vs monthly</p>
      ) : null}
      <ul className="mt-6 grid gap-3">
        {tier.features.map((feature) => (
          <li className="flex items-start gap-3 text-sm text-slate/70" key={feature}>
            <Check className="mt-1 flex-shrink-0 text-primary" size={16} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Button href="/contact#waitlist" variant={tier.isPopular ? "primary" : "outline"}>
          {tier.cta}
        </Button>
      </div>
    </article>
  );
}
