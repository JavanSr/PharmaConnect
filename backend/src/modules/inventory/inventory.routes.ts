import { Router } from 'express';
import { UserRole } from '@prisma/client';
import multer from 'multer';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import {
  listDrugMaster,
  searchDrugMaster,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  scanBarcode,
  importProducts,
  listBatches,
  createBatch,
  listMovements,
  recordMovement,
  checkoutCart,
  getStockOnHand,
  getExpiryReport,
  getLowStockReport,
  getMovementsReport,
  syncOfflineData,
} from './inventory.controller';

const router = Router();

// multer: store CSV in memory
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const writeRoles = [
  UserRole.DATA_ENTRY_CLERK,
  UserRole.DISPENSER,
  UserRole.PHARMACIST_IN_CHARGE,
  UserRole.OWNER,
  UserRole.WHOLESALE_ADMIN,
  UserRole.WHOLESALE_SELLER,
  UserRole.SUPER_ADMIN,
];

// All routes require authentication
router.use(authenticate);

// Drug catalogue
router.get('/drug-master', listDrugMaster);
router.get('/drug-master/search', searchDrugMaster);

// ─── Products ──────────────────────────────────────────────────────────────
router.get('/products', listProducts);
router.post('/products', authorize(writeRoles), createProduct);
router.get('/products/scan/:barcode', scanBarcode);
router.get('/products/:id', getProduct);
router.put('/products/:id', authorize(writeRoles), updateProduct);
router.post('/products/import', authorize(writeRoles), upload.single('file'), importProducts);

// ─── Batches ───────────────────────────────────────────────────────────────
router.get('/batches', listBatches);
router.post('/batches', authorize(writeRoles), createBatch);

// ─── Movements ─────────────────────────────────────────────────────────────
router.get('/movements', listMovements);
router.post('/movements', authorize(writeRoles), recordMovement);
router.post('/movements/checkout', authorize(writeRoles), checkoutCart);
router.post('/checkout', authorize(writeRoles), checkoutCart);

// ─── Reports ───────────────────────────────────────────────────────────────
router.get('/reports/stock-on-hand', getStockOnHand);
router.get('/reports/expiry', getExpiryReport);
router.get('/reports/low-stock', getLowStockReport);
router.get('/reports/movements', getMovementsReport);

// ─── Offline Sync ──────────────────────────────────────────────────────────
router.post('/sync', authorize(writeRoles), syncOfflineData);

export default router;
