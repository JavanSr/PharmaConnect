const severities = [
  ["MINOR", "#FCD34D", "Counselling note and routine pharmacist awareness.", "No"],
  ["MODERATE", "#D97706", "Review before completing the dispensing event.", "No"],
  ["MAJOR", "#EF4444", "Pharmacist decision and documented rationale required.", "Yes"],
  ["CONTRAINDICATED", "#991B1B", "Block unless pharmacist PIN override is recorded.", "Yes"],
] as const;

export default function SeveritySpectrum() {
  return (
    <div className="grid gap-3 rounded-lg border border-slate/10 bg-mist p-5">
      {severities.map(([label, color, description, pin]) => (
        <div className="rounded-lg bg-white p-4 shadow-sm" key={label}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: color }}
              />
              <p className="font-mono text-xs font-semibold text-slate">{label}</p>
            </div>
            {pin === "Yes" ? (
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                PIN required
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-slate/65">{description}</p>
          <div className="mt-3 h-2 rounded-full bg-slate/10">
            <div
              className="h-2 rounded-full"
              style={{
                backgroundColor: color,
                width:
                  label === "MINOR"
                    ? "25%"
                    : label === "MODERATE"
                      ? "50%"
                      : label === "MAJOR"
                        ? "75%"
                        : "100%",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
