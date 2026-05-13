import { notFound } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ModuleCard from "@/components/ModuleCard";
import { MODULES, type Module } from "@/lib/data/modules";

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
    <main className="bg-white py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <p className="text-sm text-slate/50">Platform / {currentModule.name}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Badge variant={currentModule.available ? "primary" : "coming-soon"}>
            {currentModule.available ? "Available now" : "Coming soon"}
          </Badge>
          <span className="font-mono text-sm text-slate/50">{currentModule.id}</span>
        </div>
        <h1 className="mt-5 font-serif text-5xl font-semibold text-slate">
          {currentModule.name}
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-slate/70">
          {currentModule.description}
        </p>

        {!currentModule.available ? (
          <div className="mt-8 rounded-lg border border-amber/30 bg-amber/10 p-5 text-sm text-slate">
            This feature is coming soon. Request access to be among the first pharmacies
            to receive it when it is available.
          </div>
        ) : null}

        <section className="mt-12 grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
          <details className="rounded-lg bg-mist p-6" open>
            <summary className="cursor-pointer text-lg font-semibold text-slate">
              How it works
            </summary>
            <p className="mt-4 text-sm leading-7 text-slate/70">
              {currentModule.howItWorks}
            </p>
          </details>
          <div className="rounded-lg border border-slate/10 p-6">
            <h2 className="text-lg font-semibold text-slate">What it does</h2>
            <ul className="mt-4 grid gap-3 text-sm text-slate/70">
              {currentModule.features.map((feature) => (
                <li className="rounded-lg bg-primary-light/60 p-3" key={feature}>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <details className="mt-8 rounded-lg border border-slate/10 p-6">
          <summary className="cursor-pointer text-lg font-semibold text-slate">
            Acceptance criteria
          </summary>
          <ul className="mt-4 grid gap-2 text-sm text-slate/70">
            {currentModule.acceptanceCriteria.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </details>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate">Related modules</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {relatedModules.map((related) => (
              <ModuleCard key={related.id} mini module={related} />
            ))}
          </div>
        </section>

        <div className="mt-10">
          <Button href="/contact#waitlist">Get access</Button>
        </div>
      </div>
    </main>
  );
}
