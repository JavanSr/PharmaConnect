import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRole, PharmacyType, SubscriptionTier } from '@prisma/client';
import prisma from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { hashSha256, generateRandomToken } from '../../lib/crypto';
import { EmailService } from '../../services/email.service';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const MAX_CONCURRENT_SESSIONS = 2;

const emailService = new EmailService();

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  pharmacyName: string;
  licenceNumber: string;
  address: string;
  region: string;
  pharmacyType: PharmacyType;
  subscriptionTier?: SubscriptionTier;
  pcRegistrationNumber?: string;
}

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    pharmacyId: string | null;
  };
}

function getPrivateKey(): string {
  const key = process.env.JWT_PRIVATE_KEY;
  if (!key) throw new Error('JWT_PRIVATE_KEY environment variable is not set');
  return key.replace(/\\n/g, '\n');
}

function getPublicKey(): string {
  const key = process.env.JWT_PUBLIC_KEY;
  if (!key) throw new Error('JWT_PUBLIC_KEY environment variable is not set');
  return key.replace(/\\n/g, '\n');
}

function generateAccessToken(user: {
  id: string;
  email: string;
  role: UserRole;
  pharmacyId: string | null;
}): string {
  const privateKey = getPrivateKey();
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      pharmacyId: user.pharmacyId,
    },
    privateKey,
    {
      algorithm: 'RS256',
      expiresIn: ACCESS_TOKEN_EXPIRY,
    }
  );
}

function generateRefreshTokenValue(): string {
  return generateRandomToken(64);
}

function hashRefreshToken(token: string): string {
  return hashSha256(token);
}

function getRefreshTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  return expiry;
}

