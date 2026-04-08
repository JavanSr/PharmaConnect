import { Request, Response } from 'express';
export declare const createPatient: (req: Request, res: Response) => Promise<void>;
export declare const getPatient: (req: Request, res: Response) => Promise<void>;
export declare const updatePatientFlags: (req: Request, res: Response) => Promise<void>;
export declare const getPatientHistory: (req: Request, res: Response) => Promise<void>;
export declare const createDispensingEvent: (req: Request, res: Response) => Promise<void>;
export declare const dispenseWalkIn: (req: Request, res: Response) => Promise<void>;
export declare const voidDispensingEvent: (req: Request, res: Response) => Promise<void>;
export declare const checkInteraction: (req: Request, res: Response) => Promise<void>;
export declare const searchIcd10: (req: Request, res: Response) => Promise<void>;
export declare const getCommonIcd10: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=patients.controller.d.ts.map