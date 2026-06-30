import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Prisma, type BillingCycle, type PharmacyAccountStatus, type PharmacyMembershipRole, type PharmacyType, type SubscriptionTier } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { withPrismaRetry } from '../../lib/prisma-retry';
import { verifyRefresh } from '../../lib/jwt';
import { normalizeRole, type KnownRole } from '../../types/roles';
import { issueAuthTokens, resolveActiveMembership } from './pharmacy-membership.service';
import { sendPasswordResetEmail, sendVerificationEmail, sendWelcomeEmail, sendFounderNotification, sendFounderNewPharmacyAlert } from '../../lib/email';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const TRIAL_DAYS = 14;

type RegistrationPharmacyType = 'RETAIL' | 'ADDO' | 'WHOLESALE' | 'RETAIL_WHOLESALE';

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function generatePendingLicenceNumber(): string {
  return `PENDING-${crypto.randomUUID()}`;
}

function storedPharmacyType(pharmacyType: RegistrationPharmacyType): 'RETAIL' | 'ADDO' | 'WHOLESALE' {
  return pharmacyType === 'RETAIL_WHOLESALE' ? 'RETAIL' : pharmacyType;
}

function isRetailWholesale(pharmacyType: RegistrationPharmacyType): boolean {
  return pharmacyType === 'RETAIL_WHOLESALE';
}

function initialSubscriptionTier(pharmacyType: RegistrationPharmacyType) {
  if (pharmacyType === 'ADDO') {
    return 'ADDO' as const;
  }

  if (pharmacyType === 'WHOLESALE') {
    return 'WHOLESALE' as const;
  }

  return 'STANDARD' as const;
}

type LoginMembership = {
  id: string;
  pharmacyId: string;
  role: PharmacyMembershipRole;
  active: boolean;
  validFrom: Date | null;
  validUntil: Date | null;
  pharmacy: {
    id: string;
    name: string;
    licenceNumber: string;
    address: string;
    region: string;
    pharmacyType: PharmacyType;
    subscriptionTier: SubscriptionTier;
    billingCycle: BillingCycle;
    status: PharmacyAccountStatus;
    trialActive: boolean;
    trialStartsAt: Date | null;
    trialEndsAt: Date | null;
    isHybrid: boolean;
    hybridAddonActive: boolean;
    vfdEnabled: boolean;
    userLimit: number | null;
    isActive: boolean;
    createdAt: Date;
  } | null;
};
type LoginTimings = Record<string, number>;

const loginSlowLogMs = Number(process.env.LOGIN_SLOW_LOG_MS ?? 1000);
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

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

async function recordLoginAuditEvent(input: {
  userId: string;
  pharmacyId?: string | null;
  selectedRole: string;
  membershipCount: number;
}) {
  await withPrismaRetry(() => prisma.$executeRaw(Prisma.sql`
    INSERT INTO "audit_log" ("pharmacy_id", "table_name", "record_id", "action", "acted_by", "new_data")
    VALUES (
      ${input.pharmacyId ?? null},
      'auth_sessions',
      ${input.userId},
      'LOGIN',
      ${input.userId},
      ${JSON.stringify({
        selectedRole: input.selectedRole,
        membershipCount: input.membershipCount,
      })}::jsonb
    )
  `));
}

// Normalise a phone identifier for DB lookup.
// Strips spaces/dashes, ensures +255 prefix for Tanzanian numbers.
function normalisePhoneIdentifier(raw: string): string {
  const stripped = raw.replace(/[\s\-().]/g, '');
  if (/^\+/.test(stripped)) return stripped;
  if (/^0\d{9}$/.test(stripped)) return `+255${stripped.slice(1)}`;
  if (/^255\d{9}$/.test(stripped)) return `+${stripped}`;
  return stripped;
}

