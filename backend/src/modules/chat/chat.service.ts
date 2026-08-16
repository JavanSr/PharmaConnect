import { prisma } from '../../lib/prisma';
import { emitToRoom } from '../realtime/realtime.service';

const LAUNCH_ROOM_SLUGS = ['all-tanzania', 'drug-alerts'] as const;

// Every user is auto-joined to the launch rooms the first time they touch
// the chat module — matches the agreed launch model (national room + safety
// broadcast channel, no empty regional rooms yet). Idempotent.
export async function ensureLaunchMemberships(userId: string, userType: string): Promise<void> {
  const rooms = await prisma.chatRoom.findMany({
    where: { slug: { in: [...LAUNCH_ROOM_SLUGS] }, isActive: true },
    select: { id: true },
  });

  await Promise.all(
    rooms.map((room) =>
      prisma.chatRoomMembership.upsert({
        where: { roomId_userId: { roomId: room.id, userId } },
        update: {},
        create: { roomId: room.id, userId, userType, isApotekhCustomer: true },
      }),
    ),
  );
}

export async function listRooms(userId: string) {
  const rooms = await prisma.chatRoom.findMany({
    where: { isActive: true },
    orderBy: { kind: 'asc' },
    include: {
      memberships: { where: { userId }, select: { id: true } },
      _count: { select: { messages: { where: { isRemoved: false } } } },
    },
  });

  return rooms.map((room) => ({
    id: room.id,
    slug: room.slug,
    name: room.name,
    kind: room.kind,
    region: room.region,
    description: room.description,
    isReadOnly: room.isReadOnly,
    messageCount: room._count.messages,
    isMember: room.memberships.length > 0,
  }));
}

export async function getMessages(input: {
  roomId: string;
  userId: string;
  before?: string;
  limit?: number;
}) {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  const room = await prisma.chatRoom.findUnique({ where: { id: input.roomId } });
  if (!room || !room.isActive) {
    throw Object.assign(new Error('Room not found'), { status: 404, code: 'ROOM_NOT_FOUND' });
  }

  const messages = await prisma.chatRoomMessage.findMany({
    where: {
      roomId: input.roomId,
      isRemoved: false,
      ...(input.before ? { createdAt: { lt: new Date(input.before) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      author: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  });

  return messages.reverse().map((m) => ({
    id: m.id,
    body: m.body,
    linkedDrugName: m.linkedDrugName,
    isSystemMessage: m.isSystemMessage,
    isFlagged: m.isFlagged,
    createdAt: m.createdAt,
    author: {
      id: m.author.id,
      name: `${m.author.firstName} ${m.author.lastName}`,
      role: m.author.role,
    },
  }));
}

const MAX_BODY_LENGTH = 2000;

export async function postMessage(input: {
  roomId: string;
  userId: string;
  userType: string;
  role: string;
  body: string;
  linkedDrugName?: string;
}) {
  const body = input.body.trim();
  if (!body) {
    throw Object.assign(new Error('Message cannot be empty'), { status: 400, code: 'EMPTY_MESSAGE' });
  }
  if (body.length > MAX_BODY_LENGTH) {
    throw Object.assign(new Error(`Message too long (max ${MAX_BODY_LENGTH} characters)`), {
      status: 400,
      code: 'MESSAGE_TOO_LONG',
    });
  }

  const room = await prisma.chatRoom.findUnique({ where: { id: input.roomId } });
  if (!room || !room.isActive) {
    throw Object.assign(new Error('Room not found'), { status: 404, code: 'ROOM_NOT_FOUND' });
  }
  if (room.isReadOnly && input.role !== 'SUPER_ADMIN') {
    throw Object.assign(new Error('This room is read-only'), { status: 403, code: 'ROOM_READ_ONLY' });
  }

  await prisma.chatRoomMembership.upsert({
    where: { roomId_userId: { roomId: room.id, userId: input.userId } },
    update: {},
    create: { roomId: room.id, userId: input.userId, userType: input.userType, isApotekhCustomer: true },
  });

  const message = await prisma.chatRoomMessage.create({
    data: {
      roomId: input.roomId,
      authorId: input.userId,
      body,
      linkedDrugName: input.linkedDrugName,
      isSystemMessage: room.isReadOnly && input.role === 'SUPER_ADMIN',
    },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  });

  const payload = {
    id: message.id,
    body: message.body,
    linkedDrugName: message.linkedDrugName,
    isSystemMessage: message.isSystemMessage,
    createdAt: message.createdAt,
    author: {
      id: message.author.id,
      name: `${message.author.firstName} ${message.author.lastName}`,
      role: message.author.role,
    },
  };
  emitToRoom(input.roomId, 'chat-message', payload);

  return payload;
}

export async function flagMessage(messageId: string, userId: string) {
  const message = await prisma.chatRoomMessage.findUnique({ where: { id: messageId } });
  if (!message) {
    throw Object.assign(new Error('Message not found'), { status: 404, code: 'MESSAGE_NOT_FOUND' });
  }
  await prisma.chatRoomMessage.update({ where: { id: messageId }, data: { isFlagged: true } });
  return { flagged: true };
}

export async function removeMessage(messageId: string, moderatorUserId: string, reason?: string) {
  const message = await prisma.chatRoomMessage.findUnique({ where: { id: messageId } });
  if (!message) {
    throw Object.assign(new Error('Message not found'), { status: 404, code: 'MESSAGE_NOT_FOUND' });
  }
  await prisma.chatRoomMessage.update({
    where: { id: messageId },
    data: { isRemoved: true, removedBy: moderatorUserId, removedReason: reason ?? null },
  });
  emitToRoom(message.roomId, 'chat-message-removed', { id: messageId });
  return { removed: true };
}
