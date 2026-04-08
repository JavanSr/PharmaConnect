"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeUserRole = exports.inviteUser = exports.listPharmacyUsers = exports.getMe = exports.logout = exports.refresh = exports.login = exports.register = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
// UserRole now includes WHOLESALE_SELLER after migration
const auth_service_1 = require("./auth.service");
const logger_1 = require("../../lib/logger");
const authService = new auth_service_1.AuthService();
// ─── Validation Schemas ────────────────────────────────────────────────────────
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    firstName: zod_1.z.string().min(1, 'First name is required'),
    lastName: zod_1.z.string().min(1, 'Last name is required'),
    pharmacyName: zod_1.z.string().min(1, 'Pharmacy name is required'),
    licenceNumber: zod_1.z.string().min(1, 'Licence number is required'),
    address: zod_1.z.string().min(1, 'Address is required'),
    region: zod_1.z.string().min(1, 'Region is required'),
    pharmacyType: zod_1.z.nativeEnum(client_1.PharmacyType),
    subscriptionTier: zod_1.z.nativeEnum(client_1.SubscriptionTier).optional(),
    pcRegistrationNumber: zod_1.z.string().optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
    deviceInfo: zod_1.z.string().optional(),
});
const refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
const logoutSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
const inviteUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    role: zod_1.z.nativeEnum(client_1.UserRole),
    firstName: zod_1.z.string().min(1, 'First name is required'),
    lastName: zod_1.z.string().min(1, 'Last name is required'),
});
const changeRoleSchema = zod_1.z.object({
    role: zod_1.z.nativeEnum(client_1.UserRole),
});
// ─── Controllers ──────────────────────────────────────────────────────────────
const register = async (req, res) => {
    try {
        const validation = registerSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validation.error.flatten().fieldErrors,
            });
            return;
        }
        const result = await authService.register(validation.data);
        res.status(201).json({
            success: true,
            message: 'Registration successful. Please log in.',
            data: result,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        logger_1.logger.error('Register controller error:', err);
        if (message.includes('already exists')) {
            res.status(409).json({ success: false, error: message });
            return;
        }
        res.status(500).json({ success: false, error: message });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const validation = loginSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validation.error.flatten().fieldErrors,
            });
            return;
        }
        const { email, password, deviceInfo } = validation.data;
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
        const result = await authService.login(email, password, deviceInfo, ipAddress);
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: result,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed';
        logger_1.logger.error('Login controller error:', err);
        if (message.includes('Invalid email or password')) {
            res.status(401).json({ success: false, error: message });
            return;
        }
        res.status(500).json({ success: false, error: message });
    }
};
exports.login = login;
const refresh = async (req, res) => {
    try {
        const validation = refreshSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validation.error.flatten().fieldErrors,
            });
            return;
        }
        const tokens = await authService.refreshToken(validation.data.refreshToken);
        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: tokens,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Token refresh failed';
        logger_1.logger.error('Refresh token controller error:', err);
        if (message.includes('Invalid') ||
            message.includes('expired') ||
            message.includes('revoked')) {
            res.status(401).json({ success: false, error: message });
            return;
        }
        res.status(500).json({ success: false, error: message });
    }
};
exports.refresh = refresh;
const logout = async (req, res) => {
    try {
        const validation = logoutSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validation.error.flatten().fieldErrors,
            });
            return;
        }
        await authService.logout(validation.data.refreshToken);
        res.status(200).json({
            success: true,
            message: 'Logged out successfully',
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Logout failed';
        logger_1.logger.error('Logout controller error:', err);
        res.status(500).json({ success: false, error: message });
    }
};
exports.logout = logout;
const getMe = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const user = await authService.getCurrentUser(req.user.id);
        res.status(200).json({
            success: true,
            data: user,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to retrieve user';
        logger_1.logger.error('GetMe controller error:', err);
        if (message.includes('not found')) {
            res.status(404).json({ success: false, error: message });
            return;
        }
        res.status(500).json({ success: false, error: message });
    }
};
exports.getMe = getMe;
const listPharmacyUsers = async (req, res) => {
    try {
        if (!req.user?.pharmacyId) {
            res.status(403).json({ success: false, error: 'No pharmacy associated with your account' });
            return;
        }
        const users = await authService.listPharmacyUsers(req.user.pharmacyId);
        res.status(200).json({ success: true, data: users });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to list users';
        logger_1.logger.error('ListPharmacyUsers error:', err);
        res.status(500).json({ success: false, error: message });
    }
};
exports.listPharmacyUsers = listPharmacyUsers;
const inviteUser = async (req, res) => {
    try {
        if (!req.user?.pharmacyId) {
            res.status(403).json({
                success: false,
                error: 'You must belong to a pharmacy to invite users.',
            });
            return;
        }
        const validation = inviteUserSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validation.error.flatten().fieldErrors,
            });
            return;
        }
        const { email, role, firstName, lastName } = validation.data;
        const result = await authService.inviteUser(req.user.pharmacyId, email, role, firstName, lastName);
        res.status(201).json({
            success: true,
            message: 'User invited successfully. They will receive an email with login instructions.',
            data: result,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to invite user';
        logger_1.logger.error('InviteUser controller error:', err);
        if (message.includes('already exists')) {
            res.status(409).json({ success: false, error: message });
            return;
        }
        if (message.includes('not found')) {
            res.status(404).json({ success: false, error: message });
            return;
        }
        res.status(500).json({ success: false, error: message });
    }
};
exports.inviteUser = inviteUser;
const changeUserRole = async (req, res) => {
    try {
        const { id: userId } = req.params;
        if (!userId) {
            res.status(400).json({ success: false, error: 'User ID is required' });
            return;
        }
        const validation = changeRoleSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validation.error.flatten().fieldErrors,
            });
            return;
        }
        const result = await authService.changeUserRole(userId, validation.data.role);
        res.status(200).json({
            success: true,
            message: 'User role updated successfully',
            data: result,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to change role';
        logger_1.logger.error('ChangeUserRole controller error:', err);
        if (message.includes('not found')) {
            res.status(404).json({ success: false, error: message });
            return;
        }
        res.status(500).json({ success: false, error: message });
    }
};
exports.changeUserRole = changeUserRole;
//# sourceMappingURL=auth.controller.js.map