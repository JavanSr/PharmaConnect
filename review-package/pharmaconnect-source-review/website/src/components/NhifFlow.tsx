import { ChevronRight } from "lucide-react";

const steps = [
  ["Verify", "Patient presents NHIF card → member verified in < 3 seconds"],
  ["Dispense", "Medicine selected → ICD-10 code auto-suggested"],
  ["Validate", "Claims scrubber checks all 4 required fields"],
  ["Submit", "Batch submitted end-of-day via NHIF Breeze API"],
  ["Track", "Status tracked; rejected claims flagged with correction guidance"],
];

export default function NhifFlow() {
  return (
    <div>
      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max snap-x gap-4">
          {steps.map(([title, body], index) => (
            <div className="flex items-center gap-4" key={title}>
              <article className="min-w-[240px] snap-start rounded-xl border border-slate/10 bg-white p-5">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">{title}</p>
                <p className="mt-3 text-sm text-slate/70">{body}</p>
              </article>
              {index < steps.length - 1 ? <ChevronRight className="text-primary" size={18} /> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-amber/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate">
            Target: ≥70% NHIF claims acceptance rate across early access pharmacies.
          </p>
          <span className="text-xs font-semibold text-amber">70% target</span>
        </div>
        <div className="mt-4 h-3 rounded-full bg-white">
          <div className="relative h-3 rounded-full bg-amber" style={{ width: "70%" }}>
            <span className="absolute right-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary-dark" />
          </div>
        </div>
      </div>
    </div>
  );
}
