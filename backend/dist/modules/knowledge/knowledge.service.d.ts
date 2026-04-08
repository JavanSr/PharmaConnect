import { ArticleStatus } from '@prisma/client';
export declare class KnowledgeService {
    listArticles(filters: {
        category?: string;
        status?: ArticleStatus;
        tag?: string;
        search?: string;
        adminView?: boolean;
    }, pagination: {
        page: number;
        limit: number;
    }): Promise<{
        data: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    private enforceSponsored;
    getArticle(slug: string): Promise<{
        author: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ArticleStatus;
        category: string;
        body: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        slug: string;
        tags: string[];
        isSponsored: boolean;
        sponsorName: string | null;
        sponsorDisplayDate: Date | null;
        featuredImage: string | null;
        readingTimeMinutes: number;
        authorId: string;
        publishedAt: Date | null;
        scheduledFor: Date | null;
        viewCount: number;
    }>;
    createArticle(authorId: string, data: {
        title: string;
        slug: string;
        body: any;
        category: string;
        tags?: string[];
        status?: ArticleStatus;
        isSponsored?: boolean;
        sponsorName?: string;
        sponsorDisplayDate?: Date;
        featuredImage?: string;
        scheduledFor?: Date;
    }): Promise<{
        author: {
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ArticleStatus;
        category: string;
        body: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        slug: string;
        tags: string[];
        isSponsored: boolean;
        sponsorName: string | null;
        sponsorDisplayDate: Date | null;
        featuredImage: string | null;
        readingTimeMinutes: number;
        authorId: string;
        publishedAt: Date | null;
        scheduledFor: Date | null;
        viewCount: number;
    }>;
    updateArticle(id: string, data: Partial<{
        title: string;
        slug: string;
        body: any;
        category: string;
        tags: string[];
        status: ArticleStatus;
        isSponsored: boolean;
        sponsorName: string;
        featuredImage: string;
        scheduledFor: Date;
    }>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ArticleStatus;
        category: string;
        body: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        slug: string;
        tags: string[];
        isSponsored: boolean;
        sponsorName: string | null;
        sponsorDisplayDate: Date | null;
        featuredImage: string | null;
        readingTimeMinutes: number;
        authorId: string;
        publishedAt: Date | null;
        scheduledFor: Date | null;
        viewCount: number;
    }>;
    deleteArticle(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ArticleStatus;
        category: string;
        body: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        slug: string;
        tags: string[];
        isSponsored: boolean;
        sponsorName: string | null;
        sponsorDisplayDate: Date | null;
        featuredImage: string | null;
        readingTimeMinutes: number;
        authorId: string;
        publishedAt: Date | null;
        scheduledFor: Date | null;
        viewCount: number;
    }>;
    subscribe(email: string): Promise<{
        id: string;
        email: string;
        isActive: boolean;
        unsubscribeToken: string;
        subscribedAt: Date;
    }>;
    unsubscribe(token: string): Promise<{
        id: string;
        email: string;
        isActive: boolean;
        unsubscribeToken: string;
        subscribedAt: Date;
    }>;
    sendWeeklyDigest(): Promise<{
        sent: number;
        articlesCount?: undefined;
    } | {
        sent: number;
        articlesCount: number;
    }>;
}
//# sourceMappingURL=knowledge.service.d.ts.map