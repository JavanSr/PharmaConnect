import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { withPrismaRetry } from '../../lib/prisma-retry';
import { verifyRefresh } from '../../lib/jwt';
import { normalizeRole, type KnownRole } from '../../types/roles';
import { issueAuthTokens, listAccessiblePharmacies, resolveActiveMembership } from './pharmacy-membership.service';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function initialSubscriptionTier(pharmacyType: 'RETAIL' | 'ADDO' | 'WHOLESALE') {
  if (pharmacyType === 'ADDO') {
    return 'ADDO' as const;
  }

  if (pharmacyType === 'WHOLESALE') {
    return 'WHOLESALE' as const;
  }

  return 'STANDARD' as const;
}

type LoginMembership = Awaited<ReturnType<typeof listAccessiblePharmacies>>[number];
type LoginTimings = Record<string, number>;

const loginSlowLogMs = Number(process.env.LOGIN_SLOW_LOG_MS ?? 1000);

async function measureLoginStep<T>(
  timings: LoginTimings,
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  try {
    return await fn();
  } finally {
    timings[name] = Date.now() - startedAt;
  }
}

function chooseLoginMembership(
  memberships: LoginMembership[],
  preferredPharmacyId?: string | null,
): LoginMembership | null {
  if (!memberships.length) {
    return null;
  }

  if (preferredPharmacyId) {
    const preferred = memberships.find((membership) => membership.pharmacyId === preferredPharmacyId);
    if (preferred) {
      return preferred;
    }
  }

  return memberships[0];
}

export async function loginService(email: string, password: string, preferredPharmacyId?: string) {
  const startedAt = Date.now();
  const timings: LoginTimings = {};
  const user = await measureLoginStep(timings, 'userLookupMs', () => withPrismaRetry(() => prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { pharmacy: true },
    })));

  if (!user || !user.isActive) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const valid = await measureLoginStep(timings, 'passwordCompareMs', () => bcrypt.compare(password, user.password));
  if (!valid) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const normalizedRole = normalizeRole(user.role);
  const rawMemberships = normalizedRole === 'SUPER_ADMIN'
    ? []
    : await measureLoginStep(timings, 'membershipsMs', () => listAccessiblePharmacies(user.id));
  const membership = normalizedRole === 'SUPER_ADMIN'
    ? null
    : chooseLoginMembership(rawMemberships, preferredPharmacyId ?? user.pharmacyId);

  if (!membership && normalizedRole !== 'SUPER_ADMIN') {
    throw Object.assign(new Error('No active pharmacy membership found'), { status: 403 });
  }

  const selectedPharmacyId = membership?.pharmacyId ?? user.pharmacyId;

  const { accessToken, refreshToken } = await measureLoginStep(timings, 'tokenIssueMs', () => issueAuthTokens({
      userId: user.id,
      role: user.role,
      pharmacyId: selectedPharmacyId,
    }));

  void withPrismaRetry(() => prisma.user.update({
    where: { id: user.id },
    data: {
      lastLogin: new Date(),
      ...(selectedPharmacyId ? { pharmacyId: selectedPharmacyId } : {}),
    },
  })).catch((error) => {
    console.error('[auth.login.lastLoginUpdateFailed]', error);
  });

  const memberships = rawMemberships.map((entry) => ({
      ...entry,
      selected: entry.pharmacyId === selectedPharmacyId,
    }));

  const totalMs = Date.now() - startedAt;
  if (totalMs >= loginSlowLogMs) {
    console.warn('[auth.login.slow]', {
      totalMs,
      ...timings,
      userId: user.id,
      membershipCount: rawMemberships.length,
      selectedPharmacyId,
    });
  }

  const { password: _pw, ...safeUser } = user;
  return {
    user: {
      ...safeUser,
      pharmacyId: selectedPharmacyId,
    },
    accessToken,
    refreshToken,
    pharmacy: membership?.pharmacy ?? user.pharmacy,
    memberships,
  };
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
  const tokenHash = hashToken(token);

  const stored = await withPrismaRetry(() => prisma.refreshToken.findUnique({ where: { token: tokenHash } }));
  if (!stored || stored.expiresAt < new Date()) {
    throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
  }

  // Rotate: delete old, issue new
  await withPrismaRetry(() => prisma.refreshToken.delete({ where: { token: tokenHash } }));

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
  await withPrismaRetry(() => prisma.refreshToken.deleteMany({ where: { token: hashToken(token) } }));
}
