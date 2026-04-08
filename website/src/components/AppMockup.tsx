export default function AppMockup() {
  const lines = ["Amoxicillin 500mg", "Omeprazole 20mg", "Paracetamol 500mg"];

  return (
    <div className="rotate-1 rounded-lg border border-primary/20 bg-white p-4 shadow-xl">
      <div className="rounded-lg border border-slate/10 bg-mist p-4">
        <div className="flex items-center justify-between rounded-lg bg-white p-4">
          <span className="text-xs font-semibold uppercase text-slate/50">
            Patient UUID
          </span>
          <span className="font-mono text-sm font-semibold text-primary">
            PC-2026-04721
          </span>
        </div>
        <div className="mt-3 rounded-lg border border-amber bg-amber/10 p-4 text-sm text-slate">
          <strong>Moderate interaction detected</strong>
          <p className="mt-1 text-slate/65">Warfarin + Aspirin requires review.</p>
        </div>
        <div className="mt-3 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
          Member verified
        </div>
        <div className="mt-4 grid gap-3">
          {lines.map((line) => (
            <div
              className="flex items-center justify-between rounded-lg bg-white p-3 text-sm"
              key={line}
            >
              <span className="font-medium">{line}</span>
              <span className="rounded-full bg-amber/10 px-2 py-1 text-xs font-semibold text-amber">
                FEFO
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
