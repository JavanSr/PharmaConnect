"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
const patients_controller_1 = require("./patients.controller");
const router = (0, express_1.Router)();
const dispenserAndAbove = [
    client_1.UserRole.DISPENSER,
    client_1.UserRole.PHARMACIST_IN_CHARGE,
    client_1.UserRole.OWNER,
    client_1.UserRole.SUPER_ADMIN,
];
const picAndAbove = [
    client_1.UserRole.PHARMACIST_IN_CHARGE,
    client_1.UserRole.OWNER,
    client_1.UserRole.SUPER_ADMIN,
];
router.use(authenticate_1.authenticate);
// ICD-10 (before /:id routes to avoid conflict)
router.get('/icd10/search', patients_controller_1.searchIcd10);
router.get('/icd10/common', patients_controller_1.getCommonIcd10);
// Interaction check
router.get('/check-interaction', (0, authorize_1.authorize)(dispenserAndAbove), patients_controller_1.checkInteraction);
// Walk-in dispensing
router.post('/dispense/walk-in', (0, authorize_1.authorize)(dispenserAndAbove), patients_controller_1.dispenseWalkIn);
// Patient CRUD
router.post('/', (0, authorize_1.authorize)(dispenserAndAbove), patients_controller_1.createPatient);
router.get('/:id', (0, authorize_1.authorize)(dispenserAndAbove), patients_controller_1.getPatient);
router.put('/:id/flags', (0, authorize_1.authorize)(dispenserAndAbove), patients_controller_1.updatePatientFlags);
router.get('/:id/history', (0, authorize_1.authorize)(dispenserAndAbove), patients_controller_1.getPatientHistory);
// Dispensing events
router.post('/:id/dispensing', (0, authorize_1.authorize)(dispenserAndAbove), patients_controller_1.createDispensingEvent);
router.post('/:id/dispensing/:eventId/void', (0, authorize_1.authorize)(picAndAbove), patients_controller_1.voidDispensingEvent);
exports.default = router;
//# sourceMappingURL=patients.routes.js.map