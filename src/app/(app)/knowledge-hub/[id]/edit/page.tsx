import { notFound } from "next/navigation";
import { updateArticleAction } from "@/actions/articles";
import { ArticleForm } from "@/components/forms/article-form";
import { PageHeader } from "@/components/shared/page-header";
import { getArticleById } from "@/lib/data";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getArticleById(id, { includeUnpublished: true });

  if (!article) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Edit article" description="Refine content, publishing state, and dashboard feature placement." />
      <ArticleForm action={updateArticleAction.bind(null, article.id)} article={article} submitLabel="Save article" />
    </div>
  );
}
