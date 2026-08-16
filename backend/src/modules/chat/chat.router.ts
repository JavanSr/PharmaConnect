import { Router } from 'express';
import { z } from 'zod';
import { authenticate, assertUser, requireRole, type AuthRequest } from '../../middleware/auth';
import { enforceTrialRestrictions } from '../../middleware/trial';
import { requirePermission } from '../../middleware/permissions';
import { registerRoomClient, removeRoomClient } from '../realtime/realtime.service';
import {
  ensureLaunchMemberships,
  flagMessage,
  getMessages,
  listRooms,
  postMessage,
  removeMessage,
} from './chat.service';

// Chat Room lives inside Knowledge Hub and follows its access rules exactly —
// including during a subscription lapse. This is a deliberate product
// decision (not an oversight): Knowledge Hub's paywall is meant to be felt,
// and Chat Room (including #drug-alerts) is included in what locks during
// grace, unlike /patient-safety which stays open. See CLAUDE.md.
export const chatRouter = Router();
chatRouter.use(authenticate);
chatRouter.use(enforceTrialRestrictions);
chatRouter.use(requirePermission('knowledge.view'));

const uid = (req: AuthRequest) => assertUser(req).userId;
// V1: every APOTEKH user's userType is their pharmacy role. Kept as a
// separate stored field (not read live from the role each time) so a future
// non-APOTEKH member (doctor/nurse/student without a UserRole at all) fits
// the same column without a schema change.
const userType = (req: AuthRequest) => req.user?.role ?? 'UNKNOWN';

chatRouter.get('/rooms', async (req: AuthRequest, res, next) => {
  try {
    await ensureLaunchMemberships(uid(req), userType(req));
    res.json({ data: await listRooms(uid(req)) });
  } catch (error) {
    next(error);
  }
});

chatRouter.get('/rooms/:roomId/messages', async (req: AuthRequest, res, next) => {
  try {
    const { before, limit } = z.object({
      before: z.string().datetime().optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
    }).parse(req.query);

    const data = await getMessages({ roomId: req.params.roomId, userId: uid(req), before, limit });
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

chatRouter.post('/rooms/:roomId/messages', async (req: AuthRequest, res, next) => {
  try {
    const { body, linkedDrugName } = z.object({
      body: z.string().min(1),
      linkedDrugName: z.string().trim().max(200).optional(),
    }).parse(req.body);

    const data = await postMessage({
      roomId: req.params.roomId,
      userId: uid(req),
      userType: userType(req),
      role: req.user?.role ?? '',
      body,
      linkedDrugName,
    });
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
});

chatRouter.post('/messages/:messageId/flag', async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await flagMessage(req.params.messageId, uid(req)) });
  } catch (error) {
    next(error);
  }
});

chatRouter.delete(
  '/messages/:messageId',
  requireRole('SUPER_ADMIN'),
  async (req: AuthRequest, res, next) => {
    try {
      const { reason } = z.object({ reason: z.string().trim().max(500).optional() }).parse(req.body ?? {});
      res.json({ data: await removeMessage(req.params.messageId, uid(req), reason) });
    } catch (error) {
      next(error);
    }
  },
);

// Server-Sent Events stream for a single room — same pattern as
// realtime.router.ts's pharmacy-scoped /events, keyed by roomId instead.
chatRouter.get('/rooms/:roomId/events', (req: AuthRequest, res) => {
  const { roomId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write(`event: connected\ndata: {"roomId":"${roomId}"}\n\n`);
  registerRoomClient(roomId, res);

  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 30_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeRoomClient(roomId, res);
  });
});
