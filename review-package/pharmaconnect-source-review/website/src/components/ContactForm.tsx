"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Button from "@/components/ui/Button";

interface ContactFormProps {
  variant: "waitlist" | "investor" | "partner";
}

const phoneRegex = /^\+?255[0-9]{9}$/;

export default function ContactForm({ variant }: ContactFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(() => {
    if (variant === "waitlist") {
      return z.object({
        pharmacyName: z.string().min(3),
        ownerName: z.string().min(3),
        phone: z.string().regex(phoneRegex),
        type: z.enum(["ADDO", "Retail", "Wholesale"]),
      });
    }

    if (variant === "investor") {
      return z.object({
        name: z.string().min(3),
        email: z.string().email(),
        organisation: z.string().min(2),
        message: z.string().min(10),
      });
    }

    return z.object({
      name: z.string().min(3),
      email: z.string().email(),
      organisation: z.string().min(2),
      partnershipType: z.enum(["Regulatory", "Professional Body", "Implementation", "Technology", "Other"]),
      message: z.string().min(10),
    });
  }, [variant]);

  type FormValues = Record<string, string>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues:
      variant === "waitlist"
        ? ({ pharmacyName: "", ownerName: "", phone: "", type: "ADDO" } as FormValues)
        : variant === "investor"
          ? ({ name: "", email: "", organisation: "", message: "" } as FormValues)
          : ({ name: "", email: "", organisation: "", partnershipType: "Regulatory", message: "" } as FormValues),
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const endpoint = variant === "waitlist" ? "/api/waitlist" : "/api/contact";
    const payload =
      variant === "waitlist"
        ? values
        : {
            ...values,
            variant,
          };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setError("Something went wrong. Email us directly: elihaki.yusuph@gmail.com");
      return;
    }

    setSubmitted(true);
  }

  const inputClassName =
    "min-h-11 w-full rounded-lg border border-slate/20 bg-white px-3 text-slate outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
        Your message was received. We respond within 48 hours.
      </div>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      {variant === "waitlist" ? (
        <>
          <div>
            <input className={inputClassName} placeholder="Pharmacy name" {...form.register("pharmacyName" as keyof FormValues)} />
            <FieldError message={form.formState.errors["pharmacyName"]?.message as string | undefined} />
          </div>
          <div>
            <input className={inputClassName} placeholder="Owner name" {...form.register("ownerName" as keyof FormValues)} />
            <FieldError message={form.formState.errors["ownerName"]?.message as string | undefined} />
          </div>
          <div>
            <input className={inputClassName} placeholder="+255..." {...form.register("phone" as keyof FormValues)} />
            <FieldError message={form.formState.errors["phone"]?.message as string | undefined} />
          </div>
          <div>
            <select className={inputClassName} {...form.register("type" as keyof FormValues)}>
              <option value="ADDO">ADDO</option>
              <option value="Retail">Retail Pharmacy</option>
              <option value="Wholesale">Wholesale</option>
            </select>
          </div>
        </>
      ) : (
        <>
          <div>
            <input className={inputClassName} placeholder="Your name" {...form.register("name" as keyof FormValues)} />
            <FieldError message={form.formState.errors["name"]?.message as string | undefined} />
          </div>
          <div>
            <input className={inputClassName} placeholder="Email" type="email" {...form.register("email" as keyof FormValues)} />
            <FieldError message={form.formState.errors["email"]?.message as string | undefined} />
          </div>
          <div>
            <input className={inputClassName} placeholder="Organisation" {...form.register("organisation" as keyof FormValues)} />
            <FieldError message={form.formState.errors["organisation"]?.message as string | undefined} />
          </div>
          {variant === "partner" ? (
            <div>
              <select className={inputClassName} {...form.register("partnershipType" as keyof FormValues)}>
                <option value="Regulatory">Regulatory</option>
                <option value="Professional Body">Professional Body</option>
                <option value="Implementation">Implementation</option>
                <option value="Technology">Technology</option>
                <option value="Other">Other</option>
              </select>
            </div>
          ) : null}
          <div>
            <textarea className="w-full rounded-lg border border-slate/20 bg-white px-3 py-3 text-slate outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="Message" rows={5} {...form.register("message" as keyof FormValues)} />
            <FieldError message={form.formState.errors["message"]?.message as string | undefined} />
          </div>
        </>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button className="w-full" size="lg" type="submit" variant="primary">
        {variant === "waitlist"
          ? "Request early access →"
          : variant === "investor"
            ? "Send inquiry →"
            : "Send partnership inquiry →"}
      </Button>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}
