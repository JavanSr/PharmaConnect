import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();

  return (
    <AppShell
      user={{
        name: user.name,
        role: user.role,
        pharmacy: user.pharmacy
          ? {
              name: user.pharmacy.name,
              district: user.pharmacy.district,
            }
          : null,
      }}
    >
      {children}
    </AppShell>
  );
}
