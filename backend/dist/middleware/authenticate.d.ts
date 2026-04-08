import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
export interface AuthenticatedUser {
    id: string;
    email: string;
    role: UserRole;
    pharmacyId: string | null;
}
declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
        }
    }
}
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => void;
export default authenticate;
//# sourceMappingURL=authenticate.d.ts.map