import ContactTabs from "@/components/ContactTabs";

export const metadata = {
  title: "Contact - APOTEKH",
  description: "Get in touch with APOTEKH — access requests, investor inquiries, and institutional partnerships.",
};

export default function ContactPage() {
  return (
    <main className="bg-white py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-5xl font-semibold text-slate">Contact</h1>
        <p className="mt-5 text-slate/70">
          <a href="mailto:support@apotekh.co.tz" className="hover:text-primary">support@apotekh.co.tz</a>
        </p>
        <p className="mt-2 text-slate/70">Dodoma, Tanzania · @APOTEKH</p>
        <p className="mt-2 font-serif text-xl italic text-slate">
          &quot;We respond within 48 hours&quot;
        </p>
        <div className="mt-8 rounded-lg bg-mist p-6" id="waitlist">
          <ContactTabs />
        </div>
      </div>
    </main>
  );
}
