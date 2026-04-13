import { cookies } from "next/headers";
import InvestorGate from "@/components/InvestorGate";

export const metadata = {
  title: "Investors - PharmaConnect",
  description: "Investor access for PharmaConnect.",
};

const fundingTargets = [
  ["FUNGUO", "Grant", "Launch support and adoption acceleration"],
  ["TEF", "Entrepreneurship support", "Founder development and rollout readiness"],
  ["i3", "Health innovation", "Digital health acceleration"],
  ["HTHA", "Health tech", "Clinical and operational validation"],
  ["Angel", "Equity", "Product and go-to-market runway"],
];

export default function InvestorsPage() {
  const hasAccess =
    cookies().get("pharmaconnect_investor_access")?.value === "granted";

  if (!hasAccess) {
    return (
      <main className="bg-mist py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-serif text-5xl font-semibold text-slate">Investors</h1>
          <p className="mt-5 max-w-3xl text-slate/70">
            Request the investor access code by email, then enter the code to view the
            full investor brief. The code is delivered through Resend when configured.
          </p>
          <p className="mt-3 max-w-3xl text-sm text-slate/55">
            Access is protected by an HTTP-only cookie for 24 hours after a successful
            code entry.
          </p>
          <div className="mt-10">
            <InvestorGate />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-mist py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-5xl font-semibold text-slate">
          Investor Brief
        </h1>
        <p className="mt-5 max-w-4xl text-slate/70">
          PharmaConnect is a pharmacy-side operating system for Tanzania and East
          Africa, prioritizing current adoption through NHIF claims readiness,
          inventory reliability, compliance, patient safety basics, Knowledge Hub, and
          CPD Basic.
        </p>

        <section className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            ["Current focus", "Arusha launch and pharmacy adoption"],
            ["Revenue", "Subscription tiers from ADDO to wholesale"],
            ["Moat", "Healthcare-specific workflows and compliance trust"],
          ].map(([label, value]) => (
            <article className="rounded-lg bg-white p-6 shadow-sm" key={label}>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                {label}
              </h2>
              <p className="mt-4 text-2xl font-semibold text-slate">{value}</p>
            </article>
          ))}
        </section>

        <section className="mt-12 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate">Funding targets</h2>
          <table className="mt-5 w-full text-left text-sm">
            <tbody>
              {fundingTargets.map(([source, type, purpose]) => (
                <tr className="border-b border-slate/10" key={source}>
                  <td className="py-3 font-semibold text-slate">{source}</td>
                  <td className="py-3 text-slate/65">{type}</td>
                  <td className="py-3 text-slate/65">{purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-12 grid gap-5 lg:grid-cols-2">
          <article className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate">Use of funds</h2>
            <div className="mt-6 grid gap-3">
              {[
                ["Product engineering", "40%"],
                ["Launch implementation", "25%"],
                ["Regulatory and security", "15%"],
                ["Go-to-market", "15%"],
                ["Operations", "5%"],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="flex justify-between text-sm font-semibold text-slate">
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate/10">
                    <div className="h-2 rounded-full bg-primary" style={{ width: value }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate">Equity structure</h2>
            <p className="mt-4 text-slate/70">
              Founder-led with early-stage equity reserved for strategic capital,
              technical execution, and high-trust healthcare partnerships. Cap table and equity documents are available to verified investors on request.
              Contact: elihaki.yusuph@gmail.com
            </p>
            <p className="mt-6 text-sm font-semibold text-primary">
              Founder contact: elihaki.yusuph@gmail.com / +255 764 591 374
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
