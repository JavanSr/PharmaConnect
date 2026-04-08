import type { ReactNode } from "react";
import { ComplianceItem, ComplianceStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { complianceCategoryOptions } from "@/lib/constants";

export function ComplianceForm({
  action,
  item,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  item?: ComplianceItem | null;
  submitLabel: string;
}) {
  return (
    <Card>
      <form action={action} className="grid gap-5 lg:grid-cols-2">
        <Field label="Title">
          <Input name="title" defaultValue={item?.title ?? ""} required />
        </Field>
        <Field label="Category">
          <Select name="category" defaultValue={item?.category ?? complianceCategoryOptions[0]} required>
            {complianceCategoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Authority / body">
          <Input name="authority" defaultValue={item?.authority ?? ""} required />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={item?.status ?? ComplianceStatus.PENDING} required>
            <option value={ComplianceStatus.PENDING}>Pending</option>
            <option value={ComplianceStatus.COMPLETED}>Completed</option>
            <option value={ComplianceStatus.OVERDUE}>Overdue</option>
          </Select>
        </Field>
        <Field label="Deadline date">
          <Input
            name="deadlineDate"
            type="date"
            defaultValue={item?.deadlineDate ? item.deadlineDate.toISOString().slice(0, 10) : ""}
            required
          />
        </Field>
        <Field label="Reminder date">
          <Input
            name="reminderDate"
            type="date"
            defaultValue={item?.reminderDate ? item.reminderDate.toISOString().slice(0, 10) : ""}
            required
          />
        </Field>
        <div className="lg:col-span-2">
          <Field label="Notes">
            <Textarea
              name="notes"
              defaultValue={item?.notes ?? ""}
              placeholder="Inspection prep details, missing documents, or owner notes."
            />
          </Field>
        </div>
        <div className="rounded-3xl bg-[var(--color-soft)] p-5 lg:col-span-2">
          <p className="text-sm font-semibold text-[var(--color-ink)]">Compliance reminder</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Deadlines appear on both dashboard alerts and the tracker calendar so the pilot pharmacies can spot lapses
            early.
          </p>
        </div>
        <div className="lg:col-span-2 flex justify-end">
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
