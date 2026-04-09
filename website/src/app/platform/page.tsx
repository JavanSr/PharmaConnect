import PlatformGrid from "@/components/PlatformGrid";
import { MODULES } from "@/lib/data/modules";

export const metadata = {
  title: "Platform - PharmaConnect",
  description: "The PharmaConnect module roadmap across available and future work.",
};

export default function PlatformPage() {
  return (
    <main className="bg-mist py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Platform
        </p>
        <h1 className="mt-3 font-serif text-5xl font-semibold text-slate">
          Pharmacy operations, built around real availability
        </h1>
        <p className="mt-5 max-w-3xl text-slate/70">
          Core pharmacy workflows are shown as available now. Other modules are
          visible for future availability and are not active product functionality yet.
        </p>
        <div className="mt-10">
          <PlatformGrid modules={MODULES} />
        </div>
      </div>
    </main>
  );
}
