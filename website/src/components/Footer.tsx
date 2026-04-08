import Link from "next/link";
import Logo from "@/components/Logo";
import { MODULES } from "@/lib/data/modules";

const companyLinks = [
  ["About", "/about"],
  ["Blog", "/blog"],
  ["Investors", "/investors"],
  ["Partners", "/partners"],
  ["Contact", "/contact"],
] as const;

export default function Footer() {
  return (
    <footer className="bg-slate text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <Logo variant="white" size="sm" />
          <p className="mt-5 text-sm text-white/70">
            The pharmacy-side operating system for better pharmaceutical services.
          </p>
          <p className="mt-3 text-sm text-white/70">
            Mfumo wa uendeshaji wa maduka ya dawa kwa huduma bora.
          </p>
          <p className="mt-5 text-xs text-white/50">Arusha, Tanzania - April 2026</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Platform</h2>
          <div className="mt-4 grid gap-2 text-sm text-white/65">
            <Link href="/platform">Overview</Link>
            {MODULES.map((module) => (
              <Link href={`/platform/${module.slug}`} key={module.id}>
                {module.name}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Company</h2>
          <div className="mt-4 grid gap-2 text-sm text-white/65">
            {companyLinks.map(([label, href]) => (
              <Link href={href} key={href}>
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Legal</h2>
          <div className="mt-4 grid gap-2 text-sm text-white/65">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <p>PDPC Registration: pending - April 2026</p>
            <p>TRA VFD Integration: in progress</p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 text-xs text-white/55 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>
            (c) 2026 PharmaConnect System - Elihaki M. Y. Javan - Registered
            under Tanzania Companies Act Cap 212 (in progress)
          </p>
        </div>
      </div>
    </footer>
  );
}
