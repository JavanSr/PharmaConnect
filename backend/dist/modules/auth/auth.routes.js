"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_controller_1 = require("./auth.controller");
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
const rateLimiter_1 = require("../../middleware/rateLimiter");
const router = (0, express_1.Router)();
/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new pharmacy and owner user
 * @access  Public
 */
router.post('/register', auth_controller_1.register);
/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user and return tokens
 * @access  Public (rate limited: 5 attempts per 15 min)
 */
router.post('/login', rateLimiter_1.loginRateLimiter, auth_controller_1.login);
/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Rotate refresh token and return new token pair
 * @access  Public (requires valid refresh token in body)
 */
router.post('/refresh', auth_controller_1.refresh);
/**
 * @route   POST /api/v1/auth/logout
 * @desc    Revoke refresh token
 * @access  Public (requires refresh token in body)
 */
router.post('/logout', auth_controller_1.logout);
/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private (requires valid access token)
 */
router.get('/me', authenticate_1.authenticate, auth_controller_1.getMe);
/**
 * @route   POST /api/v1/auth/pharmacy/users
 * @desc    Invite a new user to the pharmacy
 * @access  Private (OWNER or SUPER_ADMIN only)
 */
router.get('/pharmacy/users', authenticate_1.authenticate, auth_controller_1.listPharmacyUsers);
router.post('/pharmacy/users', authenticate_1.authenticate, (0, authorize_1.authorize)([client_1.UserRole.OWNER, client_1.UserRole.SUPER_ADMIN]), auth_controller_1.inviteUser);
/**
 * @route   PUT /api/v1/auth/pharmacy/users/:id/role
 * @desc    Change the role of a pharmacy user
 * @access  Private (OWNER or SUPER_ADMIN only)
 */
router.put('/pharmacy/users/:id/role', authenticate_1.authenticate, (0, authorize_1.authorize)([client_1.UserRole.OWNER, client_1.UserRole.SUPER_ADMIN]), auth_controller_1.changeUserRole);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map