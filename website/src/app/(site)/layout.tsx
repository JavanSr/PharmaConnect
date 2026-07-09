import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="bg-[#0D4035] px-4 py-2 text-center">
        <p className="font-mono text-[11px] tracking-[0.10em] text-white/75">
          <span className="hidden sm:inline">APOTEKH&ensp;·&ensp;</span>
          <span className="text-[#7ECFB4]">Powering Pharmacies. Protecting Patients.</span>
        </p>
      </div>
      <Nav />
      {children}
      <Footer />
    </>
  );
}
