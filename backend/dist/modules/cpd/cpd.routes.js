"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
const cpd_controller_1 = require("./cpd.controller");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ dest: path_1.default.join(process.cwd(), 'uploads', 'cpd') });
router.use(authenticate_1.authenticate);
router.use((0, authorize_1.authorize)(['PHARMACIST_IN_CHARGE', 'DISPENSER', 'WHOLESALE_SELLER', 'SUPER_ADMIN']));
router.get('/activities', cpd_controller_1.listActivities);
router.post('/activities', cpd_controller_1.logActivity);
router.get('/summary', cpd_controller_1.getSummary);
router.get('/requirement', cpd_controller_1.getRequirement);
router.post('/activities/:id/evidence', upload.single('file'), cpd_controller_1.uploadEvidence);
exports.default = router;
//# sourceMappingURL=cpd.routes.js.map