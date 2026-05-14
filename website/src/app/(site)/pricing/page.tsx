import PricingToggle from "@/components/PricingToggle";
import Button from "@/components/ui/Button";
import { WHOLESALE_TIERS } from "@/lib/data/pricing";
import { Check } from "lucide-react";

export const metadata = {
  title: "Pricing - APOTEKH",
  description: "Transparent pricing for Tanzania's pharmacies and ADDOs — from ADDO to multi-branch chains.",
};

const faqs = [
  ["Is this a payments platform?", "No. APOTEKH records payment method for dispensing and reconciliation. It does not process or settle money."],
  ["Does APOTEKH work without internet?", "Yes — APOTEKH is offline-first. Dispensing, stock updates, and safety checks all work without a connection. Every action syncs automatically when connectivity returns."],
  ["What is the Clinical Decision Support Suite?", "It includes drug interaction checking (4 severity levels), contraindication alerts for 8 patient status flags, a dose calculator, NCD usage hints, diagnosis-drug matching, alternative medicine suggestions, and therapeutic equivalence matching. It is available identically across all retail tiers — never gated by price."],
  ["Does APOTEKH store patient names or IDs?", "No. All clinical checks run on an anonymous session. No patient names, national IDs, or personal records are ever stored — this is by design."],
  ["Can I manage multiple pharmacy branches?", "Yes - ADDO includes a single-outlet Owner Dashboard. Basic (2 outlets) through Premium (5 outlets) add multi-outlet Owner Dashboard visibility with live revenue, stock, and compliance status. Enterprise supports unlimited outlets."],
  ["Do prices include implementation support?", "Standard, Premium, and all wholesale/enterprise tiers include full implementation support. Basic includes partial support. ADDO tier is self-service with documentation."],
  ["Are future modules included when they launch?", "Your subscription tier determines which new modules you receive automatically. You will not be charged extra for modules within your tier's scope."],
  ["What happens when the trial ends?", "Accounts convert to paid at the end of the 14-day trial. There are no extensions. If payment is not confirmed, the account suspends until billing is resolved."],
];

export default function PricingPage() {
  return (
    <main className="bg-mist py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">Pricing</p>
        <h1 className="mt-3 font-serif text-5xl font-semibold text-slate">
          Built for Tanzania&apos;s pharmaceutical reality
        </h1>
        <p className="mt-5 max-w-3xl text-slate/70">
          Four retail tiers for pharmacies and ADDOs. Wholesale and enterprise pricing listed separately below.
          Annual billing saves two months.
        </p>
        <div className="mt-10">
          <PricingToggle />
        </div>

        {/* Wholesale — full-width featured section */}
        {WHOLESALE_TIERS.filter((t) => t.id === "wholesale").map((tier) => (
          <section key={tier.id} className="mt-16 rounded-xl bg-primary-dark p-8 text-white">
            <div className="grid gap-10 lg:grid-cols-2">
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary-mid">
                  Wholesale · TZS {tier.price!.toLocaleString()}/month
                </p>
                <h2 className="mt-3 font-serif text-3xl font-semibold">
                  1 outlet · 10 users + delivery staff
                </h2>
                <p className="mt-4 text-white/65">{tier.tagline}</p>

                <div className="mt-8">
                  <Button href="/contact" variant="outline">{tier.cta}</Button>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white/40">
                  Features
                </p>
                <ul className="mt-3 grid gap-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-white/75">
                      <Check className="mt-0.5 shrink-0 text-primary-mid" size={14} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))}

        {/* Hybrid & Enterprise */}
        <section className="mt-8">
          <div className="grid gap-5 md:grid-cols-2">
            {WHOLESALE_TIERS.filter((t) => t.id !== "wholesale").map((tier) => (
              <article key={tier.id} className="rounded-xl border border-slate/10 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate">{tier.name}</h3>
                <p className="mt-1 text-sm text-slate/55">{tier.tagline}</p>
                <p className="mt-4 font-serif text-3xl leading-none text-slate">
                  {tier.price === null ? "Negotiated" : `${tier.price.toLocaleString()} TZS`}
                  {tier.price !== null && (
                    <span className="ml-1 text-base font-sans font-normal text-slate/45">/month</span>
                  )}
                </p>
                <ul className="mt-5 grid gap-2.5">
                  {tier.features.map((feature) => (
                    <li className="flex items-start gap-2.5 text-sm text-slate/70" key={feature}>
                      <Check className="mt-0.5 shrink-0 text-primary" size={14} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Button href="/contact" size="sm" variant="outline">{tier.cta}</Button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-16 grid gap-4">
          <h2 className="text-2xl font-semibold text-slate">Common questions</h2>
          {faqs.map(([question, answer]) => (
            <details className="rounded-xl bg-white p-5 shadow-sm" key={question}>
              <summary className="cursor-pointer font-semibold text-slate">{question}</summary>
              <p className="mt-3 text-sm leading-7 text-slate/65">{answer}</p>
            </details>
          ))}
        </section>

        {/* CTA */}
        <section className="mt-16 rounded-xl bg-primary-dark p-8 text-white">
          <h2 className="font-serif text-3xl font-semibold">Ready to get started?</h2>
          <p className="mt-3 text-white/70">Tell us about your pharmacy and we will respond within 48 hours.</p>
          <div className="mt-6">
            <Button href="/contact#waitlist" variant="outline">Get access</Button>
          </div>
        </section>
      </div>
    </main>
  );
}
