import Link from "next/link";
import Script from "next/script";
import {
  BarChart3, Bell, BookOpen, Building2, CalendarCheck, Check,
  FileText, LayoutDashboard, Package, Pill, ScanLine, Shield,
  ShieldCheck, Users, Warehouse, Wifi,
} from "lucide-react";
import FaqAccordion from "@/components/FaqAccordion";
import FeatureTabs from "@/components/FeatureTabs";
import PricingToggle from "@/components/PricingToggle";
import ContactForm from "@/components/ContactForm";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "APOTEKH",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web, Android",
  description: "Pharmacy-side platform for Tanzania's 14,000+ pharmacies and ADDOs",
  offers: [
    { "@type": "Offer", price: "20000", priceCurrency: "TZS" },
    { "@type": "Offer", price: "39000", priceCurrency: "TZS" },
    { "@type": "Offer", price: "55000", priceCurrency: "TZS" },
    { "@type": "Offer", price: "75000", priceCurrency: "TZS" },
  ],
  publisher: { "@type": "Organization", name: "APOTEKH" },
};

const LIVE_MODULES = [
  { icon: LayoutDashboard, name: "Dashboard", desc: "Live operating view — sales, compliance, and priorities in one place.", phase: 1 },
  { icon: Package, name: "Inventory", desc: "Batch-level stock control with FEFO, expiry alerts, and offline sync.", phase: 1 },
  { icon: Pill, name: "Dispensing", desc: "Safe dispensing workflow with interaction checking and FEFO guidance.", phase: 1 },
  { icon: ShieldCheck, name: "Compliance", desc: "TMDA and PC licence tracking with deadline reminders and evidence upload.", phase: 1 },
  { icon: BarChart3, name: "Analytics", desc: "Sales, stock, and compliance reports across every branch.", phase: 1 },
  { icon: BookOpen, name: "Knowledge Hub", desc: "Clinical and regulatory reference library for daily dispensing work.", phase: 1 },
];

const COMING_MODULES = [
  { name: "NHIF Claims", phase: 2 },
  { name: "CPD Tracker", phase: 2 },
  { name: "Stock Exchange", phase: 2 },
  { name: "B2B Platform", phase: 3 },
  { name: "Patient App", phase: 3 },
  { name: "AI Safety", phase: 4 },
];

const ROLES = [
  {
    title: "Pharmacy Owner",
    sub: "Remote oversight, every branch",
    items: [
      "Live sales and stock across all outlets",
      "Compliance status before every deadline",
      "Staff access controls without being on site",
      "Profitability analytics across your portfolio",
    ],
  },
  {
    title: "Pharmacist In Charge",
    sub: "Full clinical + operational control",
    items: [
      "Drug interaction oversight before every sale",
      "Clinical override with logged justification",
      "Compliance calendar and evidence upload",
      "Full inventory and dispensing authority",
    ],
  },
  {
    title: "Dispenser",
    sub: "Counter-level safety and speed",
    items: [
      "Dispensing flow with embedded safety checks",
      "Barcode scan to select and verify instantly",
      "FEFO-guided product selection every time",
      "Offline-ready — works during network outages",
    ],
  },
  {
    title: "Data Entry Clerk",
    sub: "Stock intake and supplier management",
    items: [
      "Stock intake form with batch and expiry fields",
      "Barcode scan on incoming goods",
      "Supplier records and delivery tracking",
      "No access to financials or dispensing",
    ],
  },
];

