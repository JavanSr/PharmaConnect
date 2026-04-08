import { createArticleAction } from "@/actions/articles";
import { ArticleForm } from "@/components/forms/article-form";
import { PageHeader } from "@/components/shared/page-header";

export default function NewArticlePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create knowledge article"
        description="Publish a regulatory update, medicine safety note, or practical pharmacy operations article."
      />
      <ArticleForm action={createArticleAction} submitLabel="Create article" />
    </div>
  );
}
