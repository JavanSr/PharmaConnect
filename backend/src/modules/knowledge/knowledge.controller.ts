import { Request, Response } from 'express';
import { KnowledgeService } from './knowledge.service';
import { z } from 'zod';
import { ArticleStatus } from '@prisma/client';

const service = new KnowledgeService();

const articleSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().optional(),
  body: z.any(),
  category: z.string().min(1),
  tags: z.array(z.string()).optional(),
  status: z.nativeEnum(ArticleStatus).optional(),
  isSponsored: z.boolean().optional(),
  sponsorName: z.string().optional(),
  featuredImage: z.string().optional(),
  scheduledFor: z.string().optional().transform(s => s ? new Date(s) : undefined),
});

export const listArticles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, status, tag, search, page = '1', limit = '12' } = req.query;
    const user = (req as any).user;
    const adminView = user && ['SUPER_ADMIN', 'PHARMACIST_IN_CHARGE'].includes(user.role);
    const result = await service.listArticles(
      { category: category as string, status: status as ArticleStatus, tag: tag as string, search: search as string, adminView },
      { page: parseInt(page as string), limit: parseInt(limit as string) }
    );
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const article = await service.getArticle(req.params.slug);
    res.json({ success: true, data: article });
  } catch (err: any) {
    res.status(err.message === 'Article not found' ? 404 : 500).json({ success: false, error: err.message });
  }
};

export const createArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const authorId = (req as any).user.id;
    const data = articleSchema.parse(req.body);
    const article = await service.createArticle(authorId, data as any);
    res.status(201).json({ success: true, data: article });
  } catch (err: any) {
    if (err.name === 'ZodError') { res.status(400).json({ success: false, error: err.errors }); return; }
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const article = await service.updateArticle(req.params.id, req.body);
    res.json({ success: true, data: article });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    await service.deleteArticle(req.params.id);
    res.json({ success: true, message: 'Article archived' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const subscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) { res.status(400).json({ success: false, error: 'Email required' }); return; }
    await service.subscribe(email);
    res.status(201).json({ success: true, message: 'Subscribed successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const unsubscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    await service.unsubscribe(req.params.token);
    res.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (err: any) {
    res.status(err.message.includes('Invalid') ? 404 : 500).json({ success: false, error: err.message });
  }
};

export const sendDigest = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.sendWeeklyDigest();
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
