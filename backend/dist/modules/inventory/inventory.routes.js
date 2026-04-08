"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const multer_1 = __importDefault(require("multer"));
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
const inventory_controller_1 = require("./inventory.controller");
const router = (0, express_1.Router)();
// multer: store CSV in memory
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const writeRoles = [
    client_1.UserRole.DATA_ENTRY_CLERK,
    client_1.UserRole.DISPENSER,
    client_1.UserRole.PHARMACIST_IN_CHARGE,
    client_1.UserRole.OWNER,
    client_1.UserRole.WHOLESALE_ADMIN,
    client_1.UserRole.WHOLESALE_SELLER,
    client_1.UserRole.SUPER_ADMIN,
];
// All routes require authentication
router.use(authenticate_1.authenticate);
// Drug catalogue
router.get('/drug-master', inventory_controller_1.listDrugMaster);
router.get('/drug-master/search', inventory_controller_1.searchDrugMaster);
// ─── Products ──────────────────────────────────────────────────────────────
router.get('/products', inventory_controller_1.listProducts);
router.post('/products', (0, authorize_1.authorize)(writeRoles), inventory_controller_1.createProduct);
router.get('/products/scan/:barcode', inventory_controller_1.scanBarcode);
router.get('/products/:id', inventory_controller_1.getProduct);
router.put('/products/:id', (0, authorize_1.authorize)(writeRoles), inventory_controller_1.updateProduct);
router.post('/products/import', (0, authorize_1.authorize)(writeRoles), upload.single('file'), inventory_controller_1.importProducts);
// ─── Batches ───────────────────────────────────────────────────────────────
router.get('/batches', inventory_controller_1.listBatches);
router.post('/batches', (0, authorize_1.authorize)(writeRoles), inventory_controller_1.createBatch);
// ─── Movements ─────────────────────────────────────────────────────────────
router.get('/movements', inventory_controller_1.listMovements);
router.post('/movements', (0, authorize_1.authorize)(writeRoles), inventory_controller_1.recordMovement);
router.post('/movements/checkout', (0, authorize_1.authorize)(writeRoles), inventory_controller_1.checkoutCart);
router.post('/checkout', (0, authorize_1.authorize)(writeRoles), inventory_controller_1.checkoutCart);
// ─── Reports ───────────────────────────────────────────────────────────────
router.get('/reports/stock-on-hand', inventory_controller_1.getStockOnHand);
router.get('/reports/expiry', inventory_controller_1.getExpiryReport);
router.get('/reports/low-stock', inventory_controller_1.getLowStockReport);
router.get('/reports/movements', inventory_controller_1.getMovementsReport);
// ─── Offline Sync ──────────────────────────────────────────────────────────
router.post('/sync', (0, authorize_1.authorize)(writeRoles), inventory_controller_1.syncOfflineData);
exports.default = router;
//# sourceMappingURL=inventory.routes.js.map