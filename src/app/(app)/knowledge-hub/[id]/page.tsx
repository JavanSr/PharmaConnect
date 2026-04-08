import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteArticleAction } from "@/actions/articles";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { articleCategoryLabels } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { getArticleById } from "@/lib/data";
import { canManageArticles } from "@/lib/permissions";
import { formatLongDate } from "@/lib/utils";

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const article = await getArticleById(id);
  const canManage = canManageArticles(user.role);

  if (!article || (!article.published && !canManage)) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={article.title}
        description={article.summary}
        actions={
          canManage ? (
            <>
              <Link href={`/knowledge-hub/${article.id}/edit`}>
                <Button variant="secondary">Edit article</Button>
              </Link>
              <form action={deleteArticleAction.bind(null, article.id)}>
                <Button type="submit" variant="ghost">
                  Delete
                </Button>
              </form>
            </>
          ) : undefined
        }
      />

      <Card className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <Badge tone="info">{articleCategoryLabels[article.category]}</Badge>
          <StatusBadge status={article.published ? "published" : "draft"} />
          {article.featured ? <Badge tone="success">Featured</Badge> : null}
        </div>
        <div className="text-sm text-slate-500">
          <p>Author: {article.createdBy.name}</p>
          <p>Updated {formatLongDate(article.updatedAt)}</p>
        </div>
        <div className="prose max-w-none text-base leading-8 text-slate-700">
          <p>{article.content}</p>
        </div>
      </Card>
    </div>
  );
}