export async function loginService(email: string, password: string, preferredPharmacyId?: string) {
  const startedAt = Date.now();
  const timings: LoginTimings = {};
  const now = new Date();

  // Allow login with phone number OR email
  const isPhone = /^[+0]?\d[\d\s\-().]{6,}$/.test(email.trim()) && !email.includes('@');
  const lookupWhere = isPhone
    ? { phone: normalisePhoneIdentifier(email.trim()) }
    : { email: email.toLowerCase() };

  const user = await measureLoginStep(timings, 'userLookupMs', () => withPrismaRetry(() => prisma.user.findFirst({
      where: lookupWhere,
      include: {
        pharmacy: true,
        memberships: {
          where: {
            active: true,
            OR: [
              { validFrom: null },
              { validFrom: { lte: now } },
            ],
            AND: [
              {
                OR: [
                  { validUntil: null },
                  { validUntil: { gte: now } },
                ],
              },
            ],
          },
          orderBy: [
            { pharmacy: { name: 'asc' } },
            { createdAt: 'asc' },
          ],
          select: {
            id: true,
            pharmacyId: true,
            role: true,
            active: true,
            validFrom: true,
            validUntil: true,
            pharmacy: {
              select: {
                id: true,
                name: true,
                licenceNumber: true,
                address: true,
                region: true,
                pharmacyType: true,
                subscriptionTier: true,
                billingCycle: true,
                status: true,
                trialActive: true,
                trialStartsAt: true,
                trialEndsAt: true,
                isHybrid: true,
                hybridAddonActive: true,
                vfdEnabled: true,
                userLimit: true,
                isActive: true,
                createdAt: true,
              },
            },
          },
        },
      },
    })));

  if (!user || !user.isActive) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const valid = await measureLoginStep(timings, 'passwordCompareMs', () => bcrypt.compare(password, user.password));
  if (!valid) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const normalizedRole = normalizeRole(user.role);
  const rawMemberships = user.memberships;
  timings.membershipsMs = 0;
  // SUPER_ADMIN has no pharmacy context — their account is platform-level only.
  const membership = normalizedRole === 'SUPER_ADMIN'
    ? null
    : chooseLoginMembership(rawMemberships, preferredPharmacyId ?? user.pharmacyId);

  if (!membership && normalizedRole !== 'SUPER_ADMIN') {
    throw Object.assign(new Error('No active pharmacy membership found'), { status: 403 });
  }

  const selectedPharmacyId = normalizedRole === 'SUPER_ADMIN'
    ? null
    : (membership?.pharmacyId ?? user.pharmacyId);

  const { accessToken, refreshToken } = await measureLoginStep(timings, 'tokenIssueMs', () => issueAuthTokens({
      userId: user.id,
      role: user.role,
      pharmacyId: selectedPharmacyId,
    }, { refreshTokenWrite: 'background' }));

  // Login timestamp capture: writes user_id + current timestamp to users.last_login on every login.
  void withPrismaRetry(() => prisma.user.update({
    where: { id: user.id },
    data: {
      lastLogin: new Date(),
      ...(selectedPharmacyId ? { pharmacyId: selectedPharmacyId } : {}),
    },
  })).catch((error) => {
    console.error('[auth.login.lastLoginUpdateFailed]', error);
  });

  // Login audit event: writes user_id + timestamp to audit_log (table_name='auth_sessions', action='LOGIN') on every login.
  await recordLoginAuditEvent({
    userId: user.id,
    pharmacyId: selectedPharmacyId,
    selectedRole: membership?.role ?? user.role,
    membershipCount: rawMemberships.length,
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

  const { password: _pw, memberships: _memberships, ...safeUser } = user;
  return {
    user: {
      ...safeUser,
      pharmacyId: selectedPharmacyId,
    },
    accessToken,
    refreshToken,
    pharmacy: normalizedRole === 'SUPER_ADMIN' ? null : (membership?.pharmacy ?? user.pharmacy),
    memberships: normalizedRole === 'SUPER_ADMIN' ? [] : memberships,
  };
}

export async function registerService(payload: {
  pharmacyName: string;
  licenceNumber?: string;
  finNumber?: string;
  address: string;
  region: string;
  pharmacyType: RegistrationPharmacyType;
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

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 h
  const trialStartsAt = new Date();
  const trialEndsAt = addDays(trialStartsAt, TRIAL_DAYS);
  const savedPharmacyType = storedPharmacyType(payload.pharmacyType);
  const retailWholesale = isRetailWholesale(payload.pharmacyType);

  const result = await prisma.$transaction(async (tx) => {
    const pharmacy = await tx.pharmacy.create({
      data: {
        name: payload.pharmacyName,
        licenceNumber: payload.licenceNumber?.trim() || generatePendingLicenceNumber(),
        finNumber: payload.finNumber?.trim() || null,
        isVerified: Boolean(payload.finNumber?.trim()),
        address: payload.address,
        region: payload.region,
        pharmacyType: savedPharmacyType,
        subscriptionTier: initialSubscriptionTier(payload.pharmacyType),
        status: 'TRIAL',
        trialActive: true,
        trialStartsAt,
        trialEndsAt,
        isHybrid: retailWholesale,
        hybridAddonActive: retailWholesale,
        hybridEnabledAt: retailWholesale ? trialStartsAt : undefined,
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
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
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

  // Fire emails in background — don't let email failure break registration
  Promise.all([
    sendVerificationEmail({
      to: result.user.email,
      firstName: result.user.firstName,
      pharmacyName: result.pharmacy.name,
      token: verificationToken,
    }),
    sendFounderNotification({
      pharmacyName: result.pharmacy.name,
      ownerName: `${result.user.firstName} ${result.user.lastName}`,
      ownerEmail: result.user.email,
      region: result.pharmacy.region,
      pharmacyType: result.pharmacy.isHybrid ? 'RETAIL + WHOLESALE' : result.pharmacy.pharmacyType,
      tier: result.pharmacy.subscriptionTier,
    }),
  ]).catch(err => console.error('[register] email send failed:', err));

  return { pending: true, email: result.user.email };
}

export async function verifyEmailService(token: string) {
  const user = await prisma.user.findUnique({
    where: { emailVerificationToken: token },
    include: { pharmacy: { select: { id: true, name: true, region: true, subscriptionTier: true } } },
  });

  if (!user) {
    throw Object.assign(new Error('Invalid or expired verification link'), { status: 400 });
  }

  if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
    throw Object.assign(new Error('Verification link has expired. Request a new one.'), { status: 410 });
  }

  if (user.emailVerifiedAt) {
    // Already verified — just issue tokens so they can log in
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    // Send welcome email in background
    if (user.pharmacy) {
      sendWelcomeEmail({
        to: user.email,
        firstName: user.firstName,
        pharmacyName: user.pharmacy.name,
        region: user.pharmacy.region,
        tier: user.pharmacy.subscriptionTier,
      }).catch(err => console.error('[verify] welcome email failed:', err));
      sendFounderNewPharmacyAlert({
        pharmacyName: user.pharmacy.name,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email,
      }).catch(err => console.error('[verify] founder alert failed:', err));
    }
  }

  const jwtPayload = { userId: user.id, role: user.role, pharmacyId: user.pharmacyId };
  const { accessToken, refreshToken } = await issueAuthTokens(jwtPayload);
  const { password: _pw, emailVerificationToken: _t, emailVerificationExpiry: _e, ...safeUser } = user;

  return {
    user: safeUser,
    accessToken,
    refreshToken,
    pharmacy: user.pharmacy,
    isNewVerification: !user.emailVerifiedAt,
  };
}

export async function resendVerificationService(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user) {
    // Return success anyway to prevent email enumeration
    return;
  }

  if (user.emailVerifiedAt) {
    throw Object.assign(new Error('Email already verified'), { status: 409 });
  }

  const newToken = crypto.randomBytes(32).toString('hex');
  const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerificationToken: newToken, emailVerificationExpiry: newExpiry },
  });

  const pharmacy = user.pharmacyId
    ? await prisma.pharmacy.findUnique({ where: { id: user.pharmacyId }, select: { name: true } })
    : null;

  sendVerificationEmail({
    to: user.email,
    firstName: user.firstName,
    pharmacyName: pharmacy?.name ?? 'your pharmacy',
    token: newToken,
  }).catch(err => console.error('[resend-verification] email failed:', err));
}

export async function requestPasswordResetService(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.isActive) {
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: hashToken(token),
      passwordResetExpiry: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
  });

  sendPasswordResetEmail({
    to: user.email,
    firstName: user.firstName,
    token,
  }).catch(err => console.error('[password-reset] email failed:', err));
}

export async function resetPasswordService(token: string, password: string) {
  const tokenHash = hashToken(token);
  const user = await prisma.user.findUnique({
    where: { passwordResetToken: tokenHash },
  });

  if (!user || !user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
    throw Object.assign(new Error('Password reset link is invalid or expired'), { status: 400, code: 'PASSWORD_RESET_INVALID' });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(password, 12),
        passwordResetToken: null,
        passwordResetExpiry: null,
        lastPasswordChangeAt: new Date(),
        mustChangePassword: false,
      },
    }),
    prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
  ]);
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
    pharmacyId: normalizeRole(user.role) === 'SUPER_ADMIN'
      ? null
      : (membership?.pharmacyId ?? user.pharmacyId),
  });

  return tokens;
}

export async function logoutService(token: string) {
  await withPrismaRetry(() => prisma.refreshToken.deleteMany({ where: { token: hashToken(token) } }));
}
