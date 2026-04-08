"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSummary = void 0;
const analytics_service_1 = require("./analytics.service");
const logger_1 = require("../../lib/logger");
const service = new analytics_service_1.AnalyticsService();
const getSummary = async (req, res) => {
    try {
        const pharmacyId = req.user?.pharmacyId;
        if (!pharmacyId) {
            res.status(400).json({
                success: false,
                error: 'Pharmacy context is required for analytics summary',
            });
            return;
        }
        const data = await service.getSummary(pharmacyId);
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('analytics getSummary error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to generate analytics summary',
        });
    }
};
exports.getSummary = getSummary;
//# sourceMappingURL=analytics.controller.js.map