import PlatformGrid from "@/components/PlatformGrid";
import StatCard from "@/components/ui/StatCard";
import AnimatedSection from "@/components/ui/AnimatedSection";
import Button from "@/components/ui/Button";
import { MODULES } from "@/lib/data/modules";

export const metadata = {
  title: "Platform - APOTEKH",
  description:
    "Six modules built for Tanzania's pharmacies and ADDOs — dispensing, inventory, compliance, analytics, knowledge, and dashboard.",
};

const availableModules = MODULES.filter((m) => m.available);
const comingSoonModules = MODULES.filter((m) => !m.available);

const PLATFORM_STATS = [
  { value: availableModules.length, label: "Modules live now — all included in every retail subscription", suffix: "" },
  { value: comingSoonModules.length, label: "Modules in active development across Phases 2–4", suffix: "" },
  { value: "100", label: "% offline-capable — every module works without internet connection", suffix: "%" },
  { value: 14, label: "Day free trial — full platform access, no card required", suffix: "-day" },
];

export default function PlatformPage() {
  return (
    <main>
      {/* Header banner */}
      <section className="bg-primary-dark py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary-mid">
            Platform
          </p>
          <h1 className="mt-4 font-serif text-4xl font-semibold text-white sm:text-5xl">
            Everything a pharmacy needs to operate, protect, and grow
          </h1>
          <p className="mt-5 max-w-3xl text-white/65">
            Six modules built for Tanzania&apos;s pharmaceutical environment — integrated into
            one platform, available on every device, and fully functional without a
            constant internet connection.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLATFORM_STATS.map((s) => (
              <StatCard key={s.label} value={s.value} label={s.label} suffix={s.suffix} />
            ))}
          </div>
        </div>
      </section>

      {/* How modules connect */}
      <AnimatedSection className="bg-mist py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            How it fits together
          </p>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {[
              {
                heading: "One platform, not a stack of tools",
                body: "Every module shares the same inventory, the same user accounts, and the same audit trail. Stock taken in the Inventory module is immediately available at the dispensing counter. Compliance documents live in the same place as daily operations.",
              },
              {
                heading: "Clinical checks run on every module",
                body: "Drug interaction checking, contraindication alerts, and FEFO guidance are built into the dispensing flow — not as add-ons. Every tier gets the full Clinical Decision Support Suite at no extra cost.",
              },
              {
                heading: "Owner visibility across all branches",
                body: "The Owner Dashboard gives managers a live view of every branch in one account — revenue, stock levels, compliance status — without separate logins or WhatsApp status updates.",
              },
            ].map(({ heading, body }) => (
              <div
                key={heading}
                className="rounded-xl border border-slate/10 bg-white p-6 shadow-sm"
              >
                <h3 className="font-semibold text-slate">{heading}</h3>
                <p className="mt-3 text-sm leading-7 text-slate/65">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Module grid — available */}
      <AnimatedSection className="bg-white py-14" delay={0.1}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Available now
          </p>
          <h2 className="mt-4 font-serif text-3xl font-semibold text-slate">
            Six modules live in Phase 1
          </h2>
          <p className="mt-3 max-w-2xl text-slate/70">
            Every module below is available today on all retail tiers. Select any module to
            see how it works, what it does, and how it connects to the rest of the platform.
          </p>
          <div className="mt-8">
            <PlatformGrid hideFilter modules={availableModules} />
          </div>
        </div>
      </AnimatedSection>

      {/* Coming soon */}
      <AnimatedSection className="bg-mist py-14" delay={0.1}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Coming in Phases 2–4
          </p>
          <h2 className="mt-4 font-serif text-3xl font-semibold text-slate">
            The roadmap beyond Phase 1
          </h2>
          <p className="mt-3 max-w-2xl text-slate/70">
            Modules below are in active development or planned. Subscribers are notified
            when new modules reach their tier — no extra charge within scope.
          </p>
          <div className="mt-8">
            <PlatformGrid hideFilter modules={comingSoonModules} />
          </div>
          <div className="mt-8">
            <Button href="/roadmap" variant="ghost">
              View full roadmap
            </Button>
          </div>
        </div>
      </AnimatedSection>

      {/* CTA */}
      <section className="bg-primary-dark py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-3xl font-semibold text-white">
            Start with a 14-day free trial
          </h2>
          <p className="mt-3 max-w-xl text-white/65">
            All six modules, all features, no card required. Tell us about your pharmacy
            and we will set up your account within 24 hours.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/contact" variant="amber">Get access</Button>
            <Button href="/pricing" variant="outline-white">See pricing</Button>
          </div>
        </div>
      </section>
    </main>
  );
}