export default function HomePage() {
  return (
    <main>
      <Script id="apotekh-jsonld" strategy="beforeInteractive" type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </Script>

      {/* ── Hero ── */}
      <section className="dot-grid overflow-hidden bg-paper">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-line bg-white px-3.5 py-1.5">
            <span className="live-dot block h-2 w-2 rounded-full bg-[#2A9478]" />
            <span className="font-mono text-xs text-muted">Phase 1 live &middot; Arusha, Tanzania</span>
          </div>

          <h1 className="mt-6 max-w-4xl font-serif text-5xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-6xl lg:text-7xl">
            The operating system<br />
            <span className="text-[#1A6B5C]">for pharmacies</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Tanzania&rsquo;s pharmacies need more than a point-of-sale system. APOTEKH gives them
            inventory control, patient safety checks, regulatory compliance, and analytics —
            in one platform built for how pharmacies actually work.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contact#waitlist"
              className="inline-flex items-center gap-2 rounded-lg bg-[#1A6B5C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#145748]"
            >
              Start free trial
            </Link>
            <Link
              href="/platform"
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-mist"
            >
              See the platform &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Marquee ── */}
      <div className="overflow-hidden bg-[#0D4035] py-4 text-sm font-medium uppercase tracking-[0.18em] text-white">
        <div className="marquee-track flex w-max gap-10 whitespace-nowrap">
          {[0, 1].map((i) => (
            <span key={i}>
              Drug Interaction Checking &middot; Expiry Monitoring &middot; Barcode Scanning &middot;
              Compliance Alerts &middot; Inventory Management &middot; Patient Safety &middot;
              Knowledge Hub &middot; Dispensing &middot; Analytics &middot; Offline-First &middot;
              Regulatory Compliance &middot;
            </span>
          ))}
        </div>
      </div>

      {/* ── Trust Strip ── */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-line px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            { value: "14,000+", label: "Pharmacies & ADDOs in Tanzania" },
            { value: "TZS 243M", label: "Pharmaceutical market size" },
            { value: "7-day", label: "Full offline capability" },
            { value: "Phase 1", label: "Live in Arusha — expanding nationally" },
          ].map(({ value, label }) => (
            <div key={label} className="px-6 py-10">
              <p className="font-serif text-3xl font-semibold text-ink">{value}</p>
              <p className="mt-1.5 text-sm text-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature Tabs ── */}
      <FeatureTabs />

      {/* ── App Screen Mockup ── */}
      <section className="bg-paper py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-[#1A6B5C]">
              Inside APOTEKH
            </p>
            <h2 className="mt-3 font-serif text-4xl font-semibold text-ink">
              Built for the pharmacy counter
            </h2>
            <p className="mt-4 text-muted">
              One platform that keeps dispensing, stock, compliance, and oversight in one controlled view.
            </p>
          </div>

          {/* Styled app mockup */}
          <div className="mt-12 overflow-hidden rounded-2xl border border-line shadow-card">
            {/* Window chrome */}
            <div className="flex items-center gap-3 border-b border-line bg-[#0D4035] px-4 py-3">
              <div className="flex gap-1.5">
                <span className="block h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="block h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="block h-2.5 w-2.5 rounded-full bg-white/20" />
              </div>
              <span className="font-mono text-xs text-white/50">APOTEKH &middot; Dashboard</span>
            </div>
            <div className="grid lg:grid-cols-[220px_1fr]">
              {/* Sidebar */}
              <div className="hidden border-r border-line bg-paper p-4 lg:block">
                <div className="space-y-0.5">
                  {[
                    { label: "Dashboard", active: true },
                    { label: "Dispensing", active: false },
                    { label: "Inventory", active: false },
                    { label: "Compliance", active: false },
                    { label: "Analytics", active: false },
                    { label: "Knowledge Hub", active: false },
                  ].map(({ label, active }) => (
                    <div
                      key={label}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        active
                          ? "bg-[#1A6B5C] font-medium text-white"
                          : "text-muted hover:bg-line"
                      }`}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>
              {/* Main content */}
              <div className="bg-white p-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { label: "Today's Sales", value: "TZS 124,500", trend: "+12%" },
                    { label: "Stock Alerts", value: "3 items", trend: "near-expiry" },
                    { label: "Compliance", value: "100%", trend: "all clear" },
                  ].map(({ label, value, trend }) => (
                    <div key={label} className="rounded-xl border border-line p-4">
                      <p className="text-xs text-muted">{label}</p>
                      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
                      <p className="mt-0.5 text-xs text-[#2A9478]">{trend}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 overflow-hidden rounded-xl border border-line">
                  <div className="border-b border-line bg-paper px-4 py-2.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">Recent Dispensing</p>
                  </div>
                  {[
                    { drug: "Amoxicillin 500mg", qty: "×2", status: "Safe" },
                    { drug: "Metformin 850mg", qty: "×1", status: "Safe" },
                    { drug: "Ibuprofen 400mg + Warfarin", qty: "×1", status: "Alert" },
                    { drug: "Paracetamol 500mg", qty: "×3", status: "Safe" },
                  ].map(({ drug, qty, status }) => (
                    <div
                      key={drug}
                      className="flex items-center justify-between border-t border-line px-4 py-3 text-sm"
                    >
                      <span className="text-ink">{drug}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted">{qty}</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            status === "Alert"
                              ? "bg-amber/10 text-amber"
                              : "bg-[#EDF7F3] text-[#1A6B5C]"
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Modules Grid ── */}
      <section className="border-t border-line bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
            <div>
              <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-[#1A6B5C]">
                Platform
              </p>
              <h2 className="mt-3 font-serif text-4xl font-semibold text-ink">
                Everything a pharmacy needs
              </h2>
              <p className="mt-4 text-muted">
                Six modules live in Phase 1. More shipping through 2026–2027.
              </p>
              <Link
                href="/platform"
                className="mt-6 inline-flex text-sm font-medium text-[#1A6B5C] hover:underline"
              >
                Explore the full platform &rarr;
              </Link>
            </div>
            <div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {LIVE_MODULES.map(({ icon: Icon, name, desc }) => (
                  <div key={name} className="rounded-xl border border-line bg-paper p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EDF7F3] text-[#1A6B5C]">
                      <Icon size={18} />
                    </div>
                    <h3 className="mt-4 text-sm font-semibold text-ink">{name}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {COMING_MODULES.map(({ name, phase }) => (
                  <span
                    key={name}
                    className="rounded-full border border-line bg-paper px-3 py-1.5 text-xs text-muted"
                  >
                    {name} &middot; Phase {phase}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tanzania Band ── */}
      <section className="bg-[#0D4035] py-24 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-[#7ECFB4]">
                Built for Tanzania
              </p>
              <h2 className="mt-3 font-serif text-4xl font-semibold lg:text-5xl">
                Tanzania&rsquo;s pharmacies are at an inflection point
              </h2>
              <p className="mt-5 leading-relaxed text-white/70">
                The Universal Health Insurance mandate requires dispensing records. TMDA enforcement
                is tightening. And 14,000+ independent pharmacies are still operating on paper
                records, WhatsApp messages, and single-point-of-sale tools built for retail —
                not clinical care.
              </p>
              <p className="mt-4 leading-relaxed text-white/70">
                APOTEKH was built for this moment — offline-first, regulation-aware, and priced
                for independent pharmacies across Tanzania.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/contact#waitlist"
                  className="inline-flex rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#0D4035] transition hover:bg-[#EDF7F3]"
                >
                  Get early access
                </Link>
                <Link
                  href="/about"
                  className="inline-flex rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/40"
                >
                  Our story &rarr;
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "14,000+", label: "Pharmacies and ADDOs in Tanzania" },
                { value: "TZS 243M", label: "Pharmaceutical market size (USD at current rates)" },
                { value: "6.1%", label: "Annual market growth rate (CAGR)" },
                { value: "UHI", label: "Universal Health Insurance mandate — dispensing records required" },
              ].map(({ value, label }) => (
                <div key={label} className="rounded-xl border border-white/10 p-6">
                  <p className="font-serif text-3xl font-semibold text-white">{value}</p>
                  <p className="mt-2 text-sm text-white/60">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Roles ── */}
      <section className="bg-paper py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-[#1A6B5C]">
            Who it&rsquo;s for
          </p>
          <h2 className="mt-3 font-serif text-4xl font-semibold text-ink">
            Every role in your pharmacy, covered
          </h2>
          <p className="mt-4 max-w-xl text-muted">
            Role-based access means each person sees exactly what they need — and nothing they shouldn&rsquo;t.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map(({ title, sub, items }) => (
              <div key={title} className="rounded-2xl border border-line bg-white p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDF7F3] text-[#1A6B5C]">
                  <Users size={18} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-xs text-muted">{sub}</p>
                <ul className="mt-5 space-y-2.5">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check size={13} className="mt-0.5 shrink-0 text-[#1A6B5C]" />
                      <span className="text-xs leading-relaxed text-muted">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="border-t border-line bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-[#1A6B5C]">
            Pricing
          </p>
          <h2 className="mt-3 font-serif text-4xl font-semibold text-ink">
            Priced for Tanzania&rsquo;s pharmaceutical reality
          </h2>
          <p className="mt-4 max-w-xl text-muted">
            All retail tiers include a 14-day free trial. Annual billing gives two months free.
            No hidden fees.
          </p>
          <div className="mt-10">
            <PricingToggle />
          </div>
          <Link
            href="/pricing"
            className="mt-6 inline-flex text-sm font-medium text-[#1A6B5C] hover:underline"
          >
            Full pricing details &rarr;
          </Link>
        </div>
      </section>

      {/* ── What's included ── */}
      <section className="bg-paper py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-3xl font-semibold text-ink">Everything included</h2>
          <p className="mt-3 text-muted">No add-ons. No separate tools. Every capability ships with your plan.</p>
          <div className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Pill, title: "FEFO Dispensing", body: "First-expiry-first-out enforced at every sale — no expired stock leaving the counter." },
              { icon: Bell, title: "Expiry Alerts", body: "90, 60, 30, 7, and 1-day warnings tracked automatically per batch." },
              { icon: Shield, title: "Drug Interaction Checks", body: "MINOR through CONTRAINDICATED screened before medicine leaves the counter." },
              { icon: Users, title: "Role-Based Access", body: "Staff see only what their role allows — dispensers, cashiers, owners, clerks, all separated." },
              { icon: Wifi, title: "Offline-First Sync", body: "Works without internet. Syncs all pending actions the moment connectivity returns." },
              { icon: ScanLine, title: "QR & Barcode Scanning", body: "Scan on intake and at the counter. Any phone camera or USB barcode reader." },
              { icon: Building2, title: "Multi-Branch Dashboard", body: "All your locations in one account. No jumping between logins." },
              { icon: CalendarCheck, title: "Compliance Calendar", body: "TMDA licences, inspections, and renewals tracked with early reminders." },
              { icon: FileText, title: "Receipts & PDF Export", body: "Professional dispensing receipts and printable records generated automatically." },
              { icon: BarChart3, title: "Analytics & Reporting", body: "Sales trends, stock movement, and compliance summaries in one management view." },
              { icon: Warehouse, title: "Supplier Catalogue", body: "Registered wholesale supplier products searchable directly inside APOTEKH." },
              { icon: ShieldCheck, title: "Permanent Audit Log", body: "Every override, void, and transaction permanently recorded — tamper-proof by design." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EDF7F3] text-[#1A6B5C]">
                  <Icon size={16} />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="border-t border-line bg-white py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-4xl font-semibold text-ink">Common questions</h2>
          <div className="mt-8">
            <FaqAccordion />
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-[#0D4035] py-24 text-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-[#7ECFB4]">
              Early access
            </p>
            <h2 className="mt-3 font-serif text-4xl font-semibold sm:text-5xl">
              Tanzania&rsquo;s pharmacies need this. Now.
            </h2>
            <p className="mt-4 text-white/70">
              Join the Arusha early access programme — 14-day free trial on every plan.
              No credit card required. Running in minutes.
            </p>
          </div>
          <div className="mt-10 rounded-2xl bg-white p-6 text-ink sm:p-8">
            <ContactForm variant="waitlist" />
          </div>
          <p className="mt-6 text-center text-sm text-white/50">
            Or reach us directly: elihaki.yusuph@gmail.com &middot; +255 764 591 374 &middot; @APOTEKH
          </p>
        </div>
      </section>
    </main>
  );
}
