"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/platform", label: "Platform" },
  { href: "/pricing", label: "Pricing" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
];

export default function Nav() {
  const pathname = usePathname() ?? "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = (
    <>
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            className={cn(
              "text-sm font-medium text-slate transition hover:text-primary",
              active && "text-primary",
            )}
            href={link.href}
            key={link.href}
            onClick={() => setOpen(false)}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition",
        scrolled ? "border-b border-slate/10 bg-white/90 backdrop-blur" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="PharmaConnect home">
          <span className="hidden lg:inline-flex">
            <Logo size="sm" variant="full" />
          </span>
          <span className="inline-flex lg:hidden">
            <Logo size="sm" variant="mark" />
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
          {navLinks}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Button href="/contact#waitlist" size="sm">
            Get early access
          </Button>
          <Button href="/investors" variant="ghost" size="sm">
            For investors
          </Button>
        </div>

        <button
          aria-label="Open menu"
          className="rounded-lg border border-slate/10 bg-white p-2 text-slate lg:hidden"
          onClick={() => setOpen(true)}
          type="button"
        >
          <span className="block h-0.5 w-5 bg-current" />
          <span className="mt-1.5 block h-0.5 w-5 bg-current" />
          <span className="mt-1.5 block h-0.5 w-5 bg-current" />
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 bg-primary-dark/90 p-4 backdrop-blur lg:hidden">
          <div className="flex min-h-full flex-col rounded-lg bg-white p-6">
            <div className="flex items-center justify-between">
              <Logo size="sm" variant="full" />
              <button
                aria-label="Close menu"
                className="rounded-lg border border-slate/10 p-2 text-2xl leading-none"
                onClick={() => setOpen(false)}
                type="button"
              >
                x
              </button>
            </div>
            <nav className="mt-12 flex flex-col gap-6 text-lg">{navLinks}</nav>
            <div className="mt-10 flex flex-col gap-3">
              <Button href="/contact#waitlist">Get early access</Button>
              <Button href="/investors" variant="outline">
                For investors
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
