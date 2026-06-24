import StatCard from "@/components/ui/StatCard";
import AnimatedSection from "@/components/ui/AnimatedSection";
import Button from "@/components/ui/Button";
import Link from "next/link";

export const metadata = {
  title: "About - APOTEKH",
  description:
    "Elihaki M. Y. Javan — Pharmaceutical Technologist and founder of APOTEKH, the pharmacy-side platform built for Tanzania's 14,000+ pharmacies and ADDOs.",
};

const STATS = [
  { value: "14,000", label: "Pharmacies and ADDOs in Tanzania that need better tools", suffix: "+" },
  { value: 6, label: "Modules available at launch — dispensing, inventory, compliance, analytics, knowledge, dashboard", suffix: "" },
  { value: 14, label: "Day free trial on every retail tier, no card required", suffix: "-day" },
  { value: "100", label: "% offline-capable — every core workflow runs without a connection", suffix: "%" },
];

const TIMELINE = [
  {
    period: "2023",
    title: "Problem identified",
    body: "Working across community pharmacies, hospital stores, and supply chain operations, Elihaki found the same gap everywhere: pharmacy teams managing stock, expiry, compliance deadlines, and clinical decisions across paper logs, WhatsApp groups, and disconnected spreadsheets.",
  },
  {
    period: "2024",
    title: "Built in the field",
    body: "APOTEKH was designed for Tanzania's real conditions — intermittent internet, mixed device ownership, TMDA regulatory requirements, and FEFO discipline as a patient safety obligation, not just a warehouse rule.",
  },
  {
    period: "2025",
    title: "Phase 1 pilot — Arusha",
    body: "Retail pharmacies and ADDOs in Arusha started using APOTEKH for live dispensing, inventory control, and compliance tracking. Six modules are now live. Expansion across Tanzania is underway.",
  },
];

const OPEN_ROLES = [
  {
    role: "Technical co-founder / senior engineer",
    terms: "Equity discussion",
    note: "Full-stack or backend-first. The system is Node.js / PostgreSQL / React — production, not prototype.",
  },
  {
    role: "Clinical / regulatory advisor",
    terms: "Advisor equity or early-stage partnership",
    note: "Pharmacist or pharmaceutical technologist with TMDA or policy experience preferred.",
  },
];

