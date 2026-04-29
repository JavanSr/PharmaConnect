import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import {
  loginService,
  registerService,
  refreshTokenService,
  logoutService,
  verifyEmailService,
  resendVerificationService,
} from './auth.service';
import type { AuthRequest } from '../../middleware/auth';

export const authRouter = Router();

const loginSchema = z.object({
  email:             z.string().email(),
  password:          z.string().min(1),
  preferredPharmacyId: z.string().uuid().optional(),
});

const registerSchema = z.object({
  pharmacyName:  z.string().min(2),
  licenceNumber: z.string().min(1),
  address:       z.string().min(5),
  region:        z.string().min(1),
  pharmacyType:  z.enum(['RETAIL', 'ADDO', 'WHOLESALE']),
  firstName:     z.string().min(1),
  lastName:      z.string().min(1),
  email:         z.string().email(),
  password:      z.string().min(8),
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
      where: { id: req.user!.userId },
      include: { pharmacy: true },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const { password: _pw, ...safe } = user;
    res.json({ data: safe });
  } catch (err) {
    next(err);
  }
});
