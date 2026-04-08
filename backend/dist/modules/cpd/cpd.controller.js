"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadEvidence = exports.getRequirement = exports.getSummary = exports.logActivity = exports.listActivities = void 0;
const cpd_service_1 = require("./cpd.service");
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const service = new cpd_service_1.CpdService();
const logActivitySchema = zod_1.z.object({
    activityType: zod_1.z.nativeEnum(client_1.CpdActivityType),
    title: zod_1.z.string().min(1).max(255),
    activityDate: zod_1.z.string().transform(s => new Date(s)),
    pointsClaimed: zod_1.z.number().int().min(1).max(10),
    renewalYear: zod_1.z.number().int().optional(),
    sourceArticleId: zod_1.z.string().optional(),
});
const listActivities = async (req, res) => {
    try {
        const userId = req.user.id;
        const { renewalYear } = req.query;
        const activities = await service.listActivities(userId, renewalYear ? parseInt(renewalYear) : undefined);
        res.json({ success: true, data: activities });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.listActivities = listActivities;
const logActivity = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = logActivitySchema.parse(req.body);
        const activity = await service.logActivity(userId, data);
        res.status(201).json({ success: true, data: activity });
    }
    catch (err) {
        if (err.name === 'ZodError') {
            res.status(400).json({ success: false, error: err.errors });
            return;
        }
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.logActivity = logActivity;
const getSummary = async (req, res) => {
    try {
        const userId = req.user.id;
        const { renewalYear } = req.query;
        const summary = await service.getSummary(userId, renewalYear ? parseInt(renewalYear) : undefined);
        res.json({ success: true, data: summary });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.getSummary = getSummary;
const getRequirement = async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const req_ = await service.getRequirement(year);
        res.json({ success: true, data: req_ });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.getRequirement = getRequirement;
const uploadEvidence = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const file = req.file;
        if (!file) {
            res.status(400).json({ success: false, error: 'File required' });
            return;
        }
        const activity = await service.uploadEvidence(id, userId, { path: file.path, filename: file.originalname });
        res.json({ success: true, data: activity });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.uploadEvidence = uploadEvidence;
//# sourceMappingURL=cpd.controller.js.map