import dynamic from "next/dynamic";
import Link from "next/link";
import Script from "next/script";
import { AlertTriangle, ArrowUpDown, BarChart3, Bell, Building2, CalendarCheck, Check, FileText, Lock, ScanLine, ScrollText, Shield, Tag, Users, Warehouse, Wifi } from "lucide-react";
import ContactForm from "@/components/ContactForm";
import FaqAccordion from "@/components/FaqAccordion";
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

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "APOTEKH",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web, Android",
  description: "Pharmacy-side platform for Tanzania's 14,000+ pharmacies and ADDOs",
  offers: [
    { "@type": "Offer", price: "20000", priceCurrency: "TZS" },
    { "@type": "Offer", price: "35000", priceCurrency: "TZS" },
    { "@type": "Offer", price: "55000", priceCurrency: "TZS" },
  ],
  publisher: { "@type": "Organization", name: "APOTEKH" },
};

const availableModules = MODULES.filter((m) => m.available);

export default function HomePage() {
  return (
    <main>
      <Script id="pharmaconnect-jsonld" strategy="beforeInteractive" type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </Script>

      <AnimatedSection className="hero-pattern overflow-hidden bg-mist">
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-3 py-1.5 backdrop-blur-sm">
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="font-mono text-xs text-primary">Phase 1 live &middot; Dodoma, Tanzania</span>
            </div>
            <h1 className="mt-4 font-serif text-5xl tracking-tight text-slate lg:text-6xl">
              The operating system for{" "}
              <span className="bg-gradient-to-r from-primary via-primary-mid to-[#3db89a] bg-clip-text text-transparent">
                better pharmaceutical services
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate/70">
              Tanzania&apos;s pharmacies and ADDOs must operate with greater accuracy,
              compliance, and clinical care. APOTEKH gives them the tools to do exactly that.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/contact#waitlist" variant="primary">
                Request early access
              </Button>
              <Button href="/platform" variant="ghost">
                See the platform &rarr;
              </Button>
            </div>
          </div>
          <AppMockup />
        </section>
        <div className="overflow-hidden bg-primary-dark py-4 text-sm font-medium uppercase tracking-[0.18em] text-white">
          <div className="marquee-track flex w-max gap-10 whitespace-nowrap">
            <span>
              Drug Interaction Checking &middot; Expiry Monitoring &middot;
              Barcode Scanning &middot; Compliance Alerts &middot; Inventory Management &middot;
              Patient Safety &middot; Knowledge Hub &middot; Dispensing &middot;
              Analytics &middot; Offline-First &middot; Regulatory Compliance &middot;
            </span>
            <span>
              Drug Interaction Checking &middot; Expiry Monitoring &middot;
              Barcode Scanning &middot; Compliance Alerts &middot; Inventory Management &middot;
              Patient Safety &middot; Knowledge Hub &middot; Dispensing &middot;
              Analytics &middot; Offline-First &middot; Regulatory Compliance &middot;
            </span>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection className="bg-primary-dark py-16" delay={0.05}>
        <section className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <StatCard label="Pharmacies and ADDOs serving Tanzania" suffix="+" value={14000} />
          <StatCard label="Tanzania pharmaceutical market — 6.1% CAGR" value="USD 243M" />
        </section>
      </AnimatedSection>

      <AnimatedSection className="bg-white py-20" delay={0.08}>
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-3xl font-semibold text-slate">
            Built for how pharmacies actually work
          </h2>
          <p className="mt-3 text-slate/65">Real-world features for Tanzania&apos;s pharmaceutical environment.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {[
              {
                icon: Wifi,
                title: "Works offline and online",
                body: "Dispensing, safety checks, and stock updates run without internet. Data syncs automatically when connectivity returns — no lost sales, no lost records.",
              },
              {
                icon: ScanLine,
                title: "QR & Barcode Scanner",
                body: "Scan medicines on arrival to fill batch details automatically. Scan at the dispensing counter to select and verify a product in one tap. Any phone or USB reader.",
              },
              {
                icon: Warehouse,
                title: "Wholesale catalogue built in",
                body: "Your registered wholesale supplier's products are searchable directly inside APOTEKH. Browse stock, record deliveries, and link arrivals to inventory — no re-entry.",
              },
              {
                icon: Lock,
                title: "Sales privacy controls",
                body: "Role-based access limits what each staff member can see and do. Every transaction is logged with a timestamped user record — a clear trail that protects against theft and unrecorded losses.",
              },
              {
                icon: Building2,
                title: "Multi-branch visibility",
                body: "Owners see sales, stock levels, and compliance status across every branch from a single account. No separate logins, no WhatsApp reports.",
              },
              {
                icon: Bell,
                title: "Compliance deadline tracking",
                body: "TMDA licences, inspection dates, and renewal deadlines stay visible before they become problems. Colour-coded status, early reminders, and an evidence trail built in.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-slate/10 bg-mist p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                  <Icon size={18} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate/65">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </AnimatedSection>

      <AnimatedSection className="bg-white py-20" delay={0.1}>
        <section className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <div className="font-serif text-[120px] leading-none text-primary/20">&ldquo;</div>
          <blockquote className="mx-auto max-w-3xl font-serif text-2xl text-slate">
            Tanzania&apos;s pharmacies deserve more than a point-of-sale system.
            Generic software was built for sales.
            APOTEKH is built for better pharmaceutical services.
          </blockquote>
          <p className="mt-5 text-sm italic text-slate/50">- APOTEKH, 2026</p>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            <article className="rounded-xl border border-primary/15 bg-primary-lightest p-6 text-left">
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
                <Building2 size={18} />
              </div>
              <h2 className="text-lg font-semibold text-primary-dark">For pharmacy owners</h2>
              <ul className="mt-4 space-y-3">
                {[
                  "Remote visibility into every branch",
                  "Compliance protection before every deadline",
                  "Profitability analytics across your portfolio",
                ].map((item) => (
                  <li className="flex items-start gap-2 text-sm text-slate/70" key={item}>
                    <Check className="mt-0.5 shrink-0 text-primary" size={15} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-xl border border-slate/10 bg-white p-6 text-left shadow-sm">
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-slate/8 text-slate">
                <Users size={18} />
              </div>
              <h2 className="text-lg font-semibold text-slate">For pharmacists and dispensers</h2>
              <ul className="mt-4 space-y-3">
                {[
                  "Patient safety alerts at the dispensing moment",
                  "Drug interaction checking before medicine leaves the counter",
                  "Compliance and expiry alerts built into daily work",
                ].map((item) => (
                  <li className="flex items-start gap-2 text-sm text-slate/70" key={item}>
                    <Check className="mt-0.5 shrink-0 text-slate/40" size={15} />
                    <span>{item}</span>
                  </li>
                ))}
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
            <p className="mt-4 text-slate/70">Six modules, built for Tanzania&apos;s pharmaceutical environment.</p>
          </div>
          <div className="mt-8">
            <PlatformGrid hideFilter modules={availableModules} />
          </div>
          <Link className="mt-8 inline-flex text-sm font-medium text-primary" href="/platform">
            Explore the full platform &rarr;
          </Link>
        </section>
      </AnimatedSection>

      <AnimatedSection className="bg-white py-20" delay={0.18}>
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-serif text-4xl font-semibold text-slate">How it works</h2>
            <p className="mt-4 text-slate/65">From sign-up to daily operations in three steps.</p>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Set up your pharmacy",
                body: "Register, load your products from the catalogue or by scanning, and invite your team. Most pharmacies are running within the same day — no training workshop required.",
              },
              {
                step: "02",
                title: "Work smarter at the counter",
                body: "Dispensing, drug interaction checks, and stock updates happen in one controlled flow. Scan a product, confirm safety, complete the sale. No separate tools, no double entry.",
              },
              {
                step: "03",
                title: "Manage from anywhere",
                body: "Compliance deadlines, inventory levels, and sales performance update in real time. See everything across your branches from a phone or laptop — in Dodoma or wherever you are.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="relative pl-16">
                <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-primary font-mono text-sm font-bold text-white">
                  {step}
                </div>
                <h3 className="text-lg font-semibold text-slate">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate/65">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </AnimatedSection>

      <AnimatedSection className="bg-mist py-20" delay={0.19}>
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-4xl font-semibold text-slate">Everything included</h2>
          <p className="mt-3 text-slate/65">No add-ons. No separate tools. Every capability ships with your plan.</p>
          <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ArrowUpDown, title: "FEFO Dispensing", body: "First-expiry-first-out enforced at every sale — no expired stock leaving the counter." },
              { icon: Bell, title: "Expiry Alerts", body: "90, 60, 30, 7, and 1-day warnings tracked automatically per batch." },
              { icon: Tag, title: "Batch & Lot Tracking", body: "Every product logged by batch, supplier, and date from intake to sale." },
              { icon: Shield, title: "Drug Interaction Checks", body: "MINOR through CONTRAINDICATED screened before medicine leaves the counter." },
              { icon: Users, title: "Role-Based Access", body: "Staff see only what their role allows — dispensers, cashiers, owners, and clerks all separated." },
              { icon: Wifi, title: "Offline-First Sync", body: "Works without internet. Syncs all pending actions the moment connectivity returns." },
              { icon: ScanLine, title: "QR & Barcode Scanning", body: "Scan on intake and at the counter. Any phone camera or USB barcode reader." },
              { icon: Building2, title: "Multi-Branch Dashboard", body: "All your locations in one account. No jumping between logins." },
              { icon: CalendarCheck, title: "Compliance Calendar", body: "TMDA licences, inspections, and renewals tracked with early reminders and evidence upload." },
              { icon: FileText, title: "Receipts & PDF Export", body: "Professional dispensing receipts and printable records generated automatically." },
              { icon: BarChart3, title: "Analytics & Reporting", body: "Sales trends, stock movement, and compliance summaries in one management view." },
              { icon: ScrollText, title: "Permanent Audit Log", body: "Every override, void, and transaction permanently recorded — tamper-proof by design." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon size={16} />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate/60">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </AnimatedSection>

      <AnimatedSection className="bg-white py-20" delay={0.2}>
        <section className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="font-mono text-xs text-primary">Patient Safety</p>
            <h2 className="mt-3 font-serif text-4xl font-semibold text-slate">
              Safety checks at every dispensing event
            </h2>
            <p className="mt-5 text-slate/70">
              No community pharmacy in Tanzania currently checks drug interactions at the
              point of dispensing. APOTEKH changes this — checking interactions,
              contraindications, and allergy flags before medicine leaves the counter.
            </p>
            <div className="mt-6 grid gap-3">
              <div className="flex items-center gap-3 rounded-xl bg-mist p-4">
                <Shield className="text-primary" size={18} />
                <span className="text-sm font-medium text-slate">
                  Drug interaction checking — MINOR through CONTRAINDICATED
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-mist p-4">
                <AlertTriangle className="text-primary" size={18} />
                <span className="text-sm font-medium text-slate">
                  Contraindication alerts — pregnancy, renal, elderly, allergy
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-mist p-4">
                <Lock className="text-primary" size={18} />
                <span className="text-sm font-medium text-slate">
                  Anonymous session — no patient names or national IDs stored
                </span>
              </div>
            </div>
          </div>
          <SeveritySpectrum />
        </section>
      </AnimatedSection>

      <AnimatedSection className="bg-mist py-20" delay={0.25}>
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-4xl font-semibold text-slate">
            Priced for Tanzania&apos;s pharmaceutical reality
          </h2>
          <div className="mt-8">
            <PricingToggle />
          </div>
          <Link className="mt-6 inline-flex text-sm font-medium text-primary" href="/pricing">
            Full pricing details &rarr;
          </Link>
        </section>
      </AnimatedSection>

      <AnimatedSection className="bg-primary-lightest py-20" delay={0.3}>
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-4xl font-semibold text-slate">Knowledge Hub preview</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {ARTICLES.slice(0, 3).map((article) => (
              <article className="rounded-xl border border-slate/10 bg-white p-6" key={article.slug}>
                <Badge>{article.category}</Badge>
                <h3 className="mt-4 text-lg font-medium text-slate">{article.title}</h3>
                <p className="mt-3 text-sm text-slate/65">{article.excerpt}</p>
                <Link className="mt-4 inline-flex text-sm font-medium text-primary" href={`/blog/${article.slug}`}>
                  Read &rarr;
                </Link>
              </article>
            ))}
          </div>
          <Link className="mt-8 inline-flex text-sm font-medium text-primary" href="/blog">
            Visit the Knowledge Hub &rarr;
          </Link>
        </section>
      </AnimatedSection>

      <AnimatedSection className="bg-white py-20" delay={0.32}>
        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-4xl font-semibold text-slate">Common questions</h2>
          <div className="mt-8">
            <FaqAccordion />
          </div>
        </section>
      </AnimatedSection>

      <AnimatedSection className="bg-primary-dark py-20 text-white" delay={0.35}>
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-4xl font-semibold">Tanzania&apos;s pharmacies need this. Now.</h2>
          <p className="mt-4 text-white/70">
            Join the Dodoma early access programme — first 20 pharmacies at no charge.
          </p>
          <div className="mt-8 rounded-2xl bg-white p-6 text-slate">
            <ContactForm variant="waitlist" />
          </div>
          <p className="mt-5 text-sm text-white/70">
            Or contact directly: elihaki.yusuph@gmail.com &middot; +255 764 591 374 &middot; @APOTEKH
          </p>
        </section>
      </AnimatedSection>
    </main>
  );
}
