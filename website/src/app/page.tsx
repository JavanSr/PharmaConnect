import AppMockup from "@/components/AppMockup";
import ModuleCard from "@/components/ModuleCard";
import NhifFlow from "@/components/NhifFlow";
import PricingCard from "@/components/PricingCard";
import SeveritySpectrum from "@/components/SeveritySpectrum";
import ContactForm from "@/components/ContactForm";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { ARTICLES } from "@/lib/data/articles";
import { MODULES } from "@/lib/data/modules";
import { TIERS } from "@/lib/data/pricing";

const availableModules = MODULES.filter((module) => module.phase === 1);
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "PharmaConnect",
  url: "https://pharmaconnect.tz",
  founder: "Elihaki M. Y. Javan",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Arusha",
    addressCountry: "TZ",
  },
};
const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "PharmaConnect",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  description:
    "Pharmacy-side operating system for NHIF claims, inventory, patient safety, CPD, and compliance.",
};

export default function Home() {
  return (
    <main>
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([organizationJsonLd, softwareJsonLd]),
        }}
        type="application/ld+json"
      />
      <section className="hero-pattern overflow-hidden bg-mist">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-24">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              January 26, 2026 - Tanzania launched universal health insurance
            </p>
            <h1 className="mt-5 max-w-4xl font-serif text-4xl font-semibold leading-tight text-slate md:text-6xl">
              The operating system for{" "}
              <span className="text-primary">better pharmaceutical services</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate/70">
              Manage NHIF claims, inventory, patient safety, compliance, and daily
              dispensing work from one pharmacy-side system built for practical use
              in Tanzania.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/contact#waitlist" size="lg">
                Request early access
              </Button>
              <Button href="#demo" variant="ghost" size="lg">
                See how it works
              </Button>
            </div>
            <div className="mt-8 rounded-lg border border-primary/10 bg-white/80 p-4 text-sm text-slate/65">
              <span className="font-semibold text-slate">
                Seeking institutional partnerships:
              </span>{" "}
              Pharmacy Council of Tanzania, TAPHATA, PST
            </div>
          </div>
          <AppMockup />
        </div>
        <div className="overflow-hidden bg-primary-dark py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white/80">
          <div className="marquee-track flex w-max gap-10 whitespace-nowrap">
            <span>
              NHIF Claims - Drug Interaction Checking - Expiry Monitoring - CPD
              Tracking - Compliance Alerts - Inventory Management - Patient Safety -
              Knowledge Hub - Stock Exchange - B2B Ordering - Analytics -
            </span>
            <span>
              NHIF Claims - Drug Interaction Checking - Expiry Monitoring - CPD
              Tracking - Compliance Alerts - Inventory Management - Patient Safety -
              Knowledge Hub - Stock Exchange - B2B Ordering - Analytics -
            </span>
          </div>
        </div>
      </section>

      <section className="bg-primary-dark py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
              Daily workflow snapshot
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-white md:text-4xl">
              What a pharmacy team needs to see quickly
            </h2>
            <p className="mt-4 text-white/70">
              The first question is not market size. It is whether staff can dispense
              safely, keep stock accurate, submit cleaner claims, and stay ready for
              inspection without extra paperwork.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [
                "Faster dispensing",
                "Find stock, follow FEFO, and complete the sale without bouncing between notebooks and loose files.",
              ],
              [
                "Cleaner NHIF claims",
                "Verify membership, catch missing fields early, and queue work safely when the network drops.",
              ],
              [
                "Safer patient checks",
                "See allergy and interaction warnings before medicine leaves the counter.",
              ],
              [
                "Inspection-ready records",
                "Keep expiry, CPD, and compliance reminders visible in the same operating flow.",
              ],
            ].map(([title, body]) => (
              <article className="rounded-lg bg-white/10 p-5" key={title}>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/70">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <div className="font-serif text-8xl leading-none text-primary">&quot;</div>
          <blockquote className="mx-auto max-w-4xl font-serif text-2xl leading-relaxed text-slate">
            On January 26, 2026, Tanzania&apos;s Universal Health Insurance launch made
            health coverage mandatory for every citizen, forcing accredited pharmacies
            and ADDOs to process NHIF claims. PharmaConnect is the pharmacy-side
            operating system designed for better pharmaceutical services.
          </blockquote>
          <p className="mt-5 text-sm italic text-slate/50">
            - PharmaConnect Strategic Framing, April 2026
          </p>
          <div className="mt-12 grid gap-5 text-left md:grid-cols-2">
            <div className="rounded-lg bg-primary-light p-6">
              <h2 className="font-semibold text-primary-dark">For pharmacy owners</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate/70">
                <li>Improve claim readiness and reduce avoidable rejections.</li>
                <li>Track stock, expiry, and compliance risk in one place.</li>
                <li>Prepare for digital operations without losing daily simplicity.</li>
              </ul>
            </div>
            <div className="rounded-lg bg-slate/5 p-6">
              <h2 className="font-semibold text-slate">For pharmacists and technicians</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate/70">
                <li>See safety prompts at the moment of dispensing.</li>
                <li>Use FEFO guidance without extra paperwork.</li>
                <li>Keep CPD and compliance evidence easier to find.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-mist py-20" id="demo">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Available now
            </p>
            <h2 className="mt-3 font-serif text-4xl font-semibold text-slate">
              Built around the workflows pharmacies need today
            </h2>
            <p className="mt-4 text-slate/70">
              Higher-priority project decisions keep the current product focused on
              inventory, NHIF claims, patient safety basics, compliance, knowledge,
              and CPD. Other modules are shown only as future availability.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {availableModules.map((module) => (
              <ModuleCard module={module} key={module.id} />
            ))}
          </div>
          <div className="mt-10">
            <Button href="/roadmap" variant="outline">
              Full roadmap
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              The founder&apos;s original vision
            </p>
            <h2 className="mt-3 font-serif text-4xl font-semibold text-slate">
              Patient safety at every dispensing event
            </h2>
            <p className="mt-5 text-slate/70">
              No community pharmacy should have to rely on memory alone for interaction
              checking. PharmaConnect keeps safety practical: visible alerts,
              pharmacist review, and privacy-by-design patient UUID handling.
            </p>
            <div className="mt-6 grid gap-3">
              {[
                "Drug interaction checking - MINOR through CONTRAINDICATED severity",
                "Contraindication alerts - pregnancy, elderly, renal, allergy",
                "Anonymous patient UUID - no names, no national IDs, PDPC-conscious",
              ].map((item) => (
                <div className="rounded-lg border border-slate/10 bg-mist p-4 text-sm font-semibold text-slate" key={item}>
                  {item}
                </div>
              ))}
            </div>
            <blockquote className="mt-6 border-l-4 border-primary pl-4 font-serif text-xl italic text-slate">
              &quot;I have seen preventable harm happen. PharmaConnect was built to stop it.&quot;
              <span className="mt-2 block font-sans text-sm not-italic text-slate/50">
                - Elihaki M. Y. Javan, Founder & Pharmaceutical Technologist
              </span>
            </blockquote>
          </div>
          <SeveritySpectrum />
        </div>
      </section>

      <section className="bg-mist py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              NHIF claims flow
            </p>
            <h2 className="mt-3 font-serif text-4xl font-semibold text-slate">
              Claims readiness without end-of-day panic
            </h2>
            <p className="mt-4 text-slate/70">
              The current claims flow focuses on verification, validation, offline queueing, and fast
              rejected-claim follow-up so pharmacies can improve claim success rate.
            </p>
          </div>
          <div className="mt-10">
            <NhifFlow />
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Pricing
              </p>
              <h2 className="mt-3 font-serif text-4xl font-semibold text-slate">
                Pilot pricing designed for adoption
              </h2>
            </div>
            <Button href="/pricing" variant="outline">Full pricing</Button>
          </div>
          <div className="mt-8 flex snap-x gap-5 overflow-x-auto pb-4">
            {TIERS.map((tier) => (
              <PricingCard key={tier.id} tier={tier} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-mist py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[.7fr_1.3fr] lg:px-8">
          <div className="flex h-44 w-44 items-center justify-center rounded-full bg-primary-light font-serif text-5xl font-semibold text-primary">
            EMJ
          </div>
          <div>
            <h2 className="font-serif text-4xl font-semibold text-slate">
              Built by pharmaceutical personnel with firsthand experience of the problem
            </h2>
            <p className="mt-5 text-slate/70">
              Elihaki M. Y. Javan is a Pharmaceutical Technologist based in Arusha,
              Tanzania, with field exposure across community pharmacies, hospital
              pharmacies, medical supplies supply chain, and professional association
              activity across the country.
            </p>
            <blockquote className="mt-6 border-l-4 border-primary pl-4 font-serif text-xl italic text-slate">
              &quot;PharmaConnect is not a startup idea. It is the tool I needed and could not find. So I decided to build it.&quot;
            </blockquote>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-4xl font-semibold text-slate">Institutional partners</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["PC", "Pharmacy Council", "Regulatory alignment"],
              ["PST", "Pharmaceutical Society of Tanzania", "Professional engagement"],
              ["TAPHATA", "TAPHATA", "Technician community"],
              ["NHIF", "NHIF", "Breeze API accreditation initiated"],
            ].map(([initials, name, role]) => (
              <article className="rounded-lg border border-slate/10 p-6 text-center" key={initials}>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate/10 font-semibold text-slate">{initials}</div>
                <h3 className="mt-4 font-semibold text-slate">{name}</h3>
                <p className="mt-2 text-sm text-slate/60">{role}</p>
              </article>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate/60">NHIF Breeze API accreditation initiated - April 2026</p>
        </div>
      </section>

      <section className="bg-primary-mist py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-4xl font-semibold text-slate">Knowledge Hub preview</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {ARTICLES.slice(0, 3).map((article) => (
              <article className="rounded-lg bg-white p-6 shadow-sm" key={article.slug}>
                <Badge>{article.category}</Badge>
                <h3 className="mt-4 text-xl font-semibold text-slate">{article.title}</h3>
                <p className="mt-3 line-clamp-2 text-sm text-slate/65">{article.excerpt}</p>
                <p className="mt-4 text-xs text-slate/45">{article.readingTime} min read</p>
                <Button className="mt-5" href={`/blog/${article.slug}`} variant="ghost">Read</Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary-dark py-20 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:px-8">
          <div>
            <h2 className="font-serif text-4xl font-semibold">
            Join the PharmaConnect pilot
            </h2>
            <p className="mt-4 text-white/70">
              We are speaking with pharmacy owners, pharmacists, and institutional
              partners in Tanzania.
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 text-slate">
            <ContactForm variant="pilot" />
          </div>
        </div>
      </section>
    </main>
  );
}
