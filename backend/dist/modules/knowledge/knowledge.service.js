"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const logger_1 = require("../../lib/logger");
const email_service_1 = require("../../services/email.service");
const crypto_1 = require("crypto");
const emailService = new email_service_1.EmailService();
function wordCount(body) {
    try {
        const text = JSON.stringify(body);
        return text.split(/\s+/).length;
    }
    catch {
        return 0;
    }
}
class KnowledgeService {
    async listArticles(filters, pagination) {
        const { page, limit } = pagination;
        const skip = (page - 1) * limit;
        const where = {};
        if (!filters.adminView)
            where.status = client_1.ArticleStatus.PUBLISHED;
        else if (filters.status)
            where.status = filters.status;
        if (filters.category)
            where.category = filters.category;
        if (filters.tag)
            where.tags = { has: filters.tag };
        if (filters.search) {
            where.OR = [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { tags: { hasSome: [filters.search] } },
            ];
        }
        const [total, articles] = await Promise.all([
            prisma_1.default.article.count({ where }),
            prisma_1.default.article.findMany({
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
    enforceSponsored(articles) {
        const nonSponsored = articles.filter(a => !a.isSponsored);
        const sponsored = articles.filter(a => a.isSponsored);
        const result = [];
        let sponsoredIdx = 0;
        let nonSponsoredIdx = 0;
        for (let i = 0; i < articles.length; i++) {
            if (i === 2 && sponsoredIdx < sponsored.length) {
                result.push(sponsored[sponsoredIdx++]);
            }
            else if (nonSponsoredIdx < nonSponsored.length) {
                result.push(nonSponsored[nonSponsoredIdx++]);
            }
            else if (sponsoredIdx < sponsored.length) {
                result.push(sponsored[sponsoredIdx++]);
            }
        }
        return result;
    }
    async getArticle(slug) {
        const article = await prisma_1.default.article.findUnique({
            where: { slug },
            include: { author: { select: { firstName: true, lastName: true, id: true } } },
        });
        if (!article)
            throw new Error('Article not found');
        // Increment view count asynchronously
        prisma_1.default.article.update({ where: { id: article.id }, data: { viewCount: { increment: 1 } } }).catch(() => { });
        return article;
    }
    async createArticle(authorId, data) {
        const readingTimeMinutes = Math.ceil(wordCount(data.body) / 200) || 1;
        const slug = data.slug || data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        return prisma_1.default.article.create({
            data: {
                ...data,
                slug,
                tags: data.tags || [],
                status: data.status || client_1.ArticleStatus.DRAFT,
                readingTimeMinutes,
                authorId,
                publishedAt: data.status === client_1.ArticleStatus.PUBLISHED ? new Date() : undefined,
            },
            include: { author: { select: { firstName: true, lastName: true } } },
        });
    }
    async updateArticle(id, data) {
        const updateData = { ...data };
        if (data.body)
            updateData.readingTimeMinutes = Math.ceil(wordCount(data.body) / 200) || 1;
        if (data.status === client_1.ArticleStatus.PUBLISHED) {
            const existing = await prisma_1.default.article.findUnique({ where: { id } });
            if (existing && !existing.publishedAt)
                updateData.publishedAt = new Date();
        }
        return prisma_1.default.article.update({ where: { id }, data: updateData });
    }
    async deleteArticle(id) {
        return prisma_1.default.article.update({ where: { id }, data: { status: client_1.ArticleStatus.ARCHIVED } });
    }
    async subscribe(email) {
        const unsubscribeToken = (0, crypto_1.randomUUID)();
        return prisma_1.default.subscriber.upsert({
            where: { email },
            update: { isActive: true },
            create: { email, unsubscribeToken, isActive: true },
        });
    }
    async unsubscribe(token) {
        const sub = await prisma_1.default.subscriber.findFirst({ where: { unsubscribeToken: token } });
        if (!sub)
            throw new Error('Invalid unsubscribe token');
        return prisma_1.default.subscriber.update({ where: { id: sub.id }, data: { isActive: false } });
    }
    async sendWeeklyDigest() {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const [subscribers, articles] = await Promise.all([
            prisma_1.default.subscriber.findMany({ where: { isActive: true } }),
            prisma_1.default.article.findMany({
                where: { status: client_1.ArticleStatus.PUBLISHED, publishedAt: { gte: sevenDaysAgo } },
                include: { author: { select: { firstName: true, lastName: true } } },
                take: 10,
            }),
        ]);
        if (articles.length === 0) {
            logger_1.logger.info('Weekly digest: no new articles');
            return { sent: 0 };
        }
        const emails = subscribers.map(s => s.email);
        await emailService.sendWeeklyDigest(emails, articles);
        logger_1.logger.info(`Weekly digest sent to ${emails.length} subscribers`);
        return { sent: emails.length, articlesCount: articles.length };
    }
}
exports.KnowledgeService = KnowledgeService;
//# sourceMappingURL=knowledge.service.js.map