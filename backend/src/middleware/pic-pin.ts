import bcrypt from 'bcryptjs';
import type { NextFunction, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma';
import type { AuthRequest, VerifiedPicUser } from './auth';

const PIC_ROLES = ['PHARMACIST_IN_CHARGE', 'OWNER', 'SUPER_ADMIN'];

export const picPinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const r = req as AuthRequest;
    return `pic-pin:${r.user?.pharmacyId ?? r.user?.userId ?? 'anonymous'}`;
  },
  message: { error: 'Too many PIN attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export async function verifyPicPinForPharmacy(input: {
  pharmacyId: string;
  picPin: string;
  picUserId?: string | null;
}): Promise<VerifiedPicUser | null> {
  const users = await prisma.user.findMany({
    where: {
      pharmacyId: input.pharmacyId,
      role: { in: PIC_ROLES as any },
      isActive: true,
      ...(input.picUserId ? { id: input.picUserId } : {}),
      NOT: { picPinHash: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      picPinHash: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  for (const user of users) {
    if (!user.picPinHash) {
      continue;
    }

    const matches = await bcrypt.compare(input.picPin, user.picPinHash);
    if (matches) {
      return {
        userId: user.id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      };
    }
  }

  return null;
}

export async function requirePicPin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const picPin = typeof req.body?.pic_pin === 'string' ? req.body.pic_pin : null;
  if (!picPin) {
    res.status(403).json({ error: 'PIC_PIN_REQUIRED' });
    return;
  }

  const picUserId =
    typeof req.body?.pic_user_id === 'string' && req.body.pic_user_id.length > 0
      ? req.body.pic_user_id
      : req.user.userId;

  const picUser = await verifyPicPinForPharmacy({
    pharmacyId: req.user.pharmacyId ?? '',
    picPin,
    picUserId: picUserId || undefined,
  });

  if (!picUser) {
    res.status(403).json({ error: 'PIC_PIN_INVALID' });
    return;
  }

  req.picVerifiedUser = picUser;

  next();
}
