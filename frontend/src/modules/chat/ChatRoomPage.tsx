import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Hash, Lock, MessageCircle, Send, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useChatRoomEvents } from '@/hooks/useChatRoomEvents';

interface ChatRoomSummary {
  id: string;
  slug: string;
  name: string;
  kind: string;
  region: string | null;
  description: string | null;
  isReadOnly: boolean;
  messageCount: number;
  isMember: boolean;
}

interface ChatMessage {
  id: string;
  body: string;
  linkedDrugName: string | null;
  isSystemMessage: boolean;
  isFlagged: boolean;
  createdAt: string;
  author: { id: string; name: string; role: string };
}

const ROOM_ICON: Record<string, React.ReactNode> = {
  NATIONAL: <Hash size={14} />,
  DRUG_ALERTS: <AlertTriangle size={14} />,
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString('en-TZ', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-TZ', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-TZ', { hour: '2-digit', minute: '2-digit' });
}

interface ChatRoomPageProps {
  /** Rendered inside Knowledge Hub's "Chat Room" tab rather than as a standalone route. */
  embedded?: boolean;
}

export const ChatRoomPage: React.FC<ChatRoomPageProps> = ({ embedded = false }) => {
  const user = useAuthStore((s) => s.user);
  const toast = useNotificationStore((s) => s.toast);
  const queryClient = useQueryClient();
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: rooms } = useQuery({
    queryKey: ['chat-rooms'],
    queryFn: () => api.get('/chat/rooms').then((r) => r.data.data as ChatRoomSummary[]),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!activeRoomId && rooms && rooms.length > 0) {
      setActiveRoomId(rooms[0].id);
    }
  }, [rooms, activeRoomId]);

  const activeRoom = rooms?.find((r) => r.id === activeRoomId) ?? null;

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['chat-messages', activeRoomId],
    queryFn: () => api.get(`/chat/rooms/${activeRoomId}/messages`).then((r) => r.data.data as ChatMessage[]),
    enabled: !!activeRoomId,
    staleTime: 10_000,
  });

  useChatRoomEvents(activeRoomId);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages?.length]);

  const sendMutation = useMutation({
    mutationFn: (body: string) => api.post(`/chat/rooms/${activeRoomId}/messages`, { body }),
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['chat-messages', activeRoomId] });
      queryClient.invalidateQueries({ queryKey: ['chat-rooms'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error === 'ROOM_READ_ONLY' ? 'This room is read-only.' : 'Message failed to send.');
    },
  });

  const flagMutation = useMutation({
    mutationFn: (messageId: string) => api.post(`/chat/messages/${messageId}/flag`),
    onSuccess: () => toast.success('Reported. A moderator will review it.'),
  });

  const removeMutation = useMutation({
    mutationFn: (messageId: string) => api.delete(`/chat/messages/${messageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', activeRoomId] });
      toast.success('Message removed.');
    },
  });

  const canModerate = user?.role === 'SUPER_ADMIN';
  const canPost = !!activeRoom && (!activeRoom.isReadOnly || canModerate);

  const handleSend = () => {
    const body = draft.trim();
    if (!body || !activeRoomId) return;
    sendMutation.mutate(body);
  };

  return (
    <div className={embedded ? 'flex gap-4 pt-4' : 'mx-auto flex h-[calc(100vh-96px)] max-w-6xl gap-4 p-4'} style={embedded ? { height: '72vh' } : undefined}>
      {/* Room list */}
      <Card padding={false} className="flex w-64 shrink-0 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[#D6F0E8] px-4 py-3">
          <MessageCircle size={16} className="text-[#1A6B5C]" />
          <span className="text-sm font-semibold text-[#0D4035]">Chat Room</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {(rooms ?? []).map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => setActiveRoomId(room.id)}
              className={`flex w-full items-start gap-2 border-b border-[#F0F5F3] px-4 py-3 text-left transition-colors ${
                room.id === activeRoomId ? 'bg-[#EDF7F3]' : 'hover:bg-[#F7FBF8]'
              }`}
            >
              <span className="mt-0.5 text-[#1A6B5C]">{ROOM_ICON[room.kind] ?? <Hash size={14} />}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-[#0D4035]">{room.name}</span>
                  {room.isReadOnly && <Lock size={11} className="shrink-0 text-[#94A3B8]" />}
                </span>
                {room.description && (
                  <span className="mt-0.5 block truncate text-xs text-[#64748B]">{room.description}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Messages */}
      <Card padding={false} className="flex flex-1 flex-col overflow-hidden">
        {activeRoom ? (
          <>
            <div className="flex items-center justify-between border-b border-[#D6F0E8] px-5 py-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-[#0D4035]">
                  {ROOM_ICON[activeRoom.kind] ?? <Hash size={14} />} {activeRoom.name}
                  {activeRoom.isReadOnly && <Badge variant="muted" size="sm">Read-only</Badge>}
                </p>
                {activeRoom.description && <p className="text-xs text-[#64748B]">{activeRoom.description}</p>}
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {messagesLoading && <p className="text-sm text-[#94A3B8]">Loading…</p>}
              {!messagesLoading && (messages ?? []).length === 0 && (
                <p className="text-sm text-[#94A3B8]">No messages yet. Be the first to say something.</p>
              )}
              {(messages ?? []).map((m) => (
                <div key={m.id} className="group flex items-start gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D6F0E8] text-xs font-semibold text-[#145748]">
                    {m.author.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#0D4035]">{m.author.name}</span>
                      {m.isSystemMessage && <Badge variant="info" size="sm">APOTEKH</Badge>}
                      <span className="text-[11px] text-[#94A3B8]">{formatTime(m.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-[#334155]">{m.body}</p>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      title="Report"
                      onClick={() => flagMutation.mutate(m.id)}
                      className="rounded p-1 text-[#94A3B8] hover:bg-[#FEF3C7] hover:text-[#92400E]"
                    >
                      <AlertTriangle size={13} />
                    </button>
                    {canModerate && (
                      <button
                        type="button"
                        title="Remove"
                        onClick={() => removeMutation.mutate(m.id)}
                        className="rounded p-1 text-[#94A3B8] hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#D6F0E8] px-5 py-3">
              {canPost ? (
                <>
                  <div className="flex items-end gap-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Message this room…"
                      rows={1}
                      className="max-h-32 flex-1 resize-none rounded-lg border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] outline-none focus:border-[#1A6B5C]"
                    />
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!draft.trim() || sendMutation.isPending}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1A6B5C] text-white disabled:opacity-40"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#94A3B8]">
                    Never include patient names or identifying details — describe cases by age, sex, and presentation only.
                  </p>
                </>
              ) : (
                <p className="py-1 text-sm text-[#94A3B8]">
                  <Lock size={12} className="mr-1 inline" />
                  Only APOTEKH can post here — this room is for official drug alerts and recalls.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-[#94A3B8]">Loading rooms…</div>
        )}
      </Card>
    </div>
  );
};
