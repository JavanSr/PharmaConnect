import { Request, Response } from 'express';
import { z } from 'zod';
import { UserRole, PharmacyType, SubscriptionTier } from '@prisma/client';
// UserRole now includes WHOLESALE_SELLER after migration
import { AuthService } from './auth.service';
import { logger } from '../../lib/logger';

const authService = new AuthService();

// ─── Validation Schemas ────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  pharmacyName: z.string().min(1, 'Pharmacy name is required'),
  licenceNumber: z.string().min(1, 'Licence number is required'),
  address: z.string().min(1, 'Address is required'),
  region: z.string().min(1, 'Region is required'),
  pharmacyType: z.nativeEnum(PharmacyType),
  subscriptionTier: z.nativeEnum(SubscriptionTier).optional(),
  pcRegistrationNumber: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  deviceInfo: z.string().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.nativeEnum(UserRole),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

const changeRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
});

// ─── Controllers ──────────────────────────────────────────────────────────────

export const register = async (req: Request, res: Response): Promise<void> => {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    logger.error('Register controller error:', err);

    if (message.includes('already exists')) {
      res.status(409).json({ success: false, error: message });
      return;
    }

    res.status(500).json({ success: false, error: message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
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
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;

    const result = await authService.login(email, password, deviceInfo, ipAddress);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login failed';
    logger.error('Login controller error:', err);

    if (message.includes('Invalid email or password')) {
      res.status(401).json({ success: false, error: message });
      return;
    }

    res.status(500).json({ success: false, error: message });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token refresh failed';
    logger.error('Refresh token controller error:', err);

    if (
      message.includes('Invalid') ||
      message.includes('expired') ||
      message.includes('revoked')
    ) {
      res.status(401).json({ success: false, error: message });
      return;
    }

    res.status(500).json({ success: false, error: message });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Logout failed';
    logger.error('Logout controller error:', err);
    res.status(500).json({ success: false, error: message });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve user';
    logger.error('GetMe controller error:', err);

    if (message.includes('not found')) {
      res.status(404).json({ success: false, error: message });
      return;
    }

    res.status(500).json({ success: false, error: message });
  }
};

export const listPharmacyUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.pharmacyId) {
      res.status(403).json({ success: false, error: 'No pharmacy associated with your account' });
      return;
    }
    const users = await authService.listPharmacyUsers(req.user.pharmacyId);
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list users';
    logger.error('ListPharmacyUsers error:', err);
    res.status(500).json({ success: false, error: message });
  }
};

export const inviteUser = async (req: Request, res: Response): Promise<void> => {
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
    const result = await authService.inviteUser(
      req.user.pharmacyId,
      email,
      role,
      firstName,
      lastName
    );

    res.status(201).json({
      success: true,
      message: 'User invited successfully. They will receive an email with login instructions.',
      data: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to invite user';
    logger.error('InviteUser controller error:', err);

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

export const changeUserRole = async (req: Request, res: Response): Promise<void> => {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to change role';
    logger.error('ChangeUserRole controller error:', err);

    if (message.includes('not found')) {
      res.status(404).json({ success: false, error: message });
      return;
    }

    res.status(500).json({ success: false, error: message });
  }
};
