import { Router } from 'express';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { authenticate, requireRole, AuthRequest } from '../../middleware/auth';

export const catalogueImportRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted'));
    }
  },
});

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

catalogueImportRouter.post(
  '/extract',
  authenticate,
  requireRole('OWNER', 'PHARMACIST_IN_CHARGE', 'DATA_ENTRY_CLERK', 'SUPER_ADMIN'),
  upload.single('file'),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No PDF file uploaded' });
        return;
      }

      const pdfBase64 = req.file.buffer.toString('base64');

      const message = await client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: pdfBase64,
                },
              },
              {
                type: 'text',
                text: `Extract all medicine/pharmaceutical products from this catalogue PDF and return them as a JSON array.

For each product extract:
- productName (string, required): trade/brand name of the product
- genericName (string, required): INN/generic name
- brandName (string, optional): manufacturer brand if different from productName
- manufacturer (string, optional): manufacturer name
- dosageForm (string, optional): e.g. TABLET, CAPSULE, SYRUP, INJECTION, CREAM, OINTMENT, DROPS, INHALER, SUPPOSITORY, POWDER, SOLUTION
- strength (string, optional): e.g. "500mg", "250mg/5ml"
- packSize (string, optional): e.g. "30 tablets", "100ml"
- unitOfMeasure (string, optional): e.g. "tablet", "ml", "vial"
- tmdaRegistrationNumber (string, optional): TMDA or regulatory registration number if listed

Return ONLY a valid JSON array with no markdown, no explanation, no code fences. Example format:
[{"productName":"Amoxicillin 500mg Capsules","genericName":"Amoxicillin","dosageForm":"CAPSULE","strength":"500mg","packSize":"30 capsules","manufacturer":"Shelys Pharma"}]

If no products are found, return an empty array: []`,
              },
            ],
          },
        ],
      });

      const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '[]';

      let products: unknown[];
      try {
        products = JSON.parse(text);
        if (!Array.isArray(products)) products = [];
      } catch {
        products = [];
      }

      const productSchema = z.object({
        productName: z.string().min(1),
        genericName: z.string().min(1),
        brandName: z.string().optional(),
        manufacturer: z.string().optional(),
        dosageForm: z.string().optional(),
        strength: z.string().optional(),
        packSize: z.string().optional(),
        unitOfMeasure: z.string().optional(),
        tmdaRegistrationNumber: z.string().optional(),
      });

      const validated = (products as unknown[])
        .map(p => { try { return productSchema.parse(p); } catch { return null; } })
        .filter(Boolean);

      res.json({ data: validated, count: validated.length });
    } catch (e) {
      next(e);
    }
  },
);
