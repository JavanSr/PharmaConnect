import { AlertCircle } from "lucide-react";
import AnimatedSection from "@/components/ui/AnimatedSection";

const bars = [
  { label: "MINOR", color: "#FCD34D", description: "Counselling recommended", pin: false },
  { label: "MODERATE", color: "#D97706", description: "Pharmacist review required", pin: false },
  { label: "MAJOR", color: "#EF4444", description: "Pharmacist PIN required", pin: true },
  { label: "CONTRAINDICATED", color: "#991B1B", description: "Dispensing blocked", pin: true },
];

export default function SeveritySpectrum() {
  return (
    <div className="grid gap-4">
      {bars.map((bar, index) => (
        <AnimatedSection delay={index * 0.08} direction="left" key={bar.label}>
          <div className="rounded-xl p-4 text-white" style={{ backgroundColor: bar.color }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5" size={18} />
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em]">{bar.label}</p>
                  <p className="mt-2 text-sm">{bar.description}</p>
                </div>
              </div>
              {bar.pin ? (
                <span className="rounded-full bg-slate px-3 py-1 text-xs text-white">PIN required</span>
              ) : null}
            </div>
          </div>
        </AnimatedSection>
      ))}
    </div>
  );
}
