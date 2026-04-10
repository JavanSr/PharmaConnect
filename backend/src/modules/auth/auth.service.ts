import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../lib/prisma.js';
import { signAccess, signRefresh, verifyRefresh } from '../../lib/jwt.js';

export async function loginService(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { pharmacy: true },
  });

  if (!user || !user.isActive) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const payload = { userId: user.id, role: user.role, pharmacyId: user.pharmacyId };
  const accessToken  = signAccess(payload);
  const refreshToken = signRefresh(payload);

  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      id: uuidv4(),
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const { password: _pw, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken, pharmacy: user.pharmacy };
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
      },
    });

    return { user, pharmacy };
  });

  const jwtPayload = {
    userId: result.user.id,
    role: result.user.role,
    pharmacyId: result.user.pharmacyId,
  };
  const accessToken  = signAccess(jwtPayload);
  const refreshToken = signRefresh(jwtPayload);

  await prisma.refreshToken.create({
    data: {
      id: uuidv4(),
      userId: result.user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const { password: _pw, ...safeUser } = result.user;
  return { user: safeUser, accessToken, refreshToken, pharmacy: result.pharmacy };
}

export async function refreshTokenService(token: string) {
  const payload = verifyRefresh(token);

  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) {
    throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
  }

  // Rotate: delete old, issue new
  await prisma.refreshToken.delete({ where: { token } });

  const newAccess  = signAccess(payload);
  const newRefresh = signRefresh(payload);

  await prisma.refreshToken.create({
    data: {
      id: uuidv4(),
      userId: payload.userId,
      token: newRefresh,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken: newAccess, refreshToken: newRefresh };
}

export async function logoutService(token: string) {
  await prisma.refreshToken.deleteMany({ where: { token } });
}
