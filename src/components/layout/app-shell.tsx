"use client";

import type { PropsWithChildren } from "react";
import { usePathname } from "next/navigation";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export function AppShell({
  user,
  children,
}: PropsWithChildren<{
  user: {
    name: string;
    role: "SUPER_ADMIN" | "PHARMACY_ADMIN" | "STAFF";
    pharmacy?: {
      name: string;
      district: string;
    } | null;
  };
}>) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--color-app-bg)]">
      <div className="flex min-h-screen">
        <Sidebar pathname={pathname} />
        <div className="flex min-h-screen flex-1 flex-col">
          <MobileNav pathname={pathname} />
          <main className="flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
              <Topbar
                userName={user.name}
                role={user.role}
                pharmacyName={user.pharmacy?.name}
                pharmacyDistrict={user.pharmacy?.district}
              />
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
