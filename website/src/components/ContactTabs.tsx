"use client";

import { useState } from "react";
import ContactForm from "@/components/ContactForm";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "pilot", label: "Join the pilot" },
  { id: "investor", label: "Investor inquiry" },
  { id: "partner", label: "Partnership inquiry" },
] as const;

export default function ContactTabs() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("pilot");

  return (
    <div>
      <div className="flex flex-wrap gap-4 border-b border-slate/10">
        {tabs.map((tab) => (
          <button
            className={cn(
              "-mb-px border-b-2 px-1 pb-3 text-sm font-semibold transition",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-slate/50 hover:text-primary",
            )}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-8">
        <ContactForm variant={activeTab} />
      </div>
    </div>
  );
}
