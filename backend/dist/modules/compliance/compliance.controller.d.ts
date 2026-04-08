import { Request, Response } from 'express';
export declare const listItems: (req: Request, res: Response) => Promise<void>;
export declare const createItem: (req: Request, res: Response) => Promise<void>;
export declare const getItem: (req: Request, res: Response) => Promise<void>;
export declare const updateItem: (req: Request, res: Response) => Promise<void>;
export declare const getItemDocuments: (req: Request, res: Response) => Promise<void>;
export declare const uploadDocument: (req: Request, res: Response) => Promise<void>;
export declare const serveDocument: (req: Request, res: Response) => Promise<void>;
export declare const getHealthScore: (req: Request, res: Response) => Promise<void>;
export declare const listStaffCredentials: (req: Request, res: Response) => Promise<void>;
export declare const createStaffCredential: (req: Request, res: Response) => Promise<void>;
export declare const generateInspectionChecklist: (req: Request, res: Response) => Promise<void>;
export declare const getInspectionChecklist: (req: Request, res: Response) => Promise<void>;
export declare const listInspectionChecklists: (req: Request, res: Response) => Promise<void>;
export declare const updateChecklistItem: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=compliance.controller.d.ts.map