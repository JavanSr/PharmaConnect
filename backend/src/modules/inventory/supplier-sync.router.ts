import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../../middleware/auth';
import * as supplierSyncService from './supplier-sync.service';

const router = Router();

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

export default router;
