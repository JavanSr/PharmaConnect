"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Button from "@/components/ui/Button";

type ContactFormVariant = "pilot" | "investor" | "partner";

interface ContactFormProps {
  variant: ContactFormVariant;
}

export default function ContactForm({ variant }: ContactFormProps) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle",
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");

    const formData = new FormData(event.currentTarget);
    const payload =
      variant === "pilot"
        ? {
            pharmacyName: String(formData.get("pharmacyName") || ""),
            ownerName: String(formData.get("ownerName") || ""),
            phone: String(formData.get("phone") || ""),
            type: String(formData.get("type") || ""),
          }
        : {
            variant,
            name: String(formData.get("name") || ""),
            email: String(formData.get("email") || ""),
            message: String(formData.get("message") || ""),
          };

    const response = await fetch(variant === "pilot" ? "/api/waitlist" : "/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setStatus(response.ok ? "success" : "error");
    if (response.ok) {
      event.currentTarget.reset();
    }
  }

  if (variant === "pilot") {
    return (
      <form className="grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-slate">
            Pharmacy name
            <input
              className="rounded-lg border border-slate/15 px-3 py-3 font-normal"
              minLength={3}
              name="pharmacyName"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate">
            Owner name
            <input
              className="rounded-lg border border-slate/15 px-3 py-3 font-normal"
              minLength={3}
              name="ownerName"
              required
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-slate">
            Phone
            <input
              className="rounded-lg border border-slate/15 px-3 py-3 font-normal"
              name="phone"
              pattern="^\+?255[0-9]{9}$"
              placeholder="+255764591374"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate">
            Pharmacy type
            <select
              className="rounded-lg border border-slate/15 px-3 py-3 font-normal"
              name="type"
              required
            >
              <option value="">Select one</option>
              <option value="ADDO">ADDO</option>
              <option value="Retail">Retail</option>
              <option value="Wholesale">Wholesale</option>
            </select>
          </label>
        </div>
        <FormStatus status={status} />
        <Button disabled={status === "submitting"} type="submit">
          {status === "submitting" ? "Submitting..." : "Submit"}
        </Button>
      </form>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <label className="grid gap-2 text-sm font-semibold text-slate">
        Name
        <input
          className="rounded-lg border border-slate/15 px-3 py-3 font-normal"
          minLength={3}
          name="name"
          required
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate">
        Email
        <input
          className="rounded-lg border border-slate/15 px-3 py-3 font-normal"
          name="email"
          required
          type="email"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate">
        Message
        <textarea
          className="min-h-32 rounded-lg border border-slate/15 px-3 py-3 font-normal"
          minLength={10}
          name="message"
          required
        />
      </label>
      <FormStatus status={status} />
      <Button disabled={status === "submitting"} type="submit">
        {status === "submitting" ? "Submitting..." : "Submit inquiry"}
      </Button>
    </form>
  );
}

function FormStatus({
  status,
}: {
  status: "idle" | "submitting" | "success" | "error";
}) {
  if (status === "success") {
    return (
      <p className="rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-700">
        You are on the list. We will be in touch within 48 hours.
      </p>
    );
  }

  if (status === "error") {
    return (
      <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">
        Something went wrong. Check the fields and try again.
      </p>
    );
  }

  return null;
}
