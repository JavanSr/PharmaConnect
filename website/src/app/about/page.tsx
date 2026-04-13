export const metadata = {
  title: "About - PharmaConnect",
  description: "Elihaki M. Y. Javan — Pharmaceutical Technologist and founder of PharmaConnect, the pharmacy-side platform built for Tanzania's 14,000+ pharmacies and ADDOs.",
};

export default function AboutPage() {
  return (
    <main className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-5xl font-semibold text-slate">
          About PharmaConnect
        </h1>
        <section className="mt-8 rounded-lg bg-mist p-8">
          <h2 className="text-2xl font-semibold text-slate">Mission and vision</h2>
          <p className="mt-4 text-lg leading-8 text-slate/70">
            Tanzania&apos;s Universal Health Insurance launch made pharmacy-side claim
            readiness, stock discipline, patient safety, and compliance more urgent.
            PharmaConnect exists to make those daily workflows easier, safer, and more
            auditable for pharmacies and ADDOs.
          </p>
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-[280px_1fr]">
          <div className="flex h-48 w-48 items-center justify-center rounded-full bg-primary-light font-serif text-5xl font-semibold text-primary">
            EMJ
          </div>
          <div>
            <h2 className="text-3xl font-semibold text-slate">
              Elihaki M. Y. Javan
            </h2>
            <p className="mt-4 text-slate/70">
              Elihaki M. Y. Javan is a Pharmaceutical Technologist based in Arusha,
              Tanzania, with field exposure across community pharmacies, hospital
              pharmacies, medical supplies supply chain, and professional association
              activity across the country.
            </p>
            <blockquote className="mt-6 border-l-4 border-primary pl-4 font-serif text-xl italic text-slate">
              &quot;PharmaConnect is not a startup idea. It is the tool I needed and could not find. So I decided to build it.&quot;
            </blockquote>
          </div>
        </section>

        <section className="mt-12 rounded-lg bg-mist p-8">
          <h2 className="text-2xl font-semibold text-slate">Actively recruiting</h2>
          <table className="mt-5 w-full text-left text-sm">
            <tbody>
              {[
                ["Technical co-founder / senior engineer", "Equity discussion", "elihaki.yusuph@gmail.com"],
                ["Clinical/regulatory advisor", "Advisor equity or early-stage partnership terms", "elihaki.yusuph@gmail.com"],
              ].map(([role, terms, contact]) => (
                <tr className="border-b border-slate/10" key={role}>
                  <td className="py-3 font-semibold text-slate">{role}</td>
                  <td className="py-3 text-slate/65">{terms}</td>
                  <td className="py-3 text-primary">{contact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-12 rounded-lg border border-slate/10 p-8">
          <h2 className="text-2xl font-semibold text-slate">Company legal details</h2>
          <div className="mt-5 grid gap-3 text-sm text-slate/70">
            <p>Registered under Tanzania Companies Act Cap 212: registration underway.</p>
            <p>PDPC registration: pending - April 2026.</p>
            <p>BRELA status: registration underway.</p>
            <p>TRA VFD integration: underway for compliant digital dispensing.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
