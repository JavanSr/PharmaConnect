import Link from "next/link";
import Logo from "@/components/Logo";

const platformLinks = [
  { href: "/platform", label: "All modules" },
  { href: "/platform/dashboard", label: "Dashboard" },
  { href: "/platform/inventory", label: "Inventory" },
  { href: "/platform/dispensing", label: "Dispensing" },
  { href: "/platform/compliance-tracker", label: "Compliance Tracker" },
  { href: "/platform/knowledge-hub", label: "Knowledge Hub" },
];

const companyLinks = [
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/investors", label: "Investors" },
  { href: "/partners", label: "Partners" },
  { href: "/contact", label: "Contact" },
];

const legalLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];

export default function Footer() {
  return (
    <footer className="bg-primary-dark text-white">
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <p className="text-sm font-medium text-white/80">
            Wholesale or Enterprise?
          </p>
          <Link
            className="rounded-lg bg-[#E8A020] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c8881a]"
            href="/contact?tab=wholesale"
          >
            Contact us directly →
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-4">
            <Logo size="sm" variant="white" />
            <p className="max-w-xs text-sm text-white/70">
              The pharmacy-side platform for better pharmaceutical services in Tanzania.
            </p>
            <p className="text-sm text-white/60">Dodoma, Tanzania · East Africa · 2026</p>
            <a className="block text-sm text-white/70 hover:text-white" href="mailto:support@apotekh.co.tz">
              support@apotekh.co.tz
            </a>
            <a className="block text-sm text-white/70 hover:text-white" href="https://wa.me/255000000000">
              WhatsApp support
            </a>
            <div className="flex gap-3 pt-1">
              <a
                aria-label="LinkedIn"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-sm font-bold text-white/50 hover:border-white/40 hover:text-white"
                href="https://linkedin.com/company/apotekh"
                rel="noopener noreferrer"
                target="_blank"
              >
                in
              </a>
              <a
                aria-label="Twitter / X"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-sm font-bold text-white/50 hover:border-white/40 hover:text-white"
                href="https://twitter.com/apotekh"
                rel="noopener noreferrer"
                target="_blank"
              >
                𝕏
              </a>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
              Platform
            </h2>
            <div className="mt-4 grid gap-3 text-sm text-white/70">
              {platformLinks.map((link) => (
                <Link className="hover:text-white" href={link.href} key={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
              Company
            </h2>
            <div className="mt-4 grid gap-3 text-sm text-white/70">
              {companyLinks.map((link) => (
                <Link className="hover:text-white" href={link.href} key={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
              Legal
            </h2>
            <div className="mt-4 grid gap-3 text-sm text-white/70">
              {legalLinks.map((link) => (
                <Link className="hover:text-white" href={link.href} key={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-xs text-white/40 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          © 2026 APOTEKH System · Elihaki M. Y. Javan · Tanzania
        </div>
      </div>
    </footer>
  );
}
