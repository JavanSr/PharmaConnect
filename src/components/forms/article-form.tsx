import type { ReactNode } from "react";
import { ArticleCategory, KnowledgeArticle } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { articleCategoryOptions } from "@/lib/constants";

export function ArticleForm({
  action,
  article,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  article?: KnowledgeArticle | null;
  submitLabel: string;
}) {
  return (
    <Card>
      <form action={action} className="grid gap-5">
        <Field label="Title">
          <Input name="title" defaultValue={article?.title ?? ""} required />
        </Field>
        <div className="grid gap-5 lg:grid-cols-[1fr_180px_180px]">
          <Field label="Category">
            <Select
              name="category"
              defaultValue={article?.category ?? ArticleCategory.REGULATORY_UPDATES}
              required
            >
              {articleCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] px-4">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={article?.featured ?? false}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            <span className="text-sm font-medium text-slate-700">Featured</span>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] px-4">
            <input
              type="checkbox"
              name="published"
              defaultChecked={article ? article.published : true}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            <span className="text-sm font-medium text-slate-700">Published</span>
          </label>
        </div>
        <Field label="Summary">
          <Textarea
            name="summary"
            className="min-h-24"
            defaultValue={article?.summary ?? ""}
            placeholder="Short executive summary for the dashboard and article listing."
            required
          />
        </Field>
        <Field label="Content">
          <Textarea
            name="content"
            className="min-h-56"
            defaultValue={article?.content ?? ""}
            placeholder="Write clear, practical guidance for pharmacy teams."
            required
          />
        </Field>
        <div className="flex justify-end">
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
