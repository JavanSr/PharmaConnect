import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, assertUser, type AuthRequest } from '../../middleware/auth';
import { enforceTrialRestrictions } from '../../middleware/trial';

export const knowledgeChatRouter = Router();

knowledgeChatRouter.use(authenticate);
knowledgeChatRouter.use(enforceTrialRestrictions);

const pid = (req: AuthRequest): string => {
  const p = req.user?.pharmacyId;
  if (!p) throw Object.assign(new Error('Pharmacy context required'), { status: 400 });
  return p;
};

const uid = (req: AuthRequest): string => assertUser(req).userId;

const CHAT_CATEGORIES = ['GENERAL', 'DRUG_SAFETY', 'CLINICAL', 'REGULATORY', 'BUSINESS', 'DISPENSING'] as const;

// ── Threads ───────────────────────────────────────────────────────────────────

knowledgeChatRouter.get('/threads', async (req: AuthRequest, res, next) => {
  try {
    const { category, page, limit } = z.object({
      category: z.string().optional(),
      page:     z.coerce.number().int().min(1).optional(),
      limit:    z.coerce.number().int().min(1).max(50).optional(),
    }).parse(req.query);

    const take   = limit ?? 20;
    const skip   = ((page ?? 1) - 1) * take;
    const pharmacyId = pid(req);

    const [threads, total] = await Promise.all([
      prisma.chatThread.findMany({
        where: {
          pharmacyId,
          ...(category ? { category } : {}),
        },
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
        take,
        skip,
        include: {
          author: { select: { id: true, firstName: true, lastName: true, role: true } },
          _count: { select: { messages: true } },
        },
      }),
      prisma.chatThread.count({ where: { pharmacyId, ...(category ? { category } : {}) } }),
    ]);

    res.json({
      data: threads.map(t => ({
        id:         t.id,
        title:      t.title,
        body:       t.body,
        category:   t.category,
        isPinned:   t.isPinned,
        isLocked:   t.isLocked,
        viewCount:  t.viewCount,
        replyCount: t._count.messages,
        author:     t.author,
        createdAt:  t.createdAt,
        updatedAt:  t.updatedAt,
      })),
      total,
      page:   page ?? 1,
      limit:  take,
    });
  } catch (e) { next(e); }
});

knowledgeChatRouter.post('/threads', async (req: AuthRequest, res, next) => {
  try {
    const body = z.object({
      title:    z.string().min(5).max(255),
      body:     z.string().min(10).max(5000),
      category: z.enum(CHAT_CATEGORIES).optional(),
    }).parse(req.body);

    const thread = await prisma.chatThread.create({
      data: {
        pharmacyId: pid(req),
        authorId:   uid(req),
        title:      body.title,
        body:       body.body,
        category:   body.category ?? 'GENERAL',
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    res.status(201).json({ data: thread });
  } catch (e) { next(e); }
});

knowledgeChatRouter.get('/threads/:id', async (req: AuthRequest, res, next) => {
  try {
    const thread = await prisma.chatThread.findFirst({
      where: { id: req.params.id, pharmacyId: pid(req) },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
      },
    });

    if (!thread) { res.status(404).json({ error: 'Thread not found' }); return; }

    // Increment view count
    await prisma.chatThread.update({
      where: { id: thread.id },
      data:  { viewCount: { increment: 1 } },
    });

    res.json({ data: thread });
  } catch (e) { next(e); }
});

// ── Messages ──────────────────────────────────────────────────────────────────

knowledgeChatRouter.post('/threads/:id/messages', async (req: AuthRequest, res, next) => {
  try {
    const { body } = z.object({ body: z.string().min(2).max(2000) }).parse(req.body);
    const pharmacyId = pid(req);

    const thread = await prisma.chatThread.findFirst({
      where: { id: req.params.id, pharmacyId },
    });

    if (!thread) { res.status(404).json({ error: 'Thread not found' }); return; }
    if (thread.isLocked) { res.status(403).json({ error: 'Thread is locked' }); return; }

    const [message] = await prisma.$transaction([
      prisma.chatMessage.create({
        data: { threadId: thread.id, authorId: uid(req), body },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      }),
      prisma.chatThread.update({
        where: { id: thread.id },
        data:  { replyCount: { increment: 1 }, updatedAt: new Date() },
      }),
    ]);

    res.status(201).json({ data: message });
  } catch (e) { next(e); }
});

knowledgeChatRouter.patch('/threads/:threadId/messages/:messageId', async (req: AuthRequest, res, next) => {
  try {
    const { body } = z.object({ body: z.string().min(2).max(2000) }).parse(req.body);
    const existing = await prisma.chatMessage.findFirst({
      where: { id: req.params.messageId, authorId: uid(req) },
    });
    if (!existing) { res.status(404).json({ error: 'Message not found or not yours' }); return; }

    const message = await prisma.chatMessage.update({
      where: { id: req.params.messageId },
      data:  { body, isEdited: true },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });
    res.json({ data: message });
  } catch (e) { next(e); }
});

knowledgeChatRouter.delete('/threads/:threadId/messages/:messageId', async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.chatMessage.findFirst({
      where: { id: req.params.messageId, authorId: uid(req) },
    });
    if (!existing) { res.status(404).json({ error: 'Message not found or not yours' }); return; }

    await prisma.$transaction([
      prisma.chatMessage.delete({ where: { id: req.params.messageId } }),
      prisma.chatThread.update({
        where: { id: req.params.threadId },
        data:  { replyCount: { decrement: 1 } },
      }),
    ]);
    res.json({ data: { deleted: true } });
  } catch (e) { next(e); }
});
