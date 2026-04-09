import PricingToggle from "@/components/PricingToggle";
import Button from "@/components/ui/Button";
import { TIERS } from "@/lib/data/pricing";

export const metadata = {
  title: "Pricing - PharmaConnect",
  description: "Pilot pricing direction for PharmaConnect pharmacy teams.",
};

const faqs = [
  ["Is this a payments platform?", "No. PharmaConnect records payment method for dispensing and reconciliation. It does not move money or run settlement."],
  ["Can a pharmacy use it offline?", "The available core workflows are designed around offline-first expectations and queues work that cannot sync immediately."],
  ["Why is there a free ADDO tier?", "Adoption matters. The free tier supports essential workflows while pharmacies evaluate the pilot."],
  ["Do prices include implementation?", "Pilot implementation support is included for selected early partners; final commercial packaging is being validated."],
  ["Are future modules included?", "No. Future modules remain roadmap items until the current pharmacy operations backbone is reliable."],
  ["Does PharmaConnect store patient names?", "No. The higher-priority product rule locks the patient model to internal UUID and clinical flags only."],
];

export default function PricingPage() {
  return (
    <main className="bg-mist py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-5xl font-semibold text-slate">Pricing</h1>
        <p className="mt-5 max-w-3xl text-slate/70">
          Pilot pricing is structured to keep daily pharmacy operations adoptable
          before later roadmap differentiation is expanded.
        </p>
        <div className="mt-10">
          <PricingToggle />
        </div>

        <section className="mt-16 overflow-x-auto rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate">Feature comparison</h2>
          <table className="mt-6 w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate/10">
                <th className="sticky left-0 bg-white py-3">Feature</th>
                {TIERS.map((tier) => (
                  <th className="py-3" key={tier.id}>{tier.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Inventory", "Partial", "Yes", "Yes", "Yes", "Yes"],
                ["NHIF verification", "Yes", "Yes", "Yes", "Yes", "Partial"],
                ["Claim validation", "Partial", "Partial", "Yes", "Yes", "Partial"],
                ["Patient safety alerts", "No", "Partial", "Yes", "Yes", "No"],
                ["CPD Basic", "Partial", "Yes", "Yes", "Yes", "No"],
                ["Compliance tracker", "Yes", "Yes", "Yes", "Yes", "Yes"],
                ["Role workflows", "No", "Partial", "Yes", "Yes", "Yes"],
                ["Implementation support", "No", "Partial", "Yes", "Priority", "Priority"],
              ].map((row) => (
                <tr className="border-b border-slate/10" key={row[0]}>
                  {row.map((cell, index) => (
                    <td className={index === 0 ? "sticky left-0 bg-white py-3 font-semibold" : "py-3 text-slate/65"} key={`${row[0]}-${index}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-16 grid gap-4">
          <h2 className="text-2xl font-semibold text-slate">FAQ</h2>
          {faqs.map(([question, answer]) => (
            <details className="rounded-lg bg-white p-5 shadow-sm" key={question}>
              <summary className="cursor-pointer font-semibold text-slate">{question}</summary>
              <p className="mt-3 text-sm leading-7 text-slate/65">{answer}</p>
            </details>
          ))}
        </section>

        <section className="mt-16 rounded-lg bg-primary-dark p-8 text-white">
          <h2 className="font-serif text-3xl font-semibold">Ready to join the pilot?</h2>
          <p className="mt-3 text-white/70">Tell us about your pharmacy and we will respond within 48 hours.</p>
          <div className="mt-6">
            <Button href="/contact#waitlist" variant="outline">Join the pilot</Button>
          </div>
        </section>
      </div>
    </main>
  );
}
