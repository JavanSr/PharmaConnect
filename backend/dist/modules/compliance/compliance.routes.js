"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
const compliance_controller_1 = require("./compliance.controller");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: 'uploads/compliance',
        filename: (_req, file, cb) => {
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(null, `${unique}${path_1.default.extname(file.originalname)}`);
        },
    }),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});
const writeRoles = [
    client_1.UserRole.PHARMACIST_IN_CHARGE,
    client_1.UserRole.OWNER,
    client_1.UserRole.SUPER_ADMIN,
];
router.use(authenticate_1.authenticate);
// ─── Compliance Items ──────────────────────────────────────────────────────
router.get('/items', compliance_controller_1.listItems);
router.post('/items', (0, authorize_1.authorize)(writeRoles), compliance_controller_1.createItem);
router.get('/items/:id', compliance_controller_1.getItem);
router.put('/items/:id', (0, authorize_1.authorize)(writeRoles), compliance_controller_1.updateItem);
// ─── Documents ─────────────────────────────────────────────────────────────
router.get('/items/:id/documents', compliance_controller_1.getItemDocuments);
router.post('/items/:id/documents', (0, authorize_1.authorize)(writeRoles), upload.single('document'), compliance_controller_1.uploadDocument);
router.get('/items/:id/documents/:docId', compliance_controller_1.serveDocument);
// ─── Health Score ──────────────────────────────────────────────────────────
router.get('/health-score', compliance_controller_1.getHealthScore);
// ─── Staff Credentials ─────────────────────────────────────────────────────
router.get('/staff-credentials', compliance_controller_1.listStaffCredentials);
router.post('/staff-credentials', (0, authorize_1.authorize)(writeRoles), compliance_controller_1.createStaffCredential);
// ─── Inspection Checklist ──────────────────────────────────────────────────
router.get('/inspection-checklists', compliance_controller_1.listInspectionChecklists);
router.post('/inspection-checklists', (0, authorize_1.authorize)(writeRoles), compliance_controller_1.generateInspectionChecklist);
router.get('/inspection-checklists/:id', compliance_controller_1.getInspectionChecklist);
router.put('/inspection-checklists/:id/items', (0, authorize_1.authorize)(writeRoles), compliance_controller_1.updateChecklistItem);
exports.default = router;
//# sourceMappingURL=compliance.routes.js.map