import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authenticate, type AuthRequest } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permissions';
import { enforceTrialRestrictions } from '../../middleware/trial';
import { prisma } from '../../lib/prisma';
import {
  type ArticleRow,
  type CourseEnrollmentRow,
  type CourseQuestion,
  type CourseRow,
  generateCertificatePdf,
  mapArticle,
  nextCertificateId,
  shuffleItems,
} from './knowledge.service';

type BulletinRow = {
  id: string;
  title: string;
  body: unknown;
  is_urgent: boolean;
  is_published: boolean;
  published_at: Date | null;
  created_at: Date;
};

type PublicationRow = {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  cover_image_url: string | null;
  category: string | null;
  is_published: boolean;
  published_at: Date | null;
  created_at: Date;
};

const knowledgeRouter = Router();

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeArticleHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<(iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/\son\w+=(["']).*?\1/gi, '')
    .replace(/\son\w+=\S+/gi, '')
    .replace(/\s(href|src)=(["'])\s*javascript:.*?\2/gi, '')
    .replace(/\s(href|src)=\s*javascript:\S+/gi, '');
}

function renderSafeArticleBody(body: unknown): string {
  if (!body || typeof body !== 'object' || !Array.isArray((body as any).content)) {
    return '';
  }

  return (body as any).content
    .map((node: any) => {
      if (node.type === 'paragraph' && Array.isArray(node.content)) {
        const text = node.content.map((contentNode: any) => contentNode.text || '').join('');
        return `<p>${escHtml(text)}</p>`;
      }
      if (node.type === 'heading' && Array.isArray(node.content)) {
        const level = Math.min(Math.max(Number(node.attrs?.level) || 2, 1), 6);
        const text = node.content.map((contentNode: any) => contentNode.text || '').join('');
        return `<h${level}>${escHtml(text)}</h${level}>`;
      }
      return '';
    })
    .join('\n');
}

function isPremiumKnowledgeTier(req: AuthRequest) {
  const tier = req.user?.pharmacy?.subscriptionTier;
  return tier === 'PREMIUM' || tier === 'ENTERPRISE';
}

function pid(req: AuthRequest): string {
  const p = req.user?.pharmacyId;
  if (!p) throw Object.assign(new Error('Pharmacy context required'), { status: 400 });
  return p;
}

async function fetchCourse(courseIdOrSlug: string) {
  const rows = await prisma.$queryRaw<CourseRow[]>(Prisma.sql`
      SELECT *
      FROM "courses"
      WHERE ("id" = ${courseIdOrSlug} OR "slug" = ${courseIdOrSlug})
        AND "is_published" = true
      LIMIT 1
    `);

  return rows[0] ?? null;
}

knowledgeRouter.post('/subscribe', async (req, res, next) => {
  try {
    const payload = z.object({ email: z.string().email() }).parse(req.body);
    const rows = await prisma.$queryRaw<Array<{ email: string; unsubscribe_token: string }>>`
      INSERT INTO "email_subscribers" ("email")
      VALUES (${payload.email.toLowerCase()})
      ON CONFLICT ("email")
      DO UPDATE SET
        "is_active" = true,
        "unsubscribed_at" = NULL
      RETURNING "email", "unsubscribe_token"
    `;

    res.status(201).json({ data: rows[0] });
  } catch (error) {
    next(error);
  }
});

knowledgeRouter.get('/unsubscribe/:token', async (req, res, next) => {
  try {
    await prisma.$executeRaw`
      UPDATE "email_subscribers"
      SET "is_active" = false,
          "unsubscribed_at" = NOW()
      WHERE "unsubscribe_token" = ${req.params.token}
    `;

    res.status(200).send('<html><body><h1>Unsubscribed</h1><p>You will no longer receive weekly digests.</p></body></html>');
  } catch (error) {
    next(error);
  }
});

knowledgeRouter.get('/verify/:certificateId', async (req, res, next) => {
  try {
    const rows = await prisma.$queryRaw<Array<{
      title: string;
      certificate_id: string | null;
      completed_at: Date | null;
      score: number | null;
      points_awarded: number;
      is_pc_accredited: boolean;
      first_name: string;
      last_name: string;
    }>>(Prisma.sql`
        SELECT
          c."title",
          ce."certificate_id",
          ce."completed_at",
          ce."score",
          c."points_awarded",
          c."is_pc_accredited",
          u."firstName" AS first_name,
          u."lastName" AS last_name
        FROM "course_enrolments" ce
        INNER JOIN "courses" c ON c."id" = ce."course_id"
        INNER JOIN "users" u ON u."id" = ce."user_id"
        WHERE ce."certificate_id" = ${req.params.certificateId}
        LIMIT 1
      `);

    const row = rows[0];
    if (!row) {
      res.status(404).json({ error: 'Certificate not found' });
      return;
    }

    res.json({
      data: {
        certificateId: row.certificate_id,
        courseTitle: row.title,
        holderName: `${row.first_name} ${row.last_name}`,
        completedAt: row.completed_at?.toISOString() ?? null,
        score: row.score,
        pointsAwarded: row.points_awarded,
        isPcAccredited: row.is_pc_accredited,
      },
    });
  } catch (error) {
    next(error);
  }
});

knowledgeRouter.use(authenticate);
knowledgeRouter.use(enforceTrialRestrictions);
knowledgeRouter.use(requirePermission('knowledge.view'));

knowledgeRouter.get('/articles/:slug/html', async (req, res, next) => {
  try {
    const article = await prisma.article.findUnique({ where: { slug: req.params.slug } });
    if (!article || !article.isPublished) {
      res.status(404).send('Article not found');
      return;
    }

    const badge = article.isSponsored
      ? '<span data-sponsored="true" class="sponsored-badge">SPONSORED</span>'
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escHtml(article.title)}</title>
          <style>
            body { font-family: "DM Sans", Arial, sans-serif; padding: 40px; color: #0D4035; }
            .sponsored-badge { display: inline-block; background: #FBBF24; color: #111827; padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; }
          </style>
        </head>
        <body>
          ${badge}
          <h1>${escHtml(article.title)}</h1>
          <article>${(article as any).htmlContent ? sanitizeArticleHtml((article as any).htmlContent) : renderSafeArticleBody(article.body)}</article>
        </body>
      </html>
    `;

    res.type('html').send(html);
  } catch (error) {
    next(error);
  }
});

knowledgeRouter.get('/articles', async (req: AuthRequest, res, next) => {
  try {
    const query = z.object({
      category: z.string().optional(),
      search: z.string().optional(),
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(50).optional(),
    }).parse(req.query);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const conditions: Prisma.Sql[] = [Prisma.sql`a."isPublished" = true`];

    if (query.category) {
      conditions.push(Prisma.sql`a."category" = ${query.category}`);
    }

    if (query.search) {
      conditions.push(Prisma.sql`
        to_tsvector(
          'english',
          coalesce(a."title", '') || ' ' ||
          coalesce(a."summary", '') || ' ' ||
          array_to_string(a."tags", ' ') || ' ' ||
          coalesce(a."body"::text, '')
        ) @@ plainto_tsquery('english', ${query.search})
      `);
    }

    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
    const rows = await prisma.$queryRaw<ArticleRow[]>(Prisma.sql`
        WITH ranked AS (
          SELECT
            a.*,
            u."firstName" AS "authorFirstName",
            u."lastName" AS "authorLastName",
            CASE
              WHEN a."isSponsored"
              THEN ROW_NUMBER() OVER (PARTITION BY a."isSponsored" ORDER BY a."publishedAt" DESC NULLS LAST, a."createdAt" DESC)
              ELSE NULL
            END AS sponsored_rank
          FROM "articles" a
          LEFT JOIN "users" u ON u."id" = a."authorId"
          ${whereClause}
        )
        SELECT
          "id",
          "slug",
          "title",
          "summary",
          "body",
          "category",
          "tags",
          "authorId",
          "authorFirstName",
          "authorLastName",
          "readingTimeMinutes",
          "viewCount",
          "isPublished",
          "isSponsored",
          "sponsorName",
          "publishedAt",
          "createdAt",
          "html_content" AS "htmlContent"
        FROM ranked
        WHERE NOT "isSponsored" OR sponsored_rank <= 3
        ORDER BY "isSponsored" DESC, "publishedAt" DESC NULLS LAST, "createdAt" DESC
        OFFSET ${offset}
        LIMIT ${limit}
      `);

    res.json({
      data: rows.map(mapArticle),
      total: rows.length,
      page,
      limit,
      totalPages: rows.length < limit ? page : page + 1,
    });
  } catch (error) {
    next(error);
  }
});

knowledgeRouter.get('/articles/:slug', async (req: AuthRequest, res, next) => {
  try {
    const article = await prisma.article.findUnique({
      where: { slug: req.params.slug },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });

    if (!article || !article.isPublished) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    await prisma.article.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    });

    res.json({
      data: mapArticle({
        ...article,
        authorFirstName: article.author?.firstName ?? null,
        authorLastName: article.author?.lastName ?? null,
        htmlContent: (article as any).htmlContent ?? null,
      } as ArticleRow),
    });
  } catch (error) {
    next(error);
  }
});

knowledgeRouter.get('/bulletins', async (_req: AuthRequest, res, next) => {
  try {
    const rows = await prisma.$queryRaw<BulletinRow[]>`
      SELECT *
      FROM "bulletins"
      WHERE "is_published" = true
      ORDER BY "is_urgent" DESC, "published_at" DESC NULLS LAST, "created_at" DESC
      LIMIT 20
    `;

    res.json({
      data: rows.map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        isUrgent: row.is_urgent,
        isPublished: row.is_published,
        publishedAt: row.published_at?.toISOString() ?? null,
        createdAt: row.created_at.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

knowledgeRouter.get('/publications', async (_req: AuthRequest, res, next) => {
  try {
    const rows = await prisma.$queryRaw<PublicationRow[]>`
      SELECT *
      FROM "publications"
      WHERE "is_published" = true
      ORDER BY "published_at" DESC NULLS LAST, "created_at" DESC
      LIMIT 50
    `;

    res.json({
      data: rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        fileUrl: row.file_url,
        coverImageUrl: row.cover_image_url,
        category: row.category,
        isPublished: row.is_published,
        publishedAt: row.published_at?.toISOString() ?? null,
        createdAt: row.created_at.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

knowledgeRouter.get('/courses', async (req: AuthRequest, res, next) => {
  try {
    if (!isPremiumKnowledgeTier(req)) {
      res.status(403).json({ error: 'TIER_INSUFFICIENT' });
      return;
    }

    const rows = await prisma.$queryRaw<CourseRow[]>`
      SELECT *
      FROM "courses"
      WHERE "is_published" = true
      ORDER BY "published_at" DESC NULLS LAST, "created_at" DESC
      LIMIT 50
    `;

    res.json({
      data: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        passingScore: row.passing_score,
        cooldownHours: row.cooldown_hours,
        pointsAwarded: row.points_awarded,
        isPcAccredited: row.is_pc_accredited,
        publishedAt: row.published_at?.toISOString() ?? null,
        content: row.content,
      })),
    });
  } catch (error) {
    next(error);
  }
});

knowledgeRouter.get('/courses/:slug', async (req: AuthRequest, res, next) => {
  try {
    if (!isPremiumKnowledgeTier(req)) {
      res.status(403).json({ error: 'TIER_INSUFFICIENT' });
      return;
    }

    const course = await fetchCourse(req.params.slug);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    const enrolments = await prisma.$queryRaw<CourseEnrollmentRow[]>`
      SELECT *
      FROM "course_enrolments"
      WHERE "course_id" = ${course.id}
        AND "user_id" = ${req.user!.userId}
      LIMIT 1
    `;

    res.json({
      data: {
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        content: course.content,
        assessment: course.assessment,
        passingScore: course.passing_score,
        cooldownHours: course.cooldown_hours,
        pointsAwarded: course.points_awarded,
        isPcAccredited: course.is_pc_accredited,
        enrolment: enrolments[0] ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
});

knowledgeRouter.post('/courses/:id/enrol', async (req: AuthRequest, res, next) => {
  try {
    if (!isPremiumKnowledgeTier(req)) {
      res.status(403).json({ error: 'TIER_INSUFFICIENT' });
      return;
    }

    const course = await fetchCourse(req.params.id);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "course_enrolments" ("course_id", "user_id", "pharmacy_id")
      VALUES (${course.id}, ${req.user!.userId}, ${pid(req)})
      ON CONFLICT ("course_id", "user_id")
      DO UPDATE SET "updated_at" = NOW()
      RETURNING "id"
    `;

    res.status(201).json({ data: { enrolmentId: rows[0]?.id } });
  } catch (error) {
    next(error);
  }
});

knowledgeRouter.post('/courses/:id/attempt', async (req: AuthRequest, res, next) => {
  try {
    if (!isPremiumKnowledgeTier(req)) {
      res.status(403).json({ error: 'TIER_INSUFFICIENT' });
      return;
    }

    const payload = z.object({ answers: z.record(z.coerce.number()) }).parse(req.body);
    const course = await fetchCourse(req.params.id);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    const enrolments = await prisma.$queryRaw<CourseEnrollmentRow[]>`
      SELECT *
      FROM "course_enrolments"
      WHERE "course_id" = ${course.id}
        AND "user_id" = ${req.user!.userId}
      LIMIT 1
    `;

    const enrolment = enrolments[0];
    if (!enrolment) {
      res.status(400).json({ error: 'ENROLMENT_REQUIRED' });
      return;
    }

    if (enrolment.last_attempt_at) {
      const nextAttemptAt = new Date(enrolment.last_attempt_at.getTime() + course.cooldown_hours * 60 * 60 * 1000);
      if (nextAttemptAt > new Date()) {
        res.status(429).json({ error: 'COURSE_COOLDOWN_ACTIVE', retry_after: nextAttemptAt.toISOString() });
        return;
      }
    }

    const assessment = course.assessment as { questions?: CourseQuestion[] };
    const questions = shuffleItems(assessment.questions ?? []);
    const totalQuestions = questions.length || 1;
    const correct = questions.filter((question) => payload.answers[question.id] === question.correctIndex).length;
    const score = Math.round((correct / totalQuestions) * 100);
    const passed = score >= course.passing_score;
    const certificateId = passed ? nextCertificateId() : null;

    await prisma.$executeRaw`
      UPDATE "course_enrolments"
      SET
        "attempts" = "attempts" + 1,
        "last_attempt_at" = NOW(),
        "score" = ${score},
        "status" = ${passed ? 'PASSED' : 'FAILED'},
        "progress_percentage" = ${passed ? 100 : Math.min(90, Math.max(enrolment.progress_percentage, 60))},
        "completed_at" = ${passed ? new Date() : null},
        "certificate_id" = ${certificateId}
      WHERE "id" = ${enrolment.id}
    `;

    let certificateUrl: string | null = null;

    if (passed && certificateId) {
      const verifyUrl = `${process.env.APP_URL || 'http://localhost:5173'}/verify/${certificateId}`;
      const pdf = await generateCertificatePdf({
        certificateId,
        courseTitle: course.title,
        userName: req.user?.email ?? 'APOTEKH User',
        verifyUrl,
        isPcAccredited: course.is_pc_accredited,
      });
      certificateUrl = pdf.fileUrl;

      await prisma.$executeRaw`
        INSERT INTO "cpd_activities" (
          "id",
          "userId",
          "activityType",
          "title",
          "provider",
          "activityDate",
          "pointsClaimed",
          "pointsApproved",
          "certificate",
          "notes",
          "renewal_year",
          "auto_logged",
          "course_enrolment_id"
        )
        VALUES (
          ${randomUUID()},
          ${req.user!.userId},
          'ONLINE_COURSE',
          ${course.title},
          'APOTEKH',
          NOW(),
          ${course.points_awarded},
          ${course.points_awarded},
          ${certificateUrl},
          'Auto-logged after successful course completion',
          ${new Date().getFullYear()},
          true,
          ${enrolment.id}
        )
      `;
    }

    res.json({
      data: {
        score,
        passed,
        certificateId,
        certificateUrl,
        retryAfter: passed ? null : new Date(Date.now() + course.cooldown_hours * 60 * 60 * 1000).toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export { knowledgeRouter };
