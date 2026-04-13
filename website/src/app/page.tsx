import dynamic from "next/dynamic";
import Link from "next/link";
import Script from "next/script";
import { AlertTriangle, Lock, Shield } from "lucide-react";
import ContactForm from "@/components/ContactForm";
import PlatformGrid from "@/components/PlatformGrid";
import PricingToggle from "@/components/PricingToggle";
import SeveritySpectrum from "@/components/SeveritySpectrum";
import AnimatedSection from "@/components/ui/AnimatedSection";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import StatCard from "@/components/ui/StatCard";
import { ARTICLES } from "@/lib/data/articles";
import { MODULES } from "@/lib/data/modules";

const AppMockup = dynamic(() => import("@/components/AppMockup"), { ssr: false });
const NhifFlow = dynamic(() => import("@/components/NhifFlow"));

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "PharmaConnect",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web, Android",
  description: "Pharmacy-side platform for Tanzania's 14,000+ pharmacies and ADDOs",
  offers: [
    { "@type": "Offer", price: "0", priceCurrency: "TZS" },
    { "@type": "Offer", price: "25000", priceCurrency: "TZS" },
    { "@type": "Offer", price: "70000", priceCurrency: "TZS" },
  ],
  author: {
    "@type": "Person",
    name: "Elihaki M. Y. Javan",
    jobTitle: "Pharmaceutical Technologist",
    worksFor: { "@type": "Organization", name: "PharmaConnect System" },
  },
};

