"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Logo from "@/components/Logo";
import { cn } from "@/lib/utils";

const links = [
  { href: "/platform", label: "Platform" },
  { href: "/pricing", label: "Pricing" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
];

export default function Nav() {
  const pathname = usePathname() ?? "";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", open);
    return () => document.body.classList.remove("overflow-hidden");
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 transition duration-150",
          scrolled ? "backdrop-blur-md bg-white/90 shadow-sm" : "bg-transparent",
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="APOTEKH home">
            <Logo size="md" variant="full" />
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  className={cn(
                    "text-sm font-medium text-slate transition duration-150 hover:text-primary",
                    active && "text-primary",
                  )}
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Button href="/demo" size="sm" variant="outline">
              Book a demo
            </Button>
            <Button href="https://app.apotekh.co.tz/register" size="sm" variant="primary">
              Get access
            </Button>
          </div>

          <button
            aria-expanded={open}
            aria-label="Open navigation"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate/10 bg-white/90 text-slate lg:hidden"
            onClick={() => setOpen(true)}
            type="button"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 bg-white lg:hidden">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6">
            <Logo size="md" variant="full" />
            <button
              aria-label="Close navigation"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate/10 text-slate"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X size={20} />
            </button>
          </div>
          <div className="px-4 pb-8 pt-6 sm:px-6">
            <nav className="grid gap-5">
              {links.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    className={cn("text-2xl font-medium text-slate", active && "text-primary")}
                    href={link.href}
                    key={link.href}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-8 grid gap-3">
              <Button href="https://app.apotekh.co.tz/register" size="lg" variant="primary">
                Get access
              </Button>
              <Button href="/demo" size="lg" variant="outline">
                Book a demo
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
