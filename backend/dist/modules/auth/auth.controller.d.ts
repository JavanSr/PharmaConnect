import { Request, Response } from 'express';
export declare const register: (req: Request, res: Response) => Promise<void>;
export declare const login: (req: Request, res: Response) => Promise<void>;
export declare const refresh: (req: Request, res: Response) => Promise<void>;
export declare const logout: (req: Request, res: Response) => Promise<void>;
export declare const getMe: (req: Request, res: Response) => Promise<void>;
export declare const listPharmacyUsers: (req: Request, res: Response) => Promise<void>;
export declare const inviteUser: (req: Request, res: Response) => Promise<void>;
export declare const changeUserRole: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map