import { CpdActivityType } from '@prisma/client';
export declare class CpdService {
    getCurrentRenewalYear(): number;
    listActivities(userId: string, renewalYear?: number): Promise<({
        sourceArticle: {
            id: string;
            title: string;
            slug: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        activityType: import(".prisma/client").$Enums.CpdActivityType;
        title: string;
        activityDate: Date;
        pointsClaimed: number;
        evidenceFileUrl: string | null;
        renewalYear: number;
        sourceArticleId: string | null;
    })[]>;
    logActivity(userId: string, data: {
        activityType: CpdActivityType;
        title: string;
        activityDate: Date;
        pointsClaimed: number;
        renewalYear?: number;
        sourceArticleId?: string;
    }): Promise<{
        sourceArticle: {
            id: string;
            title: string;
            slug: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        activityType: import(".prisma/client").$Enums.CpdActivityType;
        title: string;
        activityDate: Date;
        pointsClaimed: number;
        evidenceFileUrl: string | null;
        renewalYear: number;
        sourceArticleId: string | null;
    }>;
    getSummary(userId: string, renewalYear?: number): Promise<{
        renewalYear: number;
        totalPoints: number;
        requiredPoints: number;
        percentComplete: number;
        activities: {
            id: string;
            createdAt: Date;
            userId: string;
            activityType: import(".prisma/client").$Enums.CpdActivityType;
            title: string;
            activityDate: Date;
            pointsClaimed: number;
            evidenceFileUrl: string | null;
            renewalYear: number;
            sourceArticleId: string | null;
        }[];
        isComplete: boolean;
    }>;
    getRequirement(renewalYear: number): Promise<{
        id: string;
        renewalYear: number;
        requiredPoints: number;
        country: string;
    }>;
    uploadEvidence(activityId: string, userId: string, file: {
        path: string;
        filename: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        activityType: import(".prisma/client").$Enums.CpdActivityType;
        title: string;
        activityDate: Date;
        pointsClaimed: number;
        evidenceFileUrl: string | null;
        renewalYear: number;
        sourceArticleId: string | null;
    }>;
}
//# sourceMappingURL=cpd.service.d.ts.map