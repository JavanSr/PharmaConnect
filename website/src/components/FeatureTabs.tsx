"use client";

import { useState } from "react";
import { BarChart3, Check, Package, Pill, Shield, ShieldCheck } from "lucide-react";

const TABS = [
  {
    id: "dispensing",
    label: "Dispensing",
    icon: Pill,
    headline: "Safe dispensing at every counter",
    body: "Every sale runs through a controlled flow — product selection, drug interaction checking, FEFO guidance, and payment — without double entry or skipped safety steps.",
    features: [
      "Drug interaction checking — MINOR through CONTRAINDICATED",
      "FEFO guidance on every product selection",
      "Barcode scan to select and verify in one tap",
      "Anonymous session — no patient names or IDs stored",
      "Dispensing receipt generated automatically",
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Package,
    headline: "Batch-level control from intake to sale",
    body: "Every product tracked by batch, expiry, and supplier. Alerts at five expiry windows. FEFO enforced at every sale. All adjustments stay fully auditable.",
    features: [
      "Batch and expiry tracked from intake",
      "Alerts at 90, 60, 30, 7, and 1-day windows",
      "Low-stock and near-expiry banners always visible",
      "QR and barcode scanning on intake",
      "Offline-ready — all changes sync when reconnected",
    ],
  },
  {
    id: "safety",
    label: "Patient Safety",
    icon: Shield,
    headline: "Clinical checks built into every sale",
    body: "APOTEKH checks interactions, contraindications, and allergy flags before medicine leaves the counter — on every tier, at no extra cost.",
    features: [
      "4-level severity: MINOR, MODERATE, MAJOR, CONTRAINDICATED",
      "8 contraindication flags including pregnancy and renal failure",
      "Dose range checking for paediatrics and adults",
      "Override logging with pharmacist justification",
      "Never tier-gated — full Clinical Decision Support on every plan",
    ],
  },
  {
    id: "compliance",
    label: "Compliance",
    icon: ShieldCheck,
    headline: "Every deadline visible before it becomes a crisis",
    body: "TMDA licences, PC registrations, and inspection dates — tracked with colour-coded status, early reminders, and evidence upload in one place.",
    features: [
      "TMDA and Pharmacy Council licence tracking built in",
      "Colour-coded status: green, amber, red, overdue",
      "Reminders before every deadline — configurable",
      "Evidence attachment and non-editable audit trail",
      "EFDMS integration runs silently in the background",
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    headline: "Manage your pharmacy from anywhere",
    body: "Sales trends, stock movement, and compliance summaries on any device. Owners see every branch in one account — no separate logins, no WhatsApp reports.",
    features: [
      "Daily and monthly sales performance",
      "Stock movement and dead-stock scoring",
      "Compliance status across all branches",
      "Multi-branch visibility in one account",
      "Exportable reports for management review",
    ],
  },
];

export default function FeatureTabs() {
  const [active, setActive] = useState(0);
  const tab = TABS[active];
  const Icon = tab.icon;

  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-[#1A6B5C]">
          What it does
        </p>
        <h2 className="mt-3 font-serif text-4xl font-semibold text-[#0D4035] lg:text-5xl">
          Built for every part of pharmacy work
        </h2>

        {/* Tab bar */}
        <div className="mt-10 flex flex-wrap gap-2 border-b border-[#E2EDE8]">
          {TABS.map((t, i) => {
            const TabIcon = t.icon;
            const isActive = i === active;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(i)}
                className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-[#1A6B5C] text-[#1A6B5C]"
                    : "border-transparent text-[#516965] hover:text-[#0D4035]"
                }`}
              >
                <TabIcon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EDF7F3] text-[#1A6B5C]">
              <Icon size={22} />
            </div>
            <h3 className="mt-5 font-serif text-3xl font-semibold text-[#0D4035]">
              {tab.headline}
            </h3>
            <p className="mt-4 text-[#516965] leading-relaxed">{tab.body}</p>
            <ul className="mt-7 space-y-3">
              {tab.features.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check size={15} className="mt-0.5 shrink-0 text-[#1A6B5C]" />
                  <span className="text-sm text-[#0D4035]">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Mini mockup panel */}
          <div className="rounded-2xl border border-[#E2EDE8] bg-[#F7FBF8] p-6 lg:p-8">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#516965]">{tab.label} · Live view</span>
                <span className="rounded-full bg-[#EDF7F3] px-2.5 py-1 font-mono text-xs text-[#1A6B5C]">
                  ● Active
                </span>
              </div>
              <div className="rounded-xl border border-[#E2EDE8] bg-white p-4">
                <div className="h-2 w-32 rounded bg-[#E2EDE8]" />
                <div className="mt-3 space-y-2">
                  {[80, 60, 90, 50, 70].map((w, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-2 rounded bg-[#EDF7F3]" style={{ width: `${w}%` }} />
                      <div className="h-1.5 w-8 rounded bg-[#E2EDE8]" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#E2EDE8] bg-white p-4">
                  <div className="h-1.5 w-16 rounded bg-[#E2EDE8]" />
                  <div className="mt-2 h-6 w-24 rounded bg-[#D6F0E8]" />
                </div>
                <div className="rounded-xl border border-[#E2EDE8] bg-white p-4">
                  <div className="h-1.5 w-14 rounded bg-[#E2EDE8]" />
                  <div className="mt-2 h-6 w-20 rounded bg-[#EDF7F3]" />
                </div>
              </div>
              <div className="rounded-xl border border-[#E8913A]/20 bg-[#F6C58A]/10 p-4">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#E8913A]" />
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-40 rounded bg-[#E8913A]/30" />
                    <div className="h-1.5 w-28 rounded bg-[#E8913A]/20" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
