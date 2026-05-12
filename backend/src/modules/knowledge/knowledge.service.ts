import fs from 'node:fs/promises';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { randomUUID } from 'node:crypto';

export type CourseQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

export type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body: unknown;
  category: string;
  tags: string[] | null;
  authorId: string | null;
  authorFirstName: string | null;
  authorLastName: string | null;
  readingTimeMinutes: number;
  viewCount: number;
  isPublished: boolean;
  isSponsored: boolean;
  sponsorName: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  htmlContent: string | null;
};

export type CourseRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: unknown;
  assessment: unknown;
  passing_score: number;
  cooldown_hours: number;
  points_awarded: number;
  is_pc_accredited: boolean;
  is_published: boolean;
  published_at: Date | null;
  created_at: Date;
};

export type CourseEnrollmentRow = {
  id: string;
  course_id: string;
  user_id: string;
  pharmacy_id: string;
  status: string;
  progress_percentage: number;
  score: number | null;
  attempts: number;
  last_attempt_at: Date | null;
  completed_at: Date | null;
  certificate_id: string | null;
  created_at: Date;
};

export function mapArticle(row: ArticleRow) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    body: row.body,
    category: row.category,
    tags: row.tags ?? [],
    authorId: row.authorId,
    author: row.authorId
      ? {
          id: row.authorId,
          firstName: row.authorFirstName,
          lastName: row.authorLastName,
        }
      : null,
    readingTimeMinutes: row.readingTimeMinutes,
    viewCount: row.viewCount,
    isPublished: row.isPublished,
    isSponsored: row.isSponsored,
    sponsorName: row.sponsorName,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    htmlContent: row.htmlContent,
  };
}

export function renderArticleBody(body: unknown): string {
  if (!body || typeof body !== 'object' || !Array.isArray((body as any).content)) {
    return '';
  }

  return (body as any).content
    .map((node: any) => {
      if (node.type === 'paragraph' && Array.isArray(node.content)) {
        const text = node.content.map((contentNode: any) => contentNode.text || '').join('');
        return `<p>${text}</p>`;
      }
      if (node.type === 'heading' && Array.isArray(node.content)) {
        const level = node.attrs?.level || 2;
        const text = node.content.map((contentNode: any) => contentNode.text || '').join('');
        return `<h${level}>${text}</h${level}>`;
      }
      return '';
    })
    .join('\n');
}

export function shuffleItems<T>(items: T[]) {
  const clone = [...items];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
}

export async function generateCertificatePdf(input: {
  certificateId: string;
  courseTitle: string;
  userName: string;
  verifyUrl: string;
  isPcAccredited: boolean;
}) {
  const uploadsDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? './uploads');
  const certificatesDir = path.join(uploadsDir, 'certificates');
  await fs.mkdir(certificatesDir, { recursive: true });

  const filePath = path.join(certificatesDir, `${input.certificateId}.pdf`);
  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  const stream = (await import('node:fs')).createWriteStream(filePath);
  doc.pipe(stream);

  doc.fontSize(24).text('APOTEKH Completion Certificate', { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text(`Awarded to ${input.userName}`, { align: 'center' });
  doc.moveDown(0.5);
  doc.text(`For successfully completing ${input.courseTitle}`, { align: 'center' });
  doc.moveDown(1.5);

  if (!input.isPcAccredited) {
    doc.fontSize(11).fillColor('#B45309').text(
      'APOTEKH Completion Certificate - not Pharmacy Council of Tanzania accredited',
      { align: 'center' },
    );
    doc.fillColor('#000000');
  }

  doc.moveDown(2);
  doc.fontSize(12).text(`Verify certificate: ${input.verifyUrl}`, { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).text('Verification link included above for digital confirmation.', { align: 'center' });
  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });

  return {
    certificateId: input.certificateId,
    fileUrl: `/uploads/certificates/${input.certificateId}.pdf`,
    filePath,
  };
}

export function nextCertificateId() {
  return randomUUID();
}
