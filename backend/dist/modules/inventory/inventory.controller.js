"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncOfflineData = exports.getMovementsReport = exports.getLowStockReport = exports.getExpiryReport = exports.getStockOnHand = exports.checkoutCart = exports.recordMovement = exports.listMovements = exports.createBatch = exports.listBatches = exports.importProducts = exports.scanBarcode = exports.updateProduct = exports.getProduct = exports.createProduct = exports.listProducts = exports.searchDrugMaster = exports.listDrugMaster = void 0;
const client_1 = require("@prisma/client");
const inventory_service_1 = __importStar(require("./inventory.service"));
const logger_1 = require("../../lib/logger");
const service = new inventory_service_1.default();
const listDrugMaster = async (req, res) => {
    try {
        const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(String(req.query.limit || '25'), 10) || 25, 1), 100);
        const storageCondition = req.query.storageCondition
            ? String(req.query.storageCondition).toUpperCase()
            : undefined;
        if (storageCondition &&
            !Object.values(client_1.StorageCondition).includes(storageCondition)) {
            res.status(400).json({ success: false, error: 'Invalid storageCondition' });
            return;
        }
        const result = await service.listDrugMaster({
            search: req.query.q ? String(req.query.q) : undefined,
            storageCondition: storageCondition,
            essential: req.query.essential === undefined
                ? undefined
                : String(req.query.essential).toLowerCase() === 'true',
        }, { page, limit });
        res.json({ success: true, ...result });
    }
    catch (err) {
        logger_1.logger.error('listDrugMaster error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch drug catalogue' });
    }
};
exports.listDrugMaster = listDrugMaster;
const searchDrugMaster = async (req, res) => {
    try {
        const q = String(req.query.q || '');
        const results = await service.searchDrugMaster(q);
        res.json({ success: true, data: results });
    }
    catch (err) {
        logger_1.logger.error('searchDrugMaster error:', err);
        res.status(500).json({ success: false, error: 'Search failed' });
    }
};
exports.searchDrugMaster = searchDrugMaster;
// ─── Products ──────────────────────────────────────────────────────────────
const listProducts = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const page = parseInt(String(req.query.page || '1'), 10);
        const limit = Math.min(parseInt(String(req.query.limit || '20'), 10), 100);
        const filters = {
            lowStock: req.query.lowStock === 'true',
            nearExpiry: req.query.nearExpiry === 'true',
            category: req.query.category ? String(req.query.category) : undefined,
            search: req.query.search ? String(req.query.search) : undefined,
        };
        const result = await service.listProducts(pharmacyId, filters, { page, limit });
        res.json({ success: true, ...result });
    }
    catch (err) {
        logger_1.logger.error('listProducts error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch products' });
    }
};
exports.listProducts = listProducts;
const createProduct = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const product = await service.createProduct(pharmacyId, req.body);
        res.status(201).json({ success: true, data: product });
    }
    catch (err) {
        logger_1.logger.error('createProduct error:', err);
        res.status(400).json({ success: false, error: String(err) });
    }
};
exports.createProduct = createProduct;
const getProduct = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const { id } = req.params;
        const product = await service.getProductById(id, pharmacyId);
        if (!product) {
            res.status(404).json({ success: false, error: 'Product not found' });
            return;
        }
        res.json({ success: true, data: product });
    }
    catch (err) {
        logger_1.logger.error('getProduct error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch product' });
    }
};
exports.getProduct = getProduct;
const updateProduct = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const { id } = req.params;
        const product = await service.updateProduct(id, pharmacyId, req.body);
        res.json({ success: true, data: product });
    }
    catch (err) {
        logger_1.logger.error('updateProduct error:', err);
        res.status(400).json({ success: false, error: String(err) });
    }
};
exports.updateProduct = updateProduct;
const scanBarcode = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const { barcode } = req.params;
        const product = await service.getProductByBarcode(barcode, pharmacyId);
        if (!product) {
            res.status(404).json({ success: false, error: 'Product not found for this barcode' });
            return;
        }
        res.json({ success: true, data: product });
    }
    catch (err) {
        logger_1.logger.error('scanBarcode error:', err);
        res.status(500).json({ success: false, error: 'Barcode lookup failed' });
    }
};
exports.scanBarcode = scanBarcode;
const importProducts = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        if (!req.file) {
            res.status(400).json({ success: false, error: 'No CSV file uploaded' });
            return;
        }
        const result = await service.importProductsCsv(pharmacyId, req.file.buffer);
        res.status(201).json({ success: true, data: result });
    }
    catch (err) {
        logger_1.logger.error('importProducts error:', err);
        res.status(400).json({ success: false, error: String(err) });
    }
};
exports.importProducts = importProducts;
// ─── Batches ───────────────────────────────────────────────────────────────
const listBatches = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const filters = {
            expiryFrom: req.query.expiryFrom ? new Date(String(req.query.expiryFrom)) : undefined,
            expiryTo: req.query.expiryTo ? new Date(String(req.query.expiryTo)) : undefined,
        };
        const batches = await service.listBatches(pharmacyId, filters);
        res.json({ success: true, data: batches });
    }
    catch (err) {
        logger_1.logger.error('listBatches error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch batches' });
    }
};
exports.listBatches = listBatches;
const createBatch = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const userId = req.user.id;
        const { productId, batchNumber, expiryDate, quantityReceived, purchasePrice, supplierId, } = req.body;
        const quantityRemaining = req.body.quantityRemaining ?? quantityReceived;
        if (!productId || !batchNumber || !expiryDate || quantityRemaining === undefined || purchasePrice === undefined) {
            res.status(400).json({
                success: false,
                error: 'productId, batchNumber, expiryDate, quantityRemaining, and purchasePrice are required',
            });
            return;
        }
        const batch = await service.createBatch(pharmacyId, {
            productId,
            batchNumber,
            expiryDate: new Date(expiryDate),
            quantityRemaining: parseInt(quantityRemaining, 10),
            purchasePrice: parseFloat(purchasePrice),
            supplierId: supplierId || undefined,
            userId,
        });
        res.status(201).json({ success: true, data: batch });
    }
    catch (err) {
        logger_1.logger.error('createBatch error:', err);
        res.status(400).json({ success: false, error: String(err) });
    }
};
exports.createBatch = createBatch;
// ─── Movements ─────────────────────────────────────────────────────────────
const listMovements = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const page = parseInt(String(req.query.page || '1'), 10);
        const limit = Math.min(parseInt(String(req.query.limit || '20'), 10), 100);
        const filters = {
            productId: req.query.productId ? String(req.query.productId) : undefined,
            type: req.query.type ? String(req.query.type) : undefined,
            dateFrom: req.query.dateFrom ? new Date(String(req.query.dateFrom)) : undefined,
            dateTo: req.query.dateTo ? new Date(String(req.query.dateTo)) : undefined,
        };
        const result = await service.listMovements(pharmacyId, filters, { page, limit });
        res.json({ success: true, ...result });
    }
    catch (err) {
        logger_1.logger.error('listMovements error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch movements' });
    }
};
exports.listMovements = listMovements;
const recordMovement = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const userId = req.user.id;
        const { productId, batchId, type, quantity, reason, notes, referenceNumber } = req.body;
        if (!productId || !type || quantity === undefined) {
            res.status(400).json({
                success: false,
                error: 'productId, type, and quantity are required',
            });
            return;
        }
        // TOR §Module 2: adjustments require reason + minimum 10-character note
        const adjustmentTypes = ['ADJUSTED', 'DAMAGED', 'EXPIRED_REMOVED', 'DONATED', 'TRANSFERRED'];
        if (adjustmentTypes.includes(type)) {
            if (!reason || String(reason).trim().length < 1) {
                res.status(400).json({ success: false, error: 'A reason is required for stock adjustments.' });
                return;
            }
            if (!notes || String(notes).trim().length < 10) {
                res.status(400).json({ success: false, error: 'Adjustment notes must be at least 10 characters.' });
                return;
            }
        }
        const movement = await service.recordMovement(pharmacyId, {
            productId,
            batchId: batchId || undefined,
            type: type,
            quantity: parseInt(quantity, 10),
            reason: reason || undefined,
            notes: notes || undefined,
            referenceNumber: referenceNumber || undefined,
            userId,
        });
        res.status(201).json({ success: true, data: movement });
    }
    catch (err) {
        logger_1.logger.error('recordMovement error:', err);
        res.status(400).json({ success: false, error: String(err) });
    }
};
exports.recordMovement = recordMovement;
// ─── Reports ───────────────────────────────────────────────────────────────
const checkoutCart = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const userId = req.user.id;
        const { items, paymentMethod, paymentRef, patientId } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            res.status(400).json({ success: false, error: 'At least one cart item is required' });
            return;
        }
        if (paymentMethod &&
            !Object.values(client_1.PaymentMethod).includes(String(paymentMethod))) {
            res.status(400).json({ success: false, error: 'Invalid payment method' });
            return;
        }
        const checkout = await service.checkoutCart(pharmacyId, {
            items: items.map((item) => ({
                productId: String(item.productId || ''),
                quantity: parseInt(String(item.quantity), 10),
                dose: item.dose ? String(item.dose) : undefined,
                icdCode: item.icdCode ? String(item.icdCode) : undefined,
                notes: item.notes ? String(item.notes) : undefined,
                unitPrice: item.unitPrice === undefined ? undefined : Number(item.unitPrice),
            })),
            paymentMethod: paymentMethod ? String(paymentMethod) : undefined,
            paymentRef: paymentRef ? String(paymentRef) : undefined,
            patientId: patientId ? String(patientId) : undefined,
            userId,
        });
        res.status(201).json({ success: true, data: checkout });
    }
    catch (err) {
        logger_1.logger.error('checkoutCart error:', err);
        res.status(400).json({ success: false, error: String(err) });
    }
};
exports.checkoutCart = checkoutCart;
const getStockOnHand = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const data = await service.getStockOnHand(pharmacyId);
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('getStockOnHand error:', err);
        res.status(500).json({ success: false, error: 'Failed to generate stock report' });
    }
};
exports.getStockOnHand = getStockOnHand;
const getExpiryReport = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const daysThreshold = req.query.days
            ? Number(String(req.query.days))
            : inventory_service_1.DEFAULT_EXPIRY_REPORT_DAYS;
        if (!(0, inventory_service_1.isExpiryReportDays)(daysThreshold)) {
            res.status(400).json({
                success: false,
                error: `days must be one of ${inventory_service_1.EXPIRY_REPORT_DAY_THRESHOLDS.join(', ')}`,
            });
            return;
        }
        const data = await service.getExpiryReport(pharmacyId, daysThreshold);
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('getExpiryReport error:', err);
        res.status(500).json({ success: false, error: 'Failed to generate expiry report' });
    }
};
exports.getExpiryReport = getExpiryReport;
const getLowStockReport = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const data = await service.getLowStockReport(pharmacyId);
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('getLowStockReport error:', err);
        res.status(500).json({ success: false, error: 'Failed to generate low-stock report' });
    }
};
exports.getLowStockReport = getLowStockReport;
const getMovementsReport = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        if (!req.query.dateFrom || !req.query.dateTo) {
            res.status(400).json({ success: false, error: 'dateFrom and dateTo are required' });
            return;
        }
        const data = await service.getMovementsReport(pharmacyId, new Date(String(req.query.dateFrom)), new Date(String(req.query.dateTo)));
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('getMovementsReport error:', err);
        res.status(500).json({ success: false, error: 'Failed to generate movements report' });
    }
};
exports.getMovementsReport = getMovementsReport;
// ─── Sync ──────────────────────────────────────────────────────────────────
const syncOfflineData = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const { products, batches, movements } = req.body;
        const result = await service.syncOfflineData(pharmacyId, { products, batches, movements });
        res.json({ success: true, data: result });
    }
    catch (err) {
        logger_1.logger.error('syncOfflineData error:', err);
        res.status(500).json({ success: false, error: 'Sync failed' });
    }
};
exports.syncOfflineData = syncOfflineData;
//# sourceMappingURL=inventory.controller.js.map