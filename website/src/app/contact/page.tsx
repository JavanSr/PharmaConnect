import ContactTabs from "@/components/ContactTabs";

export const metadata = {
  title: "Contact - PharmaConnect",
  description: "Contact PharmaConnect for pilot, investor, or partner inquiries.",
};

export default function ContactPage() {
  return (
    <main className="bg-white py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-5xl font-semibold text-slate">Contact</h1>
        <p className="mt-5 text-slate/70">
          elihaki.yusuph@gmail.com / +255 764 591 374
        </p>
        <p className="mt-2 text-slate/70">Arusha, Tanzania / @PharmaConnect</p>
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
