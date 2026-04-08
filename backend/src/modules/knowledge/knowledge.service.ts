import { ArticleStatus } from '@prisma/client';
import prisma from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { EmailService } from '../../services/email.service';
import { randomUUID } from 'crypto';

const emailService = new EmailService();

function wordCount(body: any): number {
  try {
    const text = JSON.stringify(body);
    return text.split(/\s+/).length;
  } catch { return 0; }
}

export class KnowledgeService {
  async listArticles(
    filters: { category?: string; status?: ArticleStatus; tag?: string; search?: string; adminView?: boolean },
    pagination: { page: number; limit: number }
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (!filters.adminView) where.status = ArticleStatus.PUBLISHED;
    else if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.tag) where.tags = { has: filters.tag };
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { tags: { hasSome: [filters.search] } },
      ];
    }

    const [total, articles] = await Promise.all([
      prisma.article.count({ where }),
      prisma.article.findMany({
        where,
        include: { author: { select: { firstName: true, lastName: true } } },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // Enforce sponsored article capping at 3rd position per category
    const result = this.enforceSponsored(articles);

    return { data: result, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private enforceSponsored(articles: any[]): any[] {
    const nonSponsored = articles.filter(a => !a.isSponsored);
    const sponsored = articles.filter(a => a.isSponsored);
    const result: any[] = [];
    let sponsoredIdx = 0;
    let nonSponsoredIdx = 0;
    for (let i = 0; i < articles.length; i++) {
      if (i === 2 && sponsoredIdx < sponsored.length) {
        result.push(sponsored[sponsoredIdx++]);
      } else if (nonSponsoredIdx < nonSponsored.length) {
        result.push(nonSponsored[nonSponsoredIdx++]);
      } else if (sponsoredIdx < sponsored.length) {
        result.push(sponsored[sponsoredIdx++]);
      }
    }
    return result;
  }

  async getArticle(slug: string) {
    const article = await prisma.article.findUnique({
      where: { slug },
      include: { author: { select: { firstName: true, lastName: true, id: true } } },
    });
    if (!article) throw new Error('Article not found');
    // Increment view count asynchronously
    prisma.article.update({ where: { id: article.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
    return article;
  }

  async createArticle(authorId: string, data: {
    title: string; slug: string; body: any; category: string; tags?: string[];
    status?: ArticleStatus; isSponsored?: boolean; sponsorName?: string;
    sponsorDisplayDate?: Date; featuredImage?: string; scheduledFor?: Date;
  }) {
    const readingTimeMinutes = Math.ceil(wordCount(data.body) / 200) || 1;
    const slug = data.slug || data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return prisma.article.create({
      data: {
        ...data,
        slug,
        tags: data.tags || [],
        status: data.status || ArticleStatus.DRAFT,
        readingTimeMinutes,
        authorId,
        publishedAt: data.status === ArticleStatus.PUBLISHED ? new Date() : undefined,
      },
      include: { author: { select: { firstName: true, lastName: true } } },
    });
  }

  async updateArticle(id: string, data: Partial<{
    title: string; slug: string; body: any; category: string; tags: string[];
    status: ArticleStatus; isSponsored: boolean; sponsorName: string; featuredImage: string; scheduledFor: Date;
  }>) {
    const updateData: any = { ...data };
    if (data.body) updateData.readingTimeMinutes = Math.ceil(wordCount(data.body) / 200) || 1;
    if (data.status === ArticleStatus.PUBLISHED) {
      const existing = await prisma.article.findUnique({ where: { id } });
      if (existing && !existing.publishedAt) updateData.publishedAt = new Date();
    }
    return prisma.article.update({ where: { id }, data: updateData });
  }

  async deleteArticle(id: string) {
    return prisma.article.update({ where: { id }, data: { status: ArticleStatus.ARCHIVED } });
  }

  async subscribe(email: string) {
    const unsubscribeToken = randomUUID();
    return prisma.subscriber.upsert({
      where: { email },
      update: { isActive: true },
      create: { email, unsubscribeToken, isActive: true },
    });
  }

  async unsubscribe(token: string) {
    const sub = await prisma.subscriber.findFirst({ where: { unsubscribeToken: token } });
    if (!sub) throw new Error('Invalid unsubscribe token');
    return prisma.subscriber.update({ where: { id: sub.id }, data: { isActive: false } });
  }

  async sendWeeklyDigest() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [subscribers, articles] = await Promise.all([
      prisma.subscriber.findMany({ where: { isActive: true } }),
      prisma.article.findMany({
        where: { status: ArticleStatus.PUBLISHED, publishedAt: { gte: sevenDaysAgo } },
        include: { author: { select: { firstName: true, lastName: true } } },
        take: 10,
      }),
    ]);
    if (articles.length === 0) { logger.info('Weekly digest: no new articles'); return { sent: 0 }; }
    const emails = subscribers.map(s => s.email);
    await emailService.sendWeeklyDigest(emails, articles as any);
    logger.info(`Weekly digest sent to ${emails.length} subscribers`);
    return { sent: emails.length, articlesCount: articles.length };
  }
}
