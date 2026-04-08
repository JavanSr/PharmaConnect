"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
const nhif_controller_1 = require("./nhif.controller");
const router = (0, express_1.Router)();
router.use(authenticate_1.authenticate);
// Member verification
router.post('/verify', nhif_controller_1.verifyMember);
// Claims
router.post('/claims', (0, authorize_1.authorize)(['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER']), nhif_controller_1.createClaim);
router.get('/claims', nhif_controller_1.listClaims);
router.get('/claims/:id', nhif_controller_1.getClaim);
router.put('/claims/:id', (0, authorize_1.authorize)(['OWNER', 'PHARMACIST_IN_CHARGE']), nhif_controller_1.updateClaim);
router.post('/claims/:id/scrub', (0, authorize_1.authorize)(['OWNER', 'PHARMACIST_IN_CHARGE']), nhif_controller_1.scrubClaim);
// Batches
router.post('/batches', (0, authorize_1.authorize)(['OWNER', 'PHARMACIST_IN_CHARGE']), nhif_controller_1.submitBatch);
router.get('/batches/:ref/status', nhif_controller_1.getBatchStatus);
// VFD
router.post('/vfd/receipt', (0, authorize_1.authorize)(['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER']), nhif_controller_1.generateVfdReceipt);
// Analytics
router.get('/analytics/success-rate', nhif_controller_1.getAnalytics);
exports.default = router;
//# sourceMappingURL=nhif.routes.js.map