export class AuthService {
  /**
   * Register a new pharmacy and its owner user.
   */
  async register(data: RegisterData) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existingUser) {
      throw new Error('A user with this email address already exists.');
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    const result = await prisma.$transaction(async (tx) => {
      // Create the pharmacy first
      const pharmacy = await tx.pharmacy.create({
        data: {
          name: data.pharmacyName,
          licenceNumber: data.licenceNumber,
          address: data.address,
          region: data.region,
          pharmacyType: data.pharmacyType,
          subscriptionTier: data.subscriptionTier ?? SubscriptionTier.FREE,
        },
      });

      // Create the owner user
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: UserRole.OWNER,
          pharmacyId: pharmacy.id,
          pcRegistrationNumber: data.pcRegistrationNumber,
        },
      });

      // Update pharmacy with ownerId
      await tx.pharmacy.update({
        where: { id: pharmacy.id },
        data: { ownerId: user.id },
      });

      return { user, pharmacy };
    });

    logger.info(`New pharmacy registered: ${result.pharmacy.name} (${result.pharmacy.id})`);

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        pharmacyId: result.user.pharmacyId,
      },
      pharmacy: {
        id: result.pharmacy.id,
        name: result.pharmacy.name,
        licenceNumber: result.pharmacy.licenceNumber,
        pharmacyType: result.pharmacy.pharmacyType,
        subscriptionTier: result.pharmacy.subscriptionTier,
      },
    };
  }

  /**
   * Authenticate a user and issue access + refresh tokens.
   * Enforces max 2 concurrent sessions.
   */
  async login(
    email: string,
    password: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<LoginResult> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid email or password.');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new Error('Invalid email or password.');
    }

    // Check concurrent sessions — enforce max 2
    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });

    if (sessions.length >= MAX_CONCURRENT_SESSIONS) {
      // Delete oldest sessions to make room
      const toDelete = sessions.slice(0, sessions.length - MAX_CONCURRENT_SESSIONS + 1);
      const idsToDelete = toDelete.map((s) => s.id);
      await prisma.session.deleteMany({ where: { id: { in: idsToDelete } } });

      // Also revoke the refresh tokens for deleted sessions
      // (Sessions don't directly map to refresh tokens but revoke oldest tokens)
      const oldestTokens = await prisma.refreshToken.findMany({
        where: { userId: user.id, isRevoked: false },
        orderBy: { createdAt: 'asc' },
        take: toDelete.length,
      });
      if (oldestTokens.length > 0) {
        await prisma.refreshToken.updateMany({
          where: { id: { in: oldestTokens.map((t) => t.id) } },
          data: { isRevoked: true },
        });
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      pharmacyId: user.pharmacyId,
    });

    const rawRefreshToken = generateRefreshTokenValue();
    const hashedToken = hashRefreshToken(rawRefreshToken);
    const expiresAt = getRefreshTokenExpiry();

    await prisma.$transaction([
      // Store hashed refresh token
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: hashedToken,
          expiresAt,
        },
      }),
      // Create session
      prisma.session.create({
        data: {
          userId: user.id,
          deviceInfo,
          ipAddress,
        },
      }),
      // Update lastLoginAt
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
    ]);

    logger.info(`User logged in: ${user.email}`);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        pharmacyId: user.pharmacyId,
      },
    };
  }

  /**
   * Rotate refresh token: validate, revoke old, issue new pair.
   */
  async refreshToken(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    const hashedToken = hashRefreshToken(token);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new Error('Invalid refresh token.');
    }

    if (storedToken.isRevoked) {
      // Possible token reuse attack — revoke all tokens for this user
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId },
        data: { isRevoked: true },
      });
      logger.warn(`Refresh token reuse detected for user ${storedToken.userId}`);
      throw new Error('Refresh token has been revoked. Please log in again.');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new Error('Refresh token has expired. Please log in again.');
    }

    if (!storedToken.user.isActive) {
      throw new Error('User account is inactive.');
    }

    // Rotate: revoke old token, issue new pair
    const newRawRefreshToken = generateRefreshTokenValue();
    const newHashedToken = hashRefreshToken(newRawRefreshToken);
    const newExpiresAt = getRefreshTokenExpiry();

    const newAccessToken = generateAccessToken({
      id: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
      pharmacyId: storedToken.user.pharmacyId,
    });

    await prisma.$transaction([
      // Revoke old token
      prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      }),
      // Create new token
      prisma.refreshToken.create({
        data: {
          userId: storedToken.userId,
          token: newHashedToken,
          expiresAt: newExpiresAt,
        },
      }),
    ]);

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  /**
   * Revoke a refresh token (logout).
   */
  async logout(refreshToken: string): Promise<void> {
    const hashedToken = hashRefreshToken(refreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: hashedToken },
    });

    if (!storedToken) {
      // Token not found — already invalid/logged out
      return;
    }

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    logger.info(`Refresh token revoked for user ${storedToken.userId}`);
  }

  /**
   * Invite a new user to a pharmacy with a temporary password.
   */
  async inviteUser(
    pharmacyId: string,
    email: string,
    role: UserRole,
    firstName: string,
    lastName: string
  ) {
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      throw new Error('A user with this email address already exists.');
    }

    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) {
      throw new Error('Pharmacy not found.');
    }

    // Generate a temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role,
        pharmacyId,
      },
    });

    // Send invite email
    try {
      await emailService.sendEmail(
        email,
        `You've been invited to PharmaConnect — ${pharmacy.name}`,
        `
        <h2>Welcome to PharmaConnect</h2>
        <p>Hi ${firstName},</p>
        <p>You have been invited to join <strong>${pharmacy.name}</strong> on PharmaConnect as <strong>${role}</strong>.</p>
        <p>Your temporary login credentials:</p>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Temporary Password:</strong> ${tempPassword}</li>
        </ul>
        <p>Please log in and change your password immediately.</p>
        <p><a href="${process.env.FRONTEND_URL}/login">Log In Now</a></p>
        <p>The PharmaConnect Team</p>
        `
      );
    } catch (err) {
      logger.error('Failed to send invite email:', err);
      // Don't fail user creation if email fails
    }

    logger.info(`User invited: ${email} to pharmacy ${pharmacyId} as ${role}`);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      pharmacyId: user.pharmacyId,
    };
  }

  /**
   * List all users belonging to a pharmacy.
   */
  async listPharmacyUsers(pharmacyId: string) {
    return prisma.user.findMany({
      where: { pharmacyId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Change the role of a user.
   */
  async changeUserRole(userId: string, newRole: UserRole) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found.');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    logger.info(`User role changed: ${userId} -> ${newRole}`);

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role,
      pharmacyId: updatedUser.pharmacyId,
    };
  }

  /**
   * Get the current authenticated user with their pharmacy.
   */
  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        pharmacy: {
          select: {
            id: true,
            name: true,
            licenceNumber: true,
            address: true,
            region: true,
            pharmacyType: true,
            subscriptionTier: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found.');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      pharmacyId: user.pharmacyId,
      pcRegistrationNumber: user.pcRegistrationNumber,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      pharmacy: user.pharmacy,
    };
  }
}

export default AuthService;
