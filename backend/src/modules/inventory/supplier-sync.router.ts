import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { authenticate, requireRole, AuthRequest } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import * as supplierSyncService from './supplier-sync.service';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const mimeType = file.mimetype;
    if (mimeType === 'text/csv' || mimeType === 'application/vnd.ms-excel' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are accepted'));
    }
  },
});

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// GET /api/v1/suppliers/apotekh-wholesalers
// List all APOTEKH network wholesalers available for sync
router.get('/apotekh-wholesalers', authenticate, async (req: AuthRequest, res) => {
  try {
    const region = (req.query.region as string) || undefined;
    const wholesalers = await supplierSyncService.getApotekWholesalers(region);
    res.json({ data: wholesalers });
  } catch (error) {
    const err = error as any;
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/v1/suppliers/register
// Pre-register a wholesaler with full details (SUPER_ADMIN only)
router.post('/register', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res): Promise<void> => {
  try {
    const schema = z.object({
      name: z.string().min(1, 'Supplier name required'),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      address: z.string().optional(),
    });

    const body = schema.parse(req.body);

    // Find or create a system pharmacy to hold APOTEKH wholesalers
    let systemPharmacy = await prisma.pharmacy.findFirst({
      where: { name: 'APOTEKH Office' },
    });

    if (!systemPharmacy) {
      systemPharmacy = await prisma.pharmacy.findFirst();
    }

    if (!systemPharmacy) {
      res.status(500).json({ error: 'No pharmacy found in system' });
      return;
    }

    const supplier = await prisma.supplier.create({
      data: {
        pharmacyId: systemPharmacy.id,
        name: body.name,
        phone: body.phone,
        email: body.email,
        address: body.address,
        isApotekNetworkWholesaler: true,
        isActive: true,
      },
    });

    const catalogue = await prisma.supplierCatalogue.create({
      data: {
        wholesalerId: supplier.id,
        lastSyncedAt: new Date(),
        syncStatus: 'ACTIVE',
        totalItemsAvailable: 0,
      },
    });

    res.status(201).json({
      data: {
        supplierId: supplier.id,
        name: supplier.name,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        catalogueId: catalogue.id,
        message: 'Wholesaler registered. Ready to upload product CSV.',
      },
    });
  } catch (error) {
    const err = error as any;
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/v1/sync/supplier-catalogue/:supplierId
// Sync a specific wholesaler's catalogue for the current pharmacy
router.post('/sync/supplier-catalogue/:supplierId', authenticate, async (req: AuthRequest, res): Promise<void> => {
  try {
    const schema = z.object({
      force: z.boolean().optional(),
    });

    const body = schema.parse(req.body || {});
    const { supplierId } = req.params;

    if (!req.user?.pharmacyId) {
      res.status(401).json({ error: 'Pharmacy not found in session' });
      return;
    }

    const result = await supplierSyncService.syncSupplierCatalogue(req.user.pharmacyId, supplierId, body.force);
    res.json({ data: result });
  } catch (error) {
    const err = error as any;
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/v1/my-catalogues
// Get all cached catalogues for current pharmacy
router.get('/my-catalogues', authenticate, async (req: AuthRequest, res): Promise<void> => {
  try {
    const syncStatus = (req.query.syncStatus as string) || undefined;

    if (!req.user?.pharmacyId) {
      res.status(401).json({ error: 'Pharmacy not found in session' });
      return;
    }

    const catalogues = await supplierSyncService.getRetailPharmacyCatalogues(req.user.pharmacyId, syncStatus);
    res.json({ data: catalogues });
  } catch (error) {
    const err = error as any;
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/v1/supplier-catalogues/:catalogueId/items
// Search items in a specific catalogue
router.get('/supplier-catalogues/:catalogueId/items', authenticate, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      search: z.string().optional(),
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
    });

    const query = schema.parse(req.query);
    const { catalogueId } = req.params;

    const result = await supplierSyncService.searchSupplierCatalogueItems(catalogueId, {
      search: query.search,
      page: query.page,
      limit: query.limit,
    });

    res.json(result);
  } catch (error) {
    const err = error as any;
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/v1/suppliers/upload-csv
// Upload wholesaler catalogue as CSV (SUPER_ADMIN only)
// Mode 1 (pre-registration): supplierId in body — link all products to that supplier
// Mode 2 (auto-create): no supplierId — group by wholesalername and create suppliers
router.post('/upload-csv', authenticate, requireRole('SUPER_ADMIN'), upload.single('file'), async (req: AuthRequest, res): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No CSV file uploaded' });
      return;
    }

    const csv = req.file.buffer.toString('utf-8');
    const lines = csv.trim().split('\n');

    if (lines.length < 2) {
      res.status(400).json({ error: 'CSV must have header row and at least one data row' });
      return;
    }

    const headers = parseCSVLine(lines[0]);
    const headerMap: Record<string, number> = {};
    headers.forEach((h, i) => {
      headerMap[h.toLowerCase().replace(/\s+/g, '')] = i;
    });

    // Required headers: product_name, unit_price (wholesalername required only for auto-create mode)
    const requiredHeaders = ['productname', 'unitprice'];
    const missing = requiredHeaders.filter((h) => !(h in headerMap));
    if (missing.length > 0) {
      res.status(400).json({
        error: `Missing required headers: ${missing.join(', ')}. Required: product_name, unit_price`,
      });
      return;
    }

    const supplierId = req.body.supplierId as string | undefined;
    const results: Array<{ success: boolean; row: number; message: string }> = [];
    const suppressErrors = (req.query.suppressErrors as string) === 'true';

    // Group by wholesaler (for auto-create mode) OR use single supplier (pre-registration mode)
    const wholesalerMap = new Map<string, Array<{ productName: string; unitPrice: number; genericName?: string; strength?: string; dosageForm?: string; quantity?: number }>>();

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.every((v) => !v)) continue; // Skip empty rows

      const productName = values[headerMap['productname']]?.trim() || '';
      const unitPriceStr = values[headerMap['unitprice']]?.trim() || '0';
      const unitPrice = parseFloat(unitPriceStr);

      if (!productName || !unitPriceStr || isNaN(unitPrice)) {
        if (!suppressErrors) {
          results.push({
            success: false,
            row: i + 1,
            message: `Missing required fields: product_name, unit_price`,
          });
        }
        continue;
      }

      const wholesalerName = supplierId ? 'PRE_REGISTERED' : (values[headerMap['wholesalername']]?.trim() || '');
      if (!supplierId && !wholesalerName) {
        if (!suppressErrors) {
          results.push({
            success: false,
            row: i + 1,
            message: `Missing wholesalername (required for auto-create mode)`,
          });
        }
        continue;
      }

      const genericName = values[headerMap['genericname']]?.trim();
      const strength = values[headerMap['strength']]?.trim();
      const dosageForm = values[headerMap['dosageform']]?.trim();
      const quantityStr = values[headerMap['quantity']]?.trim() || '0';
      const quantity = parseInt(quantityStr, 10) || 0;

      if (!wholesalerMap.has(wholesalerName)) {
        wholesalerMap.set(wholesalerName, []);
      }

      wholesalerMap.get(wholesalerName)!.push({
        productName,
        unitPrice,
        genericName,
        strength,
        dosageForm,
        quantity: Math.max(quantity, 0),
      });
    }

    // Get system pharmacy for auto-create mode
    let systemPharmacy;
    if (!supplierId) {
      systemPharmacy = await prisma.pharmacy.findFirst({
        where: { name: 'APOTEKH Office' },
      });
      if (!systemPharmacy) {
        systemPharmacy = await prisma.pharmacy.findFirst();
      }
      if (!systemPharmacy) {
        res.status(500).json({ error: 'No pharmacy found in system' });
        return;
      }
    }

    // Process each wholesaler atomically — deleteMany + createMany must succeed together
    for (const [wholesalerName, products] of wholesalerMap.entries()) {
      try {
        const importedCount = await prisma.$transaction(async (tx) => {
          let supplier;

          if (supplierId) {
            supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
            if (!supplier) {
              throw Object.assign(new Error(`Supplier with ID ${supplierId} not found`), { code: 'NOT_FOUND' });
            }
          } else {
            supplier = await tx.supplier.findFirst({
              where: { name: wholesalerName, isApotekNetworkWholesaler: true },
            });
            if (!supplier) {
              supplier = await tx.supplier.create({
                data: {
                  pharmacyId: systemPharmacy!.id,
                  name: wholesalerName,
                  isApotekNetworkWholesaler: true,
                  isActive: true,
                },
              });
            }
          }

          let catalogue = await tx.supplierCatalogue.findFirst({
            where: { wholesalerId: supplier.id, retailPharmacyId: null },
          });

          if (!catalogue) {
            catalogue = await tx.supplierCatalogue.create({
              data: {
                wholesalerId: supplier.id,
                lastSyncedAt: new Date(),
                syncStatus: 'ACTIVE',
                totalItemsAvailable: products.length,
              },
            });
          } else {
            catalogue = await tx.supplierCatalogue.update({
              where: { id: catalogue.id },
              data: {
                lastSyncedAt: new Date(),
                syncStatus: 'ACTIVE',
                totalItemsAvailable: products.length,
              },
            });
          }

          await tx.supplierCatalogueItem.deleteMany({ where: { catalogueId: catalogue.id } });

          const itemsToCreate: Prisma.SupplierCatalogueItemCreateManyInput[] = products.map((p) => ({
            catalogueId: catalogue.id,
            productName: p.productName,
            genericName: p.genericName || null,
            strength: p.strength || null,
            dosageForm: p.dosageForm || null,
            quantityAvailable: Math.max(p.quantity || 0, 0),
            unitPrice: new Prisma.Decimal(p.unitPrice),
            minimumOrderQuantity: 1,
          }));

          await tx.supplierCatalogueItem.createMany({ data: itemsToCreate });
          return itemsToCreate.length;
        });

        results.push({
          success: true,
          row: wholesalerName.length,
          message: `Imported ${importedCount} products from ${wholesalerName}`,
        });
      } catch (error) {
        results.push({
          success: false,
          row: 0,
          message: (error as any).code === 'NOT_FOUND'
            ? (error as Error).message
            : `Failed to import ${wholesalerName}: ${(error as any).message}`,
        });
      }
    }

    res.json({
      data: {
        imported: wholesalerMap.size,
        itemCount: Array.from(wholesalerMap.values()).reduce((sum, items) => sum + items.length, 0),
        results: suppressErrors ? [] : results,
      },
    });
  } catch (error) {
    const err = error as any;
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/v1/suppliers/apotekh-wholesalers/:wholesalerId/catalogue
// View a specific wholesaler's catalogue
router.get('/apotekh-wholesalers/:wholesalerId/catalogue', authenticate, async (req: AuthRequest, res): Promise<void> => {
  try {
    const schema = z.object({
      search: z.string().optional(),
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
    });

    const query = schema.parse(req.query);
    const { wholesalerId } = req.params;

    if (!req.user?.pharmacyId) {
      res.status(401).json({ error: 'Pharmacy not found in session' });
      return;
    }

    // Find or create a catalogue for this wholesaler for the current pharmacy
    const catalogueResult = await supplierSyncService.syncSupplierCatalogue(
      req.user.pharmacyId,
      wholesalerId,
      false,
    );

    // Now search the catalogue
    const result = await supplierSyncService.searchSupplierCatalogueItems(catalogueResult.id, {
      search: query.search,
      page: query.page,
      limit: query.limit,
    });

    res.json(result);
  } catch (error) {
    const err = error as any;
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/v1/suppliers/price-comparison
// Compare prices for a product across all suppliers
router.get('/price-comparison', authenticate, async (req: AuthRequest, res): Promise<void> => {
  try {
    const schema = z.object({
      productName: z.string().min(1),
      genericName: z.string().optional(),
    });

    const query = schema.parse(req.query);

    if (!req.user?.pharmacyId) {
      res.status(401).json({ error: 'Pharmacy not found in session' });
      return;
    }

    const results = await supplierSyncService.getPriceComparison(
      req.user.pharmacyId,
      query.productName,
      query.genericName,
    );

    res.json({ data: results });
  } catch (error) {
    const err = error as any;
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
