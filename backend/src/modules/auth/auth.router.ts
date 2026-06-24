import { Router } from 'express';
import { z } from 'zod';
import { authenticate, assertUser } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import {
  loginService,
  registerService,
  refreshTokenService,
  logoutService,
  verifyEmailService,
  resendVerificationService,
  requestPasswordResetService,
  resetPasswordService,
} from './auth.service';
import type { AuthRequest } from '../../middleware/auth';

export const authRouter = Router();

const loginSchema = z.object({
  // Accepts email address or phone number (+255 / 0xxxxxxxxx)
  email:             z.string().min(1),
  password:          z.string().min(1),
  preferredPharmacyId: z.string().uuid().optional(),
});

const registerSchema = z.object({
  pharmacyName:  z.string().min(2),
  licenceNumber: z.string().min(1).optional(),
  address:       z.string().min(5),
  region:        z.string().min(1),
  pharmacyType:  z.enum(['RETAIL', 'ADDO', 'WHOLESALE', 'RETAIL_WHOLESALE']),
  firstName:     z.string().min(1),
  lastName:      z.string().min(1),
  email:         z.string().email(),
  password:      z.string().min(8),
});

const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

const passwordResetSchema = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(8).max(128),
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password, preferredPharmacyId } = loginSchema.parse(req.body);
    const result = await loginService(email, password, preferredPharmacyId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/register', async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);
    const result = await registerService(payload);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = z.object({ token: z.string().min(1) }).parse(req.query);
    const result = await verifyEmailService(token);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/resend-verification', async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    await resendVerificationService(email);
    res.json({ data: { message: 'If that email is registered and unverified, a new link has been sent.' } });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = passwordResetRequestSchema.parse(req.body);
    await requestPasswordResetService(email);
    res.json({ data: { message: 'If that email is registered, a reset link has been sent.' } });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = passwordResetSchema.parse(req.body);
    await resetPasswordService(token, password);
    res.json({ data: { message: 'Password reset complete. Sign in with your new password.' } });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    const tokens = await refreshTokenService(refreshToken);
    res.json({ data: tokens });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string().optional() }).parse(req.body);
    if (refreshToken) await logoutService(refreshToken);
    res.json({ data: { message: 'Logged out' } });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: assertUser(req).userId },
      include: { pharmacy: true },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const { password: _pw, ...safe } = user;
    res.json({ data: safe });
  } catch (err) {
    next(err);
  }
});
