import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { withPrismaRetry } from '../../lib/prisma-retry';
import { verifyRefresh } from '../../lib/jwt';
import { normalizeRole, type KnownRole } from '../../types/roles';
import { issueAuthTokens, resolveActiveMembership } from './pharmacy-membership.service';

function initialSubscriptionTier(pharmacyType: 'RETAIL' | 'ADDO' | 'WHOLESALE') {
  if (pharmacyType === 'ADDO') {
    return 'ADDO' as const;
  }

  if (pharmacyType === 'WHOLESALE') {
    return 'WHOLESALE' as const;
  }

  return 'STANDARD' as const;
}

export async function loginService(email: string, password: string) {
  const user = await withPrismaRetry(() => prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { pharmacy: true },
  }));

  if (!user || !user.isActive) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  await withPrismaRetry(() => prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  }));

  const normalizedRole = normalizeRole(user.role);
  const membership = normalizedRole === 'SUPER_ADMIN'
    ? null
    : await resolveActiveMembership(user.id, user.pharmacyId);

  if (!membership && normalizedRole !== 'SUPER_ADMIN') {
    throw Object.assign(new Error('No active pharmacy membership found'), { status: 403 });
  }

  const { accessToken, refreshToken } = await issueAuthTokens({
    userId: user.id,
    role: user.role,
    pharmacyId: membership?.pharmacyId ?? user.pharmacyId,
  });

  const { password: _pw, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken, pharmacy: membership?.pharmacy ?? user.pharmacy };
}

export async function registerService(payload: {
  pharmacyName: string;
  licenceNumber: string;
  address: string;
  region: string;
  pharmacyType: 'RETAIL' | 'ADDO' | 'WHOLESALE';
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) {
  const exists = await prisma.user.findUnique({
    where: { email: payload.email.toLowerCase() },
  });
  if (exists) {
    throw Object.assign(new Error('Email already registered'), { status: 409 });
  }

  const hashed = await bcrypt.hash(payload.password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const pharmacy = await tx.pharmacy.create({
      data: {
        name: payload.pharmacyName,
        licenceNumber: payload.licenceNumber,
        address: payload.address,
        region: payload.region,
        pharmacyType: payload.pharmacyType,
        subscriptionTier: initialSubscriptionTier(payload.pharmacyType),
        status: 'TRIAL',
        trialActive: true,
      },
    });

    const user = await tx.user.create({
      data: {
        email: payload.email.toLowerCase(),
        password: hashed,
        firstName: payload.firstName,
        lastName: payload.lastName,
        role: 'OWNER',
        pharmacyId: pharmacy.id,
        lastPasswordChangeAt: new Date(),
      },
    });

    await tx.pharmacyMembership.create({
      data: {
        userId: user.id,
        pharmacyId: pharmacy.id,
        role: 'OWNER',
        active: true,
        validFrom: new Date(),
        createdBy: user.id,
      },
    });

    return { user, pharmacy };
  });

  const jwtPayload = {
    userId: result.user.id,
    role: result.user.role,
    pharmacyId: result.user.pharmacyId,
  };
  const { accessToken, refreshToken } = await issueAuthTokens(jwtPayload);

  const { password: _pw, ...safeUser } = result.user;
  return { user: safeUser, accessToken, refreshToken, pharmacy: result.pharmacy };
}

export async function refreshTokenService(token: string) {
  const payload = verifyRefresh(token);

  const stored = await withPrismaRetry(() => prisma.refreshToken.findUnique({ where: { token } }));
  if (!stored || stored.expiresAt < new Date()) {
    throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
  }

  // Rotate: delete old, issue new
  await withPrismaRetry(() => prisma.refreshToken.delete({ where: { token } }));

  const user = await withPrismaRetry(() => prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      role: true,
      pharmacyId: true,
      isActive: true,
    },
  }));

  if (!user || !user.isActive) {
    throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
  }

  const membership = normalizeRole(user.role) === 'SUPER_ADMIN'
    ? null
    : await resolveActiveMembership(user.id, payload.pharmacyId ?? user.pharmacyId);

  if (!membership && normalizeRole(user.role) !== 'SUPER_ADMIN') {
    throw Object.assign(new Error('No active pharmacy membership found'), { status: 403 });
  }

  const tokens = await issueAuthTokens({
    userId: user.id,
    role: user.role as KnownRole,
    pharmacyId: membership?.pharmacyId ?? user.pharmacyId,
  });

  return tokens;
}

export async function logoutService(token: string) {
  await withPrismaRetry(() => prisma.refreshToken.deleteMany({ where: { token } }));
}
