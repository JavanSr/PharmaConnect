import { Request, Response, NextFunction } from 'express';
/**
 * Middleware that logs write operations to the AuditLog table.
 * Runs asynchronously and does not block the response.
 * Logs: userId, action (METHOD:path), resource (first segment after /api/v1/),
 * resourceId (second segment), ipAddress.
 */
export declare const auditLog: (req: Request, res: Response, next: NextFunction) => void;
export default auditLog;
//# sourceMappingURL=auditLog.d.ts.map