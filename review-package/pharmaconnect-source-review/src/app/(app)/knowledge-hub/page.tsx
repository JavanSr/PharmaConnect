import Link from "next/link";
import { BookOpenText, Plus } from "lucide-react";
import { toggleArticlePublishAction } from "@/actions/articles";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { articleCategoryLabels, articleCategoryOptions } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { getKnowledgeHubData } from "@/lib/data";
import { canManageArticles } from "@/lib/permissions";
import { formatLongDate } from "@/lib/utils";

export default async function KnowledgeHubPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const canManage = canManageArticles(user.role);
  const data = await getKnowledgeHubData(params, { includeUnpublished: canManage });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Hub"
        description="A lightweight content center for regulatory updates, medicine safety guidance, and practical pharmacy operations content."
        actions={
          canManage ? (
            <Link href="/knowledge-hub/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New article
              </Button>
            </Link>
          ) : undefined
        }
      />

      {data.featuredArticle ? (
        <Card className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-4">
            <Badge tone="info">Featured article</Badge>
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">{data.featuredArticle.title}</h2>
              <p className="text-sm leading-7 text-slate-600">{data.featuredArticle.summary}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
              <span>{articleCategoryLabels[data.featuredArticle.category]}</span>
              <span>Updated {formatLongDate(data.featuredArticle.updatedAt)}</span>
              <span>By {data.featuredArticle.createdBy.name}</span>
            </div>
            <Link href={`/knowledge-hub/${data.featuredArticle.id}`}>
              <Button variant="secondary">Open article</Button>
            </Link>
          </div>
          <div className="rounded-[28px] bg-[var(--color-soft)] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[var(--color-accent)]">
                <BookOpenText className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-[var(--color-ink)]">Dashboard ready</p>
                <p className="text-sm text-slate-500">Featured content also surfaces on the main dashboard.</p>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <Card>
        <form className="grid gap-4 lg:grid-cols-[1fr_220px_auto]">
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Search by title, summary, or article content" />
          <Select name="category" defaultValue={params.category ?? ""}>
            <option value="">All categories</option>
            {articleCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </Card>

      {data.articles.length === 0 ? (
        <EmptyState
          title="No articles matched your search"
          description="Broaden the search or publish a new article for the pilot teams."
          actionLabel={canManage ? "New article" : undefined}
          actionHref={canManage ? "/knowledge-hub/new" : undefined}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.articles.map((article) => (
            <Card key={article.id} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Badge tone="info">{articleCategoryLabels[article.category]}</Badge>
                <StatusBadge status={article.published ? "published" : "draft"} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold tracking-tight text-[var(--color-ink)]">{article.title}</h3>
                <p className="text-sm leading-6 text-slate-600">{article.summary}</p>
              </div>
              <div className="text-sm text-slate-500">
                <p>Updated {formatLongDate(article.updatedAt)}</p>
                <p>Author: {article.createdBy.name}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/knowledge-hub/${article.id}`}>
                  <Button variant="secondary">Open</Button>
                </Link>
                {canManage ? (
                  <>
                    <Link href={`/knowledge-hub/${article.id}/edit`}>
                      <Button variant="ghost">Edit</Button>
                    </Link>
                    <form action={toggleArticlePublishAction.bind(null, article.id, !article.published)}>
                      <Button type="submit" variant="ghost">
                        {article.published ? "Unpublish" : "Publish"}
                      </Button>
                    </form>
                  </>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