export default function HomePage() {
  return (
    <main>
      <Script id="pharmaconnect-jsonld" strategy="beforeInteractive" type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </Script>

      <AnimatedSection className="hero-pattern overflow-hidden bg-mist">
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-24">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
              January 26, 2026 - Tanzania launched universal health insurance
            </p>
            <h1 className="mt-4 font-serif text-5xl tracking-tight text-slate lg:text-6xl">
              The operating system for <span className="text-primary">better pharmaceutical services</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate/70">
              14,000+ pharmacies and ADDOs across Tanzania must now process NHIF claims.
              PharmaConnect turns this compliance requirement into higher-quality care,
              fewer medication errors, and professional growth.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/contact#waitlist" variant="primary">
                Request early access
              </Button>
              <Button href="#how-it-works" variant="ghost">
                See how it works -&gt;
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate/40">
              <span className="font-medium uppercase tracking-wider">Seeking partnerships with:</span>
              <span>Pharmacy Council of Tanzania</span>
              <span>&middot;</span>
              <span>TAPHATA</span>
              <span>&middot;</span>
              <span>PST</span>
            </div>
          </div>
          <AppMockup />
        </section>
        <div className="overflow-hidden bg-primary-dark py-4 text-sm font-medium uppercase tracking-[0.18em] text-white">
          <div className="marquee-track flex w-max gap-10 whitespace-nowrap">
            <span>
              NHIF Claims &middot; Drug Interaction Checking &middot; Expiry Monitoring &middot;
              CPD Tracking &middot; Compliance Alerts &middot; Inventory Management &middot;
              Patient Safety &middot; TMDA Integration &middot; Knowledge Hub &middot;
              Stock Exchange &middot; B2B Ordering &middot; Analytics &middot;
            </span>
            <span>
              NHIF Claims &middot; Drug Interaction Checking &middot; Expiry Monitoring &middot;
              CPD Tracking &middot; Compliance Alerts &middot; Inventory Management &middot;
              Patient Safety &middot; TMDA Integration &middot; Knowledge Hub &middot;
              Stock Exchange &middot; B2B Ordering &middot; Analytics &middot;
            </span>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection className="bg-primary-dark py-16" delay={0.05}>
        <section className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          <StatCard label="Pharmacies and ADDOs serving Tanzania" suffix="+" value={14000} />
          <StatCard label="Facilities using digital NHIF claims today" value={187} />
          <StatCard label="Tanzania pharmaceutical market - 6.1% CAGR" value="USD 243M" />
          <StatCard label="UHI launch date - claims processing is mandatory now" value="Jan 2026" />
        </section>
      </AnimatedSection>

      <AnimatedSection className="bg-white py-20" delay={0.1}>
        <section className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <div className="font-serif text-[120px] leading-none text-primary/20">&ldquo;</div>
          <blockquote className="mx-auto max-w-3xl font-serif text-2xl text-slate">
            On January 26, 2026, Tanzania&apos;s Universal Health Insurance launch made health
            coverage mandatory for every citizen - forcing 14,000+ pharmacies and ADDOs to
            process NHIF claims. While generic POS systems focus only on sales and inventory,
            PharmaConnect is the pharmacy-side platform designed for better pharmaceutical
            services.
          </blockquote>
          <p className="mt-5 text-sm italic text-slate/50">- PharmaConnect, April 2026</p>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            <article className="rounded-xl bg-primary-lightest p-6 text-left">
              <h2 className="text-lg font-semibold text-primary-dark">For pharmacy owners</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate/70">
                <li>Remote visibility into every branch</li>
                <li>Compliance protection before every deadline</li>
                <li>Profitability analytics across your portfolio</li>
              </ul>
            </article>
            <article className="rounded-xl bg-slate/5 p-6 text-left">
              <h2 className="text-lg font-semibold text-slate">For pharmacists and dispensers</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate/70">
                <li>Patient safety alerts at the dispensing moment</li>
                <li>Drug interaction checking before medicine leaves the counter</li>
                <li>CPD tracking built into daily work</li>
              </ul>
            </article>
          </div>
        </section>
      </AnimatedSection>

      <AnimatedSection className="bg-mist py-20" delay={0.15}>
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="font-serif text-4xl font-semibold text-slate">
              Everything a pharmacy needs to operate, protect, and grow
            </h2>
            <p className="mt-4 text-slate/70">Seven modules available now. More to come soon.</p>
          </div>
          <div className="mt-8">
            <PlatformGrid modules={MODULES} />
          </div>
          <Link className="mt-8 inline-flex text-sm font-medium text-primary" href="/platform">
            Explore the full platform -&gt;
          </Link>
        </section>
      </AnimatedSection>

      <AnimatedSection className="bg-white py-20" delay={0.2}>
        <section className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="font-mono text-xs text-primary">The founder&apos;s original vision</p>
            <h2 className="mt-3 font-serif text-4xl font-semibold text-slate">
              Patient safety at every dispensing event
            </h2>
            <p className="mt-5 text-slate/70">
              No community pharmacy in Tanzania currently checks drug interactions at the
              point of dispensing. PharmaConnect changes this - checking interactions,
              contraindications, and allergy flags before medicine leaves the counter.
            </p>
            <div className="mt-6 grid gap-3">
              <div className="flex items-center gap-3 rounded-xl bg-mist p-4">
                <Shield className="text-primary" size={18} />
                <span className="text-sm font-medium text-slate">
                  Drug interaction checking - MINOR through CONTRAINDICATED
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-mist p-4">
                <AlertTriangle className="text-primary" size={18} />
                <span className="text-sm font-medium text-slate">
                  Contraindication alerts - pregnancy, renal, elderly, allergy
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-mist p-4">
                <Lock className="text-primary" size={18} />
                <span className="text-sm font-medium text-slate">
                  Anonymous patient UUID - no names, no national IDs, PDPC-compliant
                </span>
              </div>
            </div>
            <blockquote className="mt-6 border-l-4 border-primary pl-4 font-serif text-lg italic text-slate">
              &ldquo;I have seen preventable harm happen. PharmaConnect was built to stop it.&rdquo;
              <span className="mt-2 block font-sans text-sm not-italic text-slate/50">
                - Elihaki M. Y. Javan, Founder &amp; Pharmaceutical Technologist
              </span>
            </blockquote>
          </div>
          <SeveritySpectrum />
        </section>
      </AnimatedSection>

      <AnimatedSection className="bg-mist py-20" delay={0.25}>
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" id="how-it-works">
          <div className="max-w-3xl">
            <h2 className="font-serif text-4xl font-semibold text-slate">
              How NHIF claims move through PharmaConnect
            </h2>
            <p className="mt-4 text-slate/70">
              From verification to follow-up, the workflow keeps claims clean, auditable,
              and easier to correct when issues appear.
            </p>
          </div>
          <div className="mt-8">
            <NhifFlow />
          </div>
        </section>
      </AnimatedSection>

      <AnimatedSection className="bg-white py-20" delay={0.3}>
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-4xl font-semibold text-slate">
            Priced for Tanzania&apos;s pharmaceutical reality
          </h2>
          <p className="mt-4 text-slate/70">
            Competitive with DukaDawa and Stawi Biz. Superior in clinical depth.
          </p>
          <div className="mt-8">
            <PricingToggle />
          </div>
          <Link className="mt-6 inline-flex text-sm font-medium text-primary" href="/pricing">
            Full pricing details -&gt;
          </Link>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate/10">
                  <th className="py-3">Feature</th>
                  <th className="py-3">DukaDawa</th>
                  <th className="py-3">Stawi Biz</th>
                  <th className="py-3">PharmaConnect</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["NHIF claims", "X", "Partial", "Yes"],
                  ["Drug interactions", "X", "X", "Yes"],
                  ["CPD tracking", "X", "X", "Yes"],
                  ["Patient safety", "X", "X", "Yes"],
                  ["Offline-first", "Partial", "X", "Yes"],
                ].map((row) => (
                  <tr className="border-b border-slate/10" key={row[0]}>
                    {row.map((cell, index) => (
                      <td
                        className={
                          index === 3 && cell === "Yes"
                            ? "py-3 font-semibold text-primary"
                            : cell === "X"
                              ? "py-3 text-slate/30"
                              : "py-3 text-slate/70"
                        }
                        key={`${row[0]}-${index}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </AnimatedSection>

      <AnimatedSection className="bg-mist py-20" delay={0.35}>
        <section className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[220px_1fr] lg:px-8">
          <div className="flex h-[180px] w-[180px] items-center justify-center rounded-full bg-primary-lightest font-serif text-5xl text-primary">
            EMJ
          </div>
          <div>
            <h2 className="font-serif text-4xl font-semibold text-slate">
              Built by a pharmacist who has seen the problem firsthand
            </h2>
            <p className="mt-5 text-slate/70">
              Elihaki M. Y. Javan is a Pharmaceutical Technologist based in Arusha, Tanzania.
              Pharmacy In-Charge at Lindi Regional Hospital. Supply chain reviewer for JSI/UBAB
              and GFF programmes under MOH and PO-RALG. Active TAPHATA member. Field experience
              across Arusha, Dar es Salaam, Lindi, and rural Tanzania. Every feature in
              PharmaConnect maps to a real problem encountered in practice.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {[
                "Pharmacy In-Charge - Lindi Regional Hospital",
                "National Supply Chain Reviewer - JSI/UBAB & GFF",
                "Active TAPHATA Member",
                "Field experience - 4+ Tanzanian regions",
              ].map((item) => (
                <Badge className="justify-center rounded-lg px-4 py-3 text-center" key={item} variant="primary">
                  {item}
                </Badge>
              ))}
            </div>
            <blockquote className="mt-6 border-l-4 border-primary pl-4 font-serif text-xl italic text-slate">
              PharmaConnect is not a startup idea. It is the tool I needed and could not find. So I decided to build it.
              <span className="mt-2 block font-sans text-sm not-italic text-slate/50">
                - Elihaki M. Y. Javan, Founder
              </span>
            </blockquote>
          </div>
        </section>
      </AnimatedSection>

      <AnimatedSection className="bg-white py-20" delay={0.4}>
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-4xl font-semibold text-slate">
            Seeking partnerships with Tanzania&apos;s pharmaceutical institutions
          </h2>
          <p className="mt-4 text-slate/70">Conversations initiated. MOUs underway.</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Pharmacy Council of Tanzania", "Regulatory accreditation and compliance standards"],
              ["PST", "Pharmaceutical Society of Tanzania - professional membership body"],
              ["TAPHATA", "Tanzania Pharmaceutical Health Technologies Association"],
              ["NHIF", "National Health Insurance Fund - Breeze API accreditation underway"],
            ].map(([title, body]) => (
              <article className="rounded-xl border border-slate/10 bg-mist p-6" key={title}>
                <h3 className="text-lg font-semibold text-slate">{title}</h3>
                <p className="mt-3 text-sm text-slate/65">{body}</p>
              </article>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate/55">NHIF Breeze API accreditation process initiated - April 2026</p>
        </section>
      </AnimatedSection>

      <AnimatedSection className="bg-primary-lightest py-20" delay={0.45}>
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-4xl font-semibold text-slate">Knowledge Hub preview</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {ARTICLES.slice(0, 3).map((article) => (
              <article className="rounded-xl border border-slate/10 bg-white p-6" key={article.slug}>
                <Badge>{article.category}</Badge>
                <h3 className="mt-4 text-lg font-medium text-slate">{article.title}</h3>
                <p className="mt-3 text-sm text-slate/65">{article.excerpt}</p>
                <Link className="mt-4 inline-flex text-sm font-medium text-primary" href={`/blog/${article.slug}`}>
                  Read -&gt;
                </Link>
              </article>
            ))}
          </div>
          <Link className="mt-8 inline-flex text-sm font-medium text-primary" href="/blog">
            Visit the Knowledge Hub -&gt;
          </Link>
        </section>
      </AnimatedSection>

      <AnimatedSection className="bg-primary-dark py-20 text-white" delay={0.5}>
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-4xl font-semibold">Tanzania&apos;s pharmacies need this. Now.</h2>
          <p className="mt-4 text-white/70">
            Join the Arusha early access programme - first 20 pharmacies at no charge.
          </p>
          <div className="mt-8 rounded-2xl bg-white p-6 text-slate">
            <ContactForm variant="waitlist" />
          </div>
          <p className="mt-5 text-sm text-white/70">
            Or contact directly: elihaki.yusuph@gmail.com &middot; +255 764 591 374 &middot; @PharmaConnect
          </p>
        </section>
      </AnimatedSection>
    </main>
  );
}
