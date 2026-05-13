"use client";

import { useState } from "react";
import ContactForm from "@/components/ContactForm";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Get access", value: "waitlist" as const },
  { label: "Investor inquiry", value: "investor" as const },
  { label: "Partnership inquiry", value: "partner" as const },
];

export default function ContactTabs() {
  const [active, setActive] = useState<(typeof tabs)[number]["value"]>("waitlist");

  return (
    <div>
      <div className="flex flex-wrap gap-6 border-b border-slate/10 pb-3">
        {tabs.map((tab) => {
          const selected = tab.value === active;
          return (
            <button
              className={cn(
                "border-b-2 pb-3 text-sm transition",
                selected ? "border-primary font-medium text-primary" : "border-transparent text-slate/50",
              )}
              key={tab.value}
              onClick={() => setActive(tab.value)}
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="mt-6">
        <ContactForm variant={active} />
      </div>
    </div>
  );
}
