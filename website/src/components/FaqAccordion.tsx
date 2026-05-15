"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "Does APOTEKH work without internet?",
    a: "Yes. APOTEKH is offline-first — dispensing, stock updates, and safety checks all work without a connection. Data syncs automatically the moment connectivity returns. You never lose a sale or a record because of network problems.",
  },
  {
    q: "Which devices does it support?",
    a: "APOTEKH runs in any modern browser on desktop, tablet, or Android phone. A dedicated Android app is in active development for faster offline use at the dispensing counter.",
  },
  {
    q: "How does the QR and barcode scanner work?",
    a: "Use any phone camera or USB barcode reader. Scan a product during stock intake to auto-fill batch details, or scan at the dispensing counter to select and verify a medicine instantly. No separate hardware purchase required.",
  },
  {
    q: "How does the wholesale catalogue integration work?",
    a: "When your wholesale supplier is registered on APOTEKH, their catalogue is available directly inside your pharmacy account. You can browse stock, check prices, and record incoming deliveries — all linked to your inventory without re-entering data.",
  },
  {
    q: "Is patient data stored?",
    a: "No patient personal data is stored. All dispensing safety checks run on an anonymous session — no names, national IDs, or patient records are saved. This is by design and by PDPC guidance.",
  },
  {
    q: "Can I manage multiple pharmacy branches?",
    a: "Yes - ADDO includes a single-outlet Owner Dashboard. Basic (2 outlets) through Premium (5 outlets) add multi-outlet Owner Dashboard visibility with live revenue, stock levels, and compliance status. Enterprise supports unlimited outlets.",
  },
  {
    q: "How does pricing work?",
    a: "Retail subscriptions start at Tsh 20,000/month for ADDOs and scale to Tsh 75,000/month for Premium (5 outlets, 20 users). All retail tiers include a 14-day free trial. Annual billing gives two months free. Wholesale and Enterprise pricing is separate — contact us to discuss.",
  },
];

export default function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="divide-y divide-slate/10">
      {FAQS.map((faq, i) => (
        <div key={i}>
          <button
            className="flex w-full items-center justify-between gap-4 py-5 text-left"
            onClick={() => setOpen(open === i ? null : i)}
            type="button"
            aria-expanded={open === i}
          >
            <span className="text-base font-medium text-slate">{faq.q}</span>
            <ChevronDown
              size={18}
              className={cn(
                "shrink-0 text-primary transition-transform duration-200",
                open === i && "rotate-180",
              )}
            />
          </button>
          {open === i && (
            <p className="pb-5 text-sm leading-relaxed text-slate/65">{faq.a}</p>
          )}
        </div>
      ))}
    </div>
  );
}
