"use client";

import { FormEvent, useMemo, useState } from "react";
import AvailabilityToggle from "@/components/AvailabilityToggle";
import ModuleCard from "@/components/ModuleCard";
import type { Module } from "@/lib/data/modules";

interface PlatformGridProps {
  modules: Module[];
}

export default function PlatformGrid({ modules }: PlatformGridProps) {
  const [activeAvailability, setActiveAvailability] = useState<"all" | "now" | "future">("all");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const visibleModules = useMemo(() => {
    if (activeAvailability === "all") {
      return modules;
    }
    if (activeAvailability === "future") {
      return modules.filter((module) => module.phase > 1);
    }
    return modules.filter((module) => module.phase === 1);
  }, [activeAvailability, modules]);

  async function onNotify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, phase: 2 }),
    });
    setStatus(response.ok ? "Notification request saved." : "Please enter a valid email.");
    if (response.ok) {
      setEmail("");
    }
  }

  return (
    <div>
      <AvailabilityToggle activeAvailability={activeAvailability} onChange={setActiveAvailability} />
      {activeAvailability === "future" ? (
        <form className="mt-6 flex max-w-xl flex-col gap-3 sm:flex-row" onSubmit={onNotify}>
          <input
            className="min-h-11 flex-1 rounded-lg border border-slate/15 px-3"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Notify me when future modules launch"
            required
            type="email"
            value={email}
          />
          <button
            className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white"
            type="submit"
          >
            Notify me
          </button>
          {status ? <p className="text-sm text-slate/60 sm:self-center">{status}</p> : null}
        </form>
      ) : null}
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {visibleModules.map((module) => (
          <ModuleCard module={module} key={module.id} />
        ))}
      </div>
    </div>
  );
}