export default function AboutPage() {
  return (
    <main>
      {/* Stats banner — dark teal */}
      <section className="bg-primary-dark py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary-mid">
            About APOTEKH
          </p>
          <h1 className="mt-4 font-serif text-4xl font-semibold text-white sm:text-5xl">
            Built for Tanzania&apos;s pharmaceutical reality
          </h1>
          <p className="mt-5 max-w-3xl text-white/65">
            APOTEKH is the operating system for pharmacies and ADDOs across Tanzania — offline-first,
            clinically rigorous, and built by someone who worked in the system it serves.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s) => (
              <StatCard key={s.label} value={s.value} label={s.label} suffix={s.suffix} />
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <AnimatedSection className="bg-mist py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Mission
              </p>
              <h2 className="mt-4 font-serif text-3xl font-semibold text-slate">
                Powering Pharmacies. Protecting Patients.
              </h2>
              <p className="mt-5 leading-8 text-slate/70">
                Tanzania&apos;s Universal Health Insurance expansion made stock discipline, patient
                safety, and compliance readiness more urgent than ever. Independent pharmacies and
                ADDOs bear that burden with paper registers, shared WhatsApp groups, and manual
                expiry checks.
              </p>
              <p className="mt-4 leading-8 text-slate/70">
                APOTEKH replaces that friction with a single platform that is always online when
                the internet is, always available when it is not, and always keeping the clinical
                checks running regardless.
              </p>
            </div>
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Design principles
              </p>
              <ul className="mt-4 grid gap-4">
                {[
                  ["Offline-first", "Every core workflow runs without a connection. Data syncs automatically when connectivity returns — no lost sales, no skipped safety checks."],
                  ["Privacy by design", "No patient names or IDs are stored anywhere in the system. Clinical checks run on anonymous sessions by design, not as an afterthought."],
                  ["Clinical checks on every tier", "Drug interaction checking, contraindication alerts, and dose guidance are never tier-gated. Every pharmacy, regardless of subscription level, gets the full Clinical Decision Support Suite."],
                  ["Auditable, not editable", "Override logs and compliance records are write-once. No role — not even SUPER_ADMIN — can delete a dispensing override record. That is by design and by law."],
                ].map(([title, body]) => (
                  <li key={title} className="rounded-lg border border-slate/10 bg-white p-4 shadow-sm">
                    <p className="font-semibold text-slate">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate/65">{body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Founder */}
      <AnimatedSection className="bg-white py-16" delay={0.1}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Founder
          </p>
          <div className="mt-8 grid gap-10 lg:grid-cols-[auto_1fr] lg:gap-16">
            <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl bg-primary-light font-serif text-4xl font-semibold text-primary lg:h-40 lg:w-40 lg:text-5xl">
              EMJ
            </div>
            <div>
              <h2 className="font-serif text-3xl font-semibold text-slate">
                Elihaki M. Y. Javan
              </h2>
              <p className="mt-1 text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                Pharmaceutical Technologist · Dodoma, Tanzania
              </p>
              <p className="mt-5 leading-8 text-slate/70">
                Elihaki has worked across community pharmacies, hospital pharmacy departments,
                medical supplies supply chain, and professional association activity throughout
                Tanzania. That exposure — the stock shortages, the paper FEFO logs, the
                WhatsApp compliance reminders, the near-misses at the dispensing counter —
                is the design specification for APOTEKH.
              </p>
              <blockquote className="mt-6 border-l-4 border-primary pl-5 font-serif text-xl italic text-slate">
                &quot;APOTEKH is not a startup idea. It is the tool I needed and could not find.
                So I decided to build it.&quot;
              </blockquote>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Timeline */}
      <AnimatedSection className="bg-mist py-16" delay={0.1}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Journey
          </p>
          <h2 className="mt-4 font-serif text-3xl font-semibold text-slate">
            From field observation to live system
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {TIMELINE.map((item) => (
              <div
                key={item.period}
                className="rounded-xl border border-slate/10 bg-white p-6 shadow-sm"
              >
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {item.period}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-slate">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate/65">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Open roles */}
      <AnimatedSection className="bg-white py-16" delay={0.1}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Team
          </p>
          <h2 className="mt-4 font-serif text-3xl font-semibold text-slate">
            Actively recruiting
          </h2>
          <p className="mt-4 max-w-2xl text-slate/70">
            APOTEKH is a single-founder build at Phase 1. The right co-founders and advisors
            will shape how it scales. Conversations are welcome.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {OPEN_ROLES.map((r) => (
              <div
                key={r.role}
                className="rounded-xl border border-slate/10 bg-mist p-6"
              >
                <h3 className="font-semibold text-slate">{r.role}</h3>
                <p className="mt-1 text-sm font-semibold text-primary">{r.terms}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate/65">{r.note}</p>
                <Link
                  href="mailto:support@apotekh.co.tz"
                  className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
                >
                  support@apotekh.co.tz
                </Link>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Legal */}
      <AnimatedSection className="bg-primary-dark py-16" delay={0.05}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary-mid">
            Legal &amp; compliance
          </p>
          <h2 className="mt-4 font-serif text-2xl font-semibold text-white">
            Company details
          </h2>
          <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Registration", "Tanzania Companies Act Cap 212 — registration underway"],
              ["PDPC", "Data protection registration — pending April 2026"],
              ["BRELA", "Business registration — underway"],
              ["VFD integration", "TRA Electronic Fiscal Device — underway for compliant digital dispensing"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-5">
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">
                  {label}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-white/75">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-10">
            <Button href="/contact" variant="amber">
              Get in touch
            </Button>
          </div>
        </div>
      </AnimatedSection>
    </main>
  );
}
