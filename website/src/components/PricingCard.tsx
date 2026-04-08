import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import type { Tier } from "@/lib/data/pricing";
import { cn } from "@/lib/utils";

interface PricingCardProps {
  tier: Tier;
  billing?: "monthly" | "annual";
}

export default function PricingCard({
  tier,
  billing = "monthly",
}: PricingCardProps) {
  const displayedPrice = billing === "annual" ? tier.annualPrice : tier.price;
  const period = billing === "annual" ? "year" : tier.period;

  return (
    <article
      className={cn(
        "min-w-[280px] scroll-ml-4 rounded-lg border bg-white p-6 shadow-sm",
        tier.isPopular ? "border-primary ring-2 ring-primary/15" : "border-slate/10",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-slate">{tier.name}</h3>
          <p className="mt-1 text-sm text-slate/55">{tier.cta}</p>
        </div>
        {tier.isPopular ? <Badge>Most popular</Badge> : null}
      </div>
      <div className="mt-6">
        <span className="font-serif text-4xl font-semibold text-slate">
          {displayedPrice === null
            ? "Structured"
            : displayedPrice === 0
              ? "Free"
              : displayedPrice.toLocaleString("en-US")}
        </span>
        {displayedPrice && displayedPrice > 0 ? (
          <span className="ml-2 text-xs font-semibold text-slate/50">
            {tier.currency}/{period}
          </span>
        ) : null}
      </div>
      {tier.price === null ? (
        <p className="mt-2 text-xs text-slate/50">
          Pricing is structured according to wholesale level.
        </p>
      ) : tier.price > 0 && tier.annualPrice !== null ? (
        <p className="mt-2 text-xs text-slate/50">
          Annual: TZS {tier.annualPrice.toLocaleString("en-US")}/year
        </p>
      ) : null}
      <ul className="mt-6 grid gap-3 text-sm text-slate/70">
        {tier.features.map((feature) => (
          <li className="flex gap-2" key={feature}>
            <span className="font-bold text-primary">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Button className="w-full" href="/contact#waitlist" variant="outline">
          {tier.cta}
        </Button>
      </div>
    </article>
  );
}
