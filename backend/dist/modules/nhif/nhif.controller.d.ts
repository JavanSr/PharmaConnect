import { Request, Response } from 'express';
export declare const verifyMember: (req: Request, res: Response) => Promise<void>;
export declare const createClaim: (req: Request, res: Response) => Promise<void>;
export declare const listClaims: (req: Request, res: Response) => Promise<void>;
export declare const getClaim: (req: Request, res: Response) => Promise<void>;
export declare const updateClaim: (req: Request, res: Response) => Promise<void>;
export declare const scrubClaim: (req: Request, res: Response) => Promise<void>;
export declare const submitBatch: (req: Request, res: Response) => Promise<void>;
export declare const getBatchStatus: (req: Request, res: Response) => Promise<void>;
export declare const generateVfdReceipt: (req: Request, res: Response) => Promise<void>;
export declare const getAnalytics: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=nhif.controller.d.ts.map