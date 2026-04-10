import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authenticate, requireRole } from '../../middleware/auth.js';
import type { AuthRequest } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';

export const settingsRouter = Router();
settingsRouter.use(authenticate);

const uid = (req: AuthRequest) => req.user!.userId;
const pid = (req: AuthRequest) => req.user!.pharmacyId!;

// ── Profile ───────────────────────────────────────────────────────────────────
settingsRouter.get('/profile', async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: uid(req) },
      include: { pharmacy: true },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const { password: _pw, ...safe } = user;
    res.json({ data: safe });
  } catch (e) { next(e); }
});

settingsRouter.put('/profile', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      firstName: z.string().min(1).optional(),
      lastName:  z.string().min(1).optional(),
    });
    const data = schema.parse(req.body);
    const user = await prisma.user.update({ where: { id: uid(req) }, data });
    const { password: _pw, ...safe } = user;
    res.json({ data: safe });
  } catch (e) { next(e); }
});

settingsRouter.post('/change-password', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword:     z.string().min(8),
    });
    const { currentPassword, newPassword } = schema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: uid(req) } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) { res.status(400).json({ error: 'Current password is incorrect' }); return; }
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: uid(req) }, data: { password: hashed } });
    res.json({ data: { message: 'Password changed successfully' } });
  } catch (e) { next(e); }
});

// ── Team ──────────────────────────────────────────────────────────────────────
settingsRouter.get('/team', async (req: AuthRequest, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { pharmacyId: pid(req) },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true, lastLogin: true, createdAt: true },
      orderBy: { firstName: 'asc' },
    });
    res.json({ data: users });
  } catch (e) { next(e); }
});

settingsRouter.post('/team/invite', requireRole('OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      firstName: z.string().min(1),
      lastName:  z.string().min(1),
      email:     z.string().email(),
      role:      z.enum(['PHARMACIST_IN_CHARGE', 'DISPENSER', 'DATA_ENTRY_CLERK', 'WHOLESALE_SELLER']),
      password:  z.string().min(8),
    });
    const data = schema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (exists) { res.status(409).json({ error: 'Email already registered' }); return; }
    const hashed = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
        password: hashed,
        pharmacyId: pid(req),
      },
    });
    const { password: _pw, ...safe } = user;
    res.status(201).json({ data: safe });
  } catch (e) { next(e); }
});

settingsRouter.patch('/team/:id/role', requireRole('OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { role } = z.object({ role: z.string() }).parse(req.body);
    const user = await prisma.user.findFirst({ where: { id: req.params.id, pharmacyId: pid(req) } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const updated = await prisma.user.update({ where: { id: req.params.id }, data: { role: role as any } });
    const { password: _pw, ...safe } = updated;
    res.json({ data: safe });
  } catch (e) { next(e); }
});

settingsRouter.patch('/team/:id/deactivate', requireRole('OWNER', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    if (req.params.id === uid(req)) {
      res.status(400).json({ error: 'Cannot deactivate your own account' });
      return;
    }
    const user = await prisma.user.findFirst({ where: { id: req.params.id, pharmacyId: pid(req) } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ data: { message: 'User deactivated' } });
  } catch (e) { next(e); }
});
