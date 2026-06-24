import { notFound } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ModuleCard from "@/components/ModuleCard";
import { MODULES, type Module } from "@/lib/data/modules";
import { Check } from "lucide-react";

interface ModulePageProps {
  params: { module: string };
}

export function generateStaticParams() {
  return MODULES.map((module) => ({ module: module.slug }));
}

export function generateMetadata({ params }: ModulePageProps) {
  const currentModule = MODULES.find((item) => item.slug === params.module);
  if (!currentModule) {
    return { title: "Module - APOTEKH" };
  }
  return {
    title: `${currentModule.name} - APOTEKH`,
    description: currentModule.description,
  };
}

export default function ModulePage({ params }: ModulePageProps) {
  const currentModule = MODULES.find((item) => item.slug === params.module);

  if (!currentModule) {
    notFound();
  }

  const relatedModules: Module[] = currentModule.relatedModules
    .map((slug) => MODULES.find((item) => item.slug === slug))
    .filter((item): item is Module => Boolean(item));

  return (
    <main className="bg-white">
      {/* Header */}
      <section className="bg-primary-dark py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-white/40">
            <a href="/platform" className="hover:text-white/70 transition-colors">Platform</a>
            {" / "}
            {currentModule.name}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Badge variant={currentModule.available ? "primary" : "coming-soon"}>
              {currentModule.available ? "Available now" : "Coming soon"}
            </Badge>
            <span className="font-mono text-sm text-white/40">{currentModule.id}</span>
          </div>
          <h1 className="mt-5 font-serif text-4xl font-semibold text-white sm:text-5xl">
            {currentModule.name}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/70">
            {currentModule.description}
          </p>
          <div className="mt-8">
            <Button href="/contact" variant="amber">
              {currentModule.available ? "Get access — 14-day free trial" : "Request early access"}
            </Button>
          </div>
        </div>
      </section>

      {/* Coming soon notice */}
      {!currentModule.available && (
        <div className="border-b border-amber/20 bg-amber/5 px-4 py-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="text-sm text-slate/70">
              <span className="font-semibold text-slate">Coming soon.</span>{" "}
              This module is in active development. Register your interest and you will be
              among the first pharmacies to receive it when it launches.
            </p>
          </div>
        </div>
      )}

      {/* How it works + features */}
      <section className="py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
            {/* How it works */}
            <div className="rounded-xl bg-mist p-6">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                How it works
              </p>
              <p className="mt-4 leading-8 text-slate/70">
                {currentModule.howItWorks}
              </p>
            </div>

            {/* Feature list */}
            <div className="rounded-xl border border-slate/10 p-6">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                What it does
              </p>
              <ul className="mt-4 grid gap-3">
                {currentModule.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check size={16} className="mt-0.5 shrink-0 text-primary" />
                    <span className="text-sm leading-relaxed text-slate/70">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Acceptance criteria */}
      <section className="border-t border-slate/10 py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Acceptance criteria
          </p>
          <p className="mt-2 text-sm text-slate/55">
            These are the measurable outcomes that define when this module is working correctly.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {currentModule.acceptanceCriteria.map((item) => (
              <li
                key={item}
                className="rounded-lg border border-slate/10 bg-mist px-4 py-3 text-sm text-slate/70"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Related modules */}
      {relatedModules.length > 0 && (
        <section className="border-t border-slate/10 py-12">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Related modules
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {relatedModules.map((related) => (
                <ModuleCard key={related.id} mini module={related} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-primary-dark py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-3xl font-semibold text-white">
            {currentModule.available
              ? "Start your 14-day free trial"
              : "Get notified when this module launches"}
          </h2>
          <p className="mt-3 max-w-xl text-white/65">
            {currentModule.available
              ? "Full platform access from day one. No card required."
              : "Leave your details and we will reach out as soon as this module is ready."}
          </p>
          <div className="mt-8">
            <Button href="/contact">
              {currentModule.available ? "Get access" : "Register interest"}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
