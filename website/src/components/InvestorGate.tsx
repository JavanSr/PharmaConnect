"use client";

import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";

export default function InvestorGate() {
  const [message, setMessage] = useState<string | null>(null);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/investor-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name") || ""),
        email: String(form.get("email") || ""),
      }),
    });
    setMessage(response.ok ? "Access code sent if investor access is configured." : "Access code could not be sent.");
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/investor-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: String(form.get("code") || "") }),
    });
    if (response.ok) {
      window.location.reload();
    } else {
      setMessage("Invalid access code.");
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form className="rounded-lg bg-white p-6 shadow-sm" onSubmit={requestCode}>
        <h2 className="text-xl font-semibold text-slate">Request investor code</h2>
        <label className="mt-5 grid gap-2 text-sm font-semibold text-slate">
          Name
          <input className="rounded-lg border border-slate/15 px-3 py-3 font-normal" name="name" required />
        </label>
        <label className="mt-4 grid gap-2 text-sm font-semibold text-slate">
          Email
          <input className="rounded-lg border border-slate/15 px-3 py-3 font-normal" name="email" required type="email" />
        </label>
        <div className="mt-5">
          <Button type="submit">Send access code</Button>
        </div>
      </form>
      <form className="rounded-lg bg-white p-6 shadow-sm" onSubmit={verifyCode}>
        <h2 className="text-xl font-semibold text-slate">Enter access code</h2>
        <label className="mt-5 grid gap-2 text-sm font-semibold text-slate">
          Access code
          <input className="rounded-lg border border-slate/15 px-3 py-3 font-normal" name="code" required type="password" />
        </label>
        <div className="mt-5">
          <Button type="submit" variant="outline">Unlock investor page</Button>
        </div>
      </form>
      {message ? <p className="rounded-lg bg-primary-light p-4 text-sm font-semibold text-primary-dark md:col-span-2">{message}</p> : null}
    </div>
  );
}
