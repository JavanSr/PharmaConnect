"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

export default function InvestorGate() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [code, setCode] = useState("");

  async function requestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/investor-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
      }),
    });

    if (response.status === 503) {
      setStatus("Investor access is temporarily unavailable. Contact: elihaki.yusuph@gmail.com");
      return;
    }

    if (!response.ok) {
      setStatus("Something went wrong. Email us directly: elihaki.yusuph@gmail.com");
      return;
    }

    setEmail(String(formData.get("email") ?? ""));
    setStep(2);
    setStatus(null);
  }

  async function verifyCode() {
    setStatus(null);
    const response = await fetch("/api/investor-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (response.status === 503) {
      setStatus("Investor access is temporarily unavailable. Contact: elihaki.yusuph@gmail.com");
      return;
    }

    if (!response.ok) {
      setStatus("That code is incorrect. Check your inbox or request a new code.");
      return;
    }

    window.location.reload();
  }

  if (step === 1) {
    return (
      <form className="grid gap-4 rounded-xl border border-slate/10 bg-white p-6" onSubmit={requestCode}>
        <input className="min-h-11 rounded-lg border border-slate/20 px-3" name="name" placeholder="Your name" required />
        <input className="min-h-11 rounded-lg border border-slate/20 px-3" name="email" placeholder="Email" required type="email" />
        {status ? <p className="text-sm text-red-600">{status}</p> : null}
        <Button type="submit">Request access code</Button>
      </form>
    );
  }

  return (
    <div className="grid gap-4 rounded-xl border border-slate/10 bg-white p-6">
      <p className="text-sm text-slate/70">Check your inbox — we sent the access code to {email}.</p>
      <input
        className="min-h-11 rounded-lg border border-slate/20 px-3"
        maxLength={6}
        onChange={(event) => setCode(event.target.value)}
        placeholder="6-character access code"
        value={code}
      />
      {status ? <p className="text-sm text-red-600">{status}</p> : null}
      <Button onClick={verifyCode}>Unlock investor brief</Button>
    </div>
  );
}
