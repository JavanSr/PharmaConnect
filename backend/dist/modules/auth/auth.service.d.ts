import { UserRole, PharmacyType, SubscriptionTier } from '@prisma/client';
interface RegisterData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    pharmacyName: string;
    licenceNumber: string;
    address: string;
    region: string;
    pharmacyType: PharmacyType;
    subscriptionTier?: SubscriptionTier;
    pcRegistrationNumber?: string;
}
interface LoginResult {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: UserRole;
        pharmacyId: string | null;
    };
}
export declare class AuthService {
    /**
     * Register a new pharmacy and its owner user.
     */
    register(data: RegisterData): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
            pharmacyId: string | null;
        };
        pharmacy: {
            id: string;
            name: string;
            licenceNumber: string;
            pharmacyType: import(".prisma/client").$Enums.PharmacyType;
            subscriptionTier: import(".prisma/client").$Enums.SubscriptionTier;
        };
    }>;
    /**
     * Authenticate a user and issue access + refresh tokens.
     * Enforces max 2 concurrent sessions.
     */
    login(email: string, password: string, deviceInfo?: string, ipAddress?: string): Promise<LoginResult>;
    /**
     * Rotate refresh token: validate, revoke old, issue new pair.
     */
    refreshToken(token: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    /**
     * Revoke a refresh token (logout).
     */
    logout(refreshToken: string): Promise<void>;
    /**
     * Invite a new user to a pharmacy with a temporary password.
     */
    inviteUser(pharmacyId: string, email: string, role: UserRole, firstName: string, lastName: string): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: import(".prisma/client").$Enums.UserRole;
        pharmacyId: string | null;
    }>;
    /**
     * List all users belonging to a pharmacy.
     */
    listPharmacyUsers(pharmacyId: string): Promise<{
        id: string;
        createdAt: Date;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        firstName: string;
        lastName: string;
        isActive: boolean;
    }[]>;
    /**
     * Change the role of a user.
     */
    changeUserRole(userId: string, newRole: UserRole): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: import(".prisma/client").$Enums.UserRole;
        pharmacyId: string | null;
    }>;
    /**
     * Get the current authenticated user with their pharmacy.
     */
    getCurrentUser(userId: string): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: import(".prisma/client").$Enums.UserRole;
        pharmacyId: string | null;
        pcRegistrationNumber: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        pharmacy: {
            id: string;
            name: string;
            licenceNumber: string;
            address: string;
            region: string;
            pharmacyType: import(".prisma/client").$Enums.PharmacyType;
            subscriptionTier: import(".prisma/client").$Enums.SubscriptionTier;
        } | null;
    }>;
}
export default AuthService;
//# sourceMappingURL=auth.service.d.ts.map