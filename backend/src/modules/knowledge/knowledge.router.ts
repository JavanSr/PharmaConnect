import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import type { AuthRequest } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';

export const knowledgeRouter = Router();
knowledgeRouter.use(authenticate);

knowledgeRouter.get('/articles', async (req: AuthRequest, res, next) => {
  try {
    const { category, search, page = '1', limit = '20' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = { isPublished: true };
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { publishedAt: 'desc' },
        include: { author: { select: { id: true, firstName: true, lastName: true } } },
      }),
      prisma.article.count({ where }),
    ]);
    res.json({ data: articles, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { next(e); }
});

knowledgeRouter.get('/articles/:slug', async (req: AuthRequest, res, next) => {
  try {
    const article = await prisma.article.findUnique({
      where: { slug: req.params.slug },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!article) { res.status(404).json({ error: 'Article not found' }); return; }

    // Increment view count
    await prisma.article.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    });

    res.json({ data: article });
  } catch (e) { next(e); }
});
