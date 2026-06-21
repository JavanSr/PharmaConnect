import { Router } from 'express';
import { authenticate, type AuthRequest } from '../../middleware/auth';
import { registerClient, removeClient } from './realtime.service';

export const realtimeRouter = Router();

realtimeRouter.get('/events', authenticate, (req: AuthRequest, res) => {
  const pharmacyId = req.user?.pharmacyId;
  if (!pharmacyId) {
    res.status(403).json({ error: 'No pharmacy context' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // nginx: disable proxy buffering
  res.flushHeaders();

  // initial handshake event
  res.write(`event: connected\ndata: {"pharmacyId":"${pharmacyId}"}\n\n`);

  registerClient(pharmacyId, res);

  // heartbeat every 30 s to keep the connection alive through proxies
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 30_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(pharmacyId, res);
  });
});
