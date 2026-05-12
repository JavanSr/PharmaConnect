import Badge from "@/components/ui/Badge";
import { MODULES } from "@/lib/data/modules";

export const metadata = {
  title: "Roadmap - PharmaConnect",
  description: "The PharmaConnect roadmap across available and future modules.",
};

const groups = [
  {
    title: "Available now",
    description: "Seven modules available now — Dashboard, Inventory, Dispensing, Compliance Tracker, Knowledge Hub, CPD Tracker, and Analytics.",
    modules: MODULES.filter((module) => module.available),
  },
  {
    title: "Coming soon",
    description: "More modules are coming soon — analytics, supply chain, and government system integration are all on the way.",
    modules: MODULES.filter((module) => !module.available),
  },
];

export default function RoadmapPage() {
  return (
    <main className="bg-mist py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Badge>Available now</Badge>
        <h1 className="mt-5 font-serif text-5xl font-semibold text-slate">
          Roadmap
        </h1>
        <p className="mt-5 max-w-3xl text-slate/70">
          Privacy-by-design, offline-first, NHIF readiness, and cautious
          interoperability guide the product sequence.
        </p>
        <div className="mt-10 grid gap-6">
          {groups.map((group) => (
            <section className="rounded-lg bg-white p-6 shadow-sm" key={group.title}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <Badge variant={group.title === "Available now" ? "primary" : "coming-soon"}>
                    {group.title}
                  </Badge>
                  <h2 className="mt-3 text-2xl font-semibold text-slate">
                    {group.description}
                  </h2>
                </div>
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {group.modules.map((module) => (
                  <div
                    className="rounded-lg border border-slate/10 bg-mist p-4"
                    key={module.id}
                  >
                    <p className="font-mono text-xs text-slate/45">{module.id}</p>
                    <p className="mt-1 font-semibold text-slate">{module.name}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                      {group.title}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
