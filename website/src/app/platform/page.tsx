import PlatformGrid from "@/components/PlatformGrid";
import { MODULES } from "@/lib/data/modules";

export const metadata = {
  title: "Platform - APOTEKH",
  description: "Seven modules built for Tanzania's pharmacies and ADDOs.",
};

const availableModules = MODULES.filter((m) => m.available);

export default function PlatformPage() {
  return (
    <main className="bg-mist py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Platform
        </p>
        <h1 className="mt-3 font-serif text-5xl font-semibold text-slate">
          Everything a pharmacy needs to operate, protect, and grow
        </h1>
        <p className="mt-5 max-w-3xl text-slate/70">
          Six modules built for Tanzania&apos;s pharmaceutical environment.
        </p>
        <div className="mt-10">
          <PlatformGrid hideFilter modules={availableModules} />
        </div>
      </div>
    </main>
  );
}
