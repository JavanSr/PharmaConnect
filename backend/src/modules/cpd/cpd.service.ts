import { CpdActivityType } from '@prisma/client';
import prisma from '../../lib/prisma';
import { logger } from '../../lib/logger';

export class CpdService {
  getCurrentRenewalYear(): number {
    const now = new Date();
    return now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
  }

  async listActivities(userId: string, renewalYear?: number) {
    const year = renewalYear || this.getCurrentRenewalYear();
    return prisma.cpdActivity.findMany({
      where: { userId, renewalYear: year },
      include: { sourceArticle: { select: { id: true, title: true, slug: true } } },
      orderBy: { activityDate: 'desc' },
    });
  }

  async logActivity(userId: string, data: {
    activityType: CpdActivityType;
    title: string;
    activityDate: Date;
    pointsClaimed: number;
    renewalYear?: number;
    sourceArticleId?: string;
  }) {
    const renewalYear = data.renewalYear || this.getCurrentRenewalYear();
    const activity = await prisma.cpdActivity.create({
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
    logger.info(`CPD activity logged: ${activity.id} for user ${userId}`);
    return activity;
  }

  async getSummary(userId: string, renewalYear?: number) {
    const year = renewalYear || this.getCurrentRenewalYear();
    const [activities, requirement] = await Promise.all([
      prisma.cpdActivity.findMany({ where: { userId, renewalYear: year } }),
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

  async getRequirement(renewalYear: number) {
    return prisma.cpdRequirement.upsert({
      where: { renewalYear },
      update: {},
      create: { renewalYear, requiredPoints: 20, country: 'TZ' },
    });
  }

  async uploadEvidence(activityId: string, userId: string, file: { path: string; filename: string }) {
    const activity = await prisma.cpdActivity.findFirst({ where: { id: activityId, userId } });
    if (!activity) throw new Error('Activity not found or access denied');
    return prisma.cpdActivity.update({
      where: { id: activityId },
      data: { evidenceFileUrl: file.path },
    });
  }
}
