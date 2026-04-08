import { ArrowRight, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/forms/login-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const demoAccounts = [
  { role: "Super Admin", email: "founder@pharmaconnect.tz", password: "Demo123!" },
  { role: "Pharmacy Admin", email: "admin@pharmaconnect.tz", password: "Demo123!" },
  { role: "Staff", email: "staff@pharmaconnect.tz", password: "Demo123!" },
];

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#0d2430,#113746_52%,#eef5f4_52%,#f4f7f7)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="relative overflow-hidden border-white/15 bg-white/95 lg:p-10">
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[var(--color-accent)]/10 blur-3xl" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div className="space-y-5">
              <Badge tone="info">Arusha pilot • Phase 1 live</Badge>
              <div className="space-y-3">
                <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-[var(--color-ink)]">
                  Pharmacy operations built for a credible early-stage rollout.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600">
                  PharmaConnect helps pilot pharmacies manage inventory, keep up with compliance deadlines, and share
                  practical knowledge while Phase 2 capabilities remain visible as part of the product roadmap.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[28px] bg-[var(--color-soft)] p-5">
                <p className="text-sm font-semibold text-[var(--color-ink)]">Phase 1 active</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  <li>Inventory control with low-stock and expiry alerts</li>
                  <li>Knowledge Hub for regulatory and practice content</li>
                  <li>Compliance tracker with deadlines and reminder visibility</li>
                </ul>
              </div>
              <div className="rounded-[28px] bg-[var(--color-soft)] p-5">
                <p className="text-sm font-semibold text-[var(--color-ink)]">Phase 2 preview</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  <li>Analytics dashboard</li>
                  <li>Patient management workflows</li>
                  <li>Drug interaction and safety checks</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-white/10 bg-white/96 lg:p-10">
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-soft)] text-[var(--color-accent)]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                    Secure access
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">Sign in</h2>
                </div>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                Use the seeded demo accounts below to review the role-aware MVP experience.
              </p>
            </div>

            <LoginForm />

            <div className="space-y-3">
              {demoAccounts.map((account) => (
                <div
                  key={account.email}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-soft)]/65 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">{account.role}</p>
                    <p className="text-sm text-slate-500">{account.email}</p>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    <p>{account.password}</p>
                    <ArrowRight className="ml-auto mt-1 h-4 w-4 text-[var(--color-accent)]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
