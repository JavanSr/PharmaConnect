"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CpdService = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const logger_1 = require("../../lib/logger");
class CpdService {
    getCurrentRenewalYear() {
        const now = new Date();
        return now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
    }
    async listActivities(userId, renewalYear) {
        const year = renewalYear || this.getCurrentRenewalYear();
        return prisma_1.default.cpdActivity.findMany({
            where: { userId, renewalYear: year },
            include: { sourceArticle: { select: { id: true, title: true, slug: true } } },
            orderBy: { activityDate: 'desc' },
        });
    }
    async logActivity(userId, data) {
        const renewalYear = data.renewalYear || this.getCurrentRenewalYear();
        const activity = await prisma_1.default.cpdActivity.create({
            data: {
                userId,
                activityType: data.activityType,
                title: data.title,
                activityDate: data.activityDate,
                pointsClaimed: data.pointsClaimed,
                renewalYear,
                sourceArticleId: data.sourceArticleId,
            },
            include: { sourceArticle: { select: { id: true, title: true, slug: true } } },
        });
        logger_1.logger.info(`CPD activity logged: ${activity.id} for user ${userId}`);
        return activity;
    }
    async getSummary(userId, renewalYear) {
        const year = renewalYear || this.getCurrentRenewalYear();
        const [activities, requirement] = await Promise.all([
            prisma_1.default.cpdActivity.findMany({ where: { userId, renewalYear: year } }),
            this.getRequirement(year),
        ]);
        const totalPoints = activities.reduce((sum, a) => sum + a.pointsClaimed, 0);
        const requiredPoints = requirement.requiredPoints;
        return {
            renewalYear: year,
            totalPoints,
            requiredPoints,
            percentComplete: Math.min(100, Math.round((totalPoints / requiredPoints) * 100)),
            activities,
            isComplete: totalPoints >= requiredPoints,
        };
    }
    async getRequirement(renewalYear) {
        return prisma_1.default.cpdRequirement.upsert({
            where: { renewalYear },
            update: {},
            create: { renewalYear, requiredPoints: 20, country: 'TZ' },
        });
    }
    async uploadEvidence(activityId, userId, file) {
        const activity = await prisma_1.default.cpdActivity.findFirst({ where: { id: activityId, userId } });
        if (!activity)
            throw new Error('Activity not found or access denied');
        return prisma_1.default.cpdActivity.update({
            where: { id: activityId },
            data: { evidenceFileUrl: file.path },
        });
    }
}
exports.CpdService = CpdService;
//# sourceMappingURL=cpd.service.js.map