import ContactForm from "@/components/ContactForm";

export const metadata = {
  title: "Partners - PharmaConnect",
  description: "Partner with PharmaConnect.",
};

export default function PartnersPage() {
  return (
    <main className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-5xl font-semibold text-slate">Partners</h1>
        <p className="mt-5 max-w-3xl text-slate/70">
          PharmaConnect is seeking institutional partnerships with pharmacy,
          regulatory, clinical, technology, and implementation partners in Tanzania.
        </p>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            ["Regulatory partners", "Inspection readiness, compliance education, and safe reporting pathways."],
            ["Professional bodies", "Training, CPD, patient safety standards, and member engagement."],
            ["Implementation partners", "Pilot rollout, low-resource deployment support, and pharmacy onboarding."],
          ].map(([title, body]) => (
            <article className="rounded-lg bg-mist p-6" key={title}>
              <h2 className="text-xl font-semibold text-slate">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate/65">{body}</p>
            </article>
          ))}
        </div>
        <section className="mt-12 rounded-lg border border-slate/10 bg-mist p-6">
          <h2 className="text-2xl font-semibold text-slate">Partnership inquiry</h2>
          <div className="mt-6">
            <ContactForm variant="partner" />
          </div>
        </section>
      </div>
    </main>
  );
}
