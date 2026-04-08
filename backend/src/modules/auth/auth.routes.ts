import { Router } from 'express';
import { UserRole } from '@prisma/client';
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  listPharmacyUsers,
  inviteUser,
  changeUserRole,
} from './auth.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { loginRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new pharmacy and owner user
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user and return tokens
 * @access  Public (rate limited: 5 attempts per 15 min)
 */
router.post('/login', loginRateLimiter, login);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Rotate refresh token and return new token pair
 * @access  Public (requires valid refresh token in body)
 */
router.post('/refresh', refresh);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Revoke refresh token
 * @access  Public (requires refresh token in body)
 */
router.post('/logout', logout);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private (requires valid access token)
 */
router.get('/me', authenticate, getMe);

/**
 * @route   POST /api/v1/auth/pharmacy/users
 * @desc    Invite a new user to the pharmacy
 * @access  Private (OWNER or SUPER_ADMIN only)
 */
router.get('/pharmacy/users', authenticate, listPharmacyUsers);

router.post(
  '/pharmacy/users',
  authenticate,
  authorize([UserRole.OWNER, UserRole.SUPER_ADMIN]),
  inviteUser
);

/**
 * @route   PUT /api/v1/auth/pharmacy/users/:id/role
 * @desc    Change the role of a pharmacy user
 * @access  Private (OWNER or SUPER_ADMIN only)
 */
router.put(
  '/pharmacy/users/:id/role',
  authenticate,
  authorize([UserRole.OWNER, UserRole.SUPER_ADMIN]),
  changeUserRole
);

export default router;
