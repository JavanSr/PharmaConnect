import type { Response } from 'express';

// pharmacyId → Set of SSE response objects currently subscribed
const pharmacyClients = new Map<string, Set<Response>>();

export function registerClient(pharmacyId: string, res: Response): void {
  if (!pharmacyClients.has(pharmacyId)) {
    pharmacyClients.set(pharmacyId, new Set());
  }
  pharmacyClients.get(pharmacyId)!.add(res);
}

export function removeClient(pharmacyId: string, res: Response): void {
  pharmacyClients.get(pharmacyId)?.delete(res);
  if (pharmacyClients.get(pharmacyId)?.size === 0) {
    pharmacyClients.delete(pharmacyId);
  }
}

export function emitToPharmacy(pharmacyId: string, eventType: string, data?: unknown): void {
  const clients = pharmacyClients.get(pharmacyId);
  if (!clients || clients.size === 0) return;
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data ?? {})}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      // client disconnected between the check and write — will be cleaned up on close
    }
  }
}

// roomId → Set of SSE response objects currently subscribed (Chat Room)
const roomClients = new Map<string, Set<Response>>();

export function registerRoomClient(roomId: string, res: Response): void {
  if (!roomClients.has(roomId)) {
    roomClients.set(roomId, new Set());
  }
  roomClients.get(roomId)!.add(res);
}

export function removeRoomClient(roomId: string, res: Response): void {
  roomClients.get(roomId)?.delete(res);
  if (roomClients.get(roomId)?.size === 0) {
    roomClients.delete(roomId);
  }
}

export function emitToRoom(roomId: string, eventType: string, data?: unknown): void {
  const clients = roomClients.get(roomId);
  if (!clients || clients.size === 0) return;
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data ?? {})}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      // client disconnected between the check and write — will be cleaned up on close
    }
  }
}
