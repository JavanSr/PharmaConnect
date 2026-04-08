const steps = [
  ["Verify", "Patient presents NHIF card. Member is verified via Breeze API in under 3 seconds."],
  ["Dispense", "Drug is dispensed and ICD-10 context is captured for claim readiness."],
  ["Validate", "Claims scrubber checks required fields, diagnosis code, item, and member status."],
  ["Submit", "Batch is submitted through the NHIF pathway at the end of the day."],
  ["Track", "Status is tracked and rejected claims are flagged for follow-up."],
] as const;

export default function NhifFlow() {
  return (
    <div>
      <div className="overflow-x-auto pb-4 [scroll-snap-type:x_mandatory]">
        <div className="flex min-w-[920px] gap-4">
          {steps.map(([title, body], index) => (
            <div className="flex flex-1 items-center gap-4" key={title}>
              <article className="min-h-44 flex-1 scroll-ml-4 rounded-lg bg-white p-5 shadow-sm [scroll-snap-align:start]">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {index + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate/65">{body}</p>
              </article>
              {index < steps.length - 1 ? (
                <span className="text-2xl font-bold text-primary">→</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 rounded-lg bg-amber/10 p-5">
        <p className="text-sm font-semibold text-slate">
          Target: ≥70% NHIF claims success rate across pilot pharmacies during the current rollout
        </p>
        <div className="relative mt-4 h-3 rounded-full bg-white">
          <div className="h-3 w-0 rounded-full bg-primary" />
          <div className="absolute left-[70%] top-[-6px] h-6 w-0.5 bg-amber" />
          <span className="absolute left-[70%] top-5 -translate-x-1/2 text-xs font-semibold text-amber">
            70%
          </span>
        </div>
      </div>
    </div>
  );
}
