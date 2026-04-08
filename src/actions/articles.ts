"use server";

import { ArticleCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { canManageArticles } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const articleSchema = z.object({
  title: z.string().min(5),
  category: z.nativeEnum(ArticleCategory),
  summary: z.string().min(20),
  content: z.string().min(60),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
});

function refreshKnowledgeViews() {
  revalidatePath("/dashboard");
  revalidatePath("/knowledge-hub");
}

async function ensureFeaturedArticleConsistency(featured: boolean, currentId?: string) {
  if (!featured) {
    return;
  }

  await prisma.knowledgeArticle.updateMany({
    where: currentId ? { id: { not: currentId } } : {},
    data: { featured: false },
  });
}

export async function createArticleAction(formData: FormData) {
  const user = await requireUser();

  if (!canManageArticles(user.role)) {
    throw new Error("You do not have permission to manage knowledge articles.");
  }

  const parsed = articleSchema.parse({
    title: formData.get("title"),
    category: formData.get("category"),
    summary: formData.get("summary"),
    content: formData.get("content"),
    featured: formData.get("featured") === "on",
    published: formData.get("published") === "on",
  });

  await ensureFeaturedArticleConsistency(parsed.featured);

  await prisma.knowledgeArticle.create({
    data: {
      ...parsed,
      createdById: user.id,
    },
  });

  refreshKnowledgeViews();
  redirect("/knowledge-hub");
}

export async function updateArticleAction(articleId: string, formData: FormData) {
  const user = await requireUser();

  if (!canManageArticles(user.role)) {
    throw new Error("You do not have permission to manage knowledge articles.");
  }

  const parsed = articleSchema.parse({
    title: formData.get("title"),
    category: formData.get("category"),
    summary: formData.get("summary"),
    content: formData.get("content"),
    featured: formData.get("featured") === "on",
    published: formData.get("published") === "on",
  });

  await ensureFeaturedArticleConsistency(parsed.featured, articleId);

  await prisma.knowledgeArticle.update({
    where: { id: articleId },
    data: parsed,
  });

  refreshKnowledgeViews();
  redirect(`/knowledge-hub/${articleId}`);
}

export async function deleteArticleAction(articleId: string) {
  const user = await requireUser();

  if (!canManageArticles(user.role)) {
    throw new Error("You do not have permission to remove knowledge articles.");
  }

  await prisma.knowledgeArticle.delete({
    where: { id: articleId },
  });

  refreshKnowledgeViews();
  redirect("/knowledge-hub");
}

export async function toggleArticlePublishAction(articleId: string, published: boolean) {
  const user = await requireUser();

  if (!canManageArticles(user.role)) {
    throw new Error("You do not have permission to update article visibility.");
  }

  await prisma.knowledgeArticle.update({
    where: { id: articleId },
    data: { published },
  });

  refreshKnowledgeViews();
}
