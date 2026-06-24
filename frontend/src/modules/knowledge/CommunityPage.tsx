import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import {
  MessageSquare, Plus, ChevronLeft, Send, Pencil, Trash2,
  Pin, Lock, Tag, X, AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ThreadAuthor {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Thread {
  id: string;
  title: string;
  body: string;
  category: string;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  replyCount: number;
  author: ThreadAuthor;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  body: string;
  isEdited: boolean;
  author: ThreadAuthor;
  createdAt: string;
  updatedAt: string;
}

interface ThreadDetail extends Thread {
  messages: Message[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CHAT_CATEGORIES = [
  { value: 'GENERAL',    label: 'General',         color: 'bg-[#EDF7F3] text-[#1A6B5C]' },
  { value: 'DRUG_SAFETY', label: 'Drug Safety',    color: 'bg-red-50 text-red-700' },
  { value: 'CLINICAL',   label: 'Clinical',         color: 'bg-blue-50 text-blue-700' },
  { value: 'REGULATORY', label: 'Regulatory',       color: 'bg-purple-50 text-purple-700' },
  { value: 'DISPENSING', label: 'Dispensing',       color: 'bg-amber-50 text-amber-700' },
  { value: 'BUSINESS',   label: 'Business',         color: 'bg-slate-50 text-slate-700' },
] as const;

type ChatCategory = typeof CHAT_CATEGORIES[number]['value'];

const catMeta = (value: string) =>
  CHAT_CATEGORIES.find(c => c.value === value) ?? CHAT_CATEGORIES[0];

const roleLabel = (role: string) => {
  const map: Record<string, string> = {
    OWNER: 'Owner', PHARMACIST_IN_CHARGE: 'Pharmacist-in-Charge',
    DISPENSER: 'Dispenser', SUPER_ADMIN: 'APOTEKH',
    CASHIER: 'Cashier', DATA_ENTRY_CLERK: 'Data Entry',
    WHOLESALE_MANAGER: 'Wholesale Manager',
  };
  return map[role] ?? role;
};

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ author, size = 'md' }: { author: ThreadAuthor; size?: 'sm' | 'md' }) {
  const initials = `${author.firstName[0]}${author.lastName[0]}`.toUpperCase();
  const isAdmin  = author.role === 'SUPER_ADMIN';
  const dim      = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';
  return (
    <div className={`${dim} rounded-full flex items-center justify-center font-bold shrink-0 ${
      isAdmin ? 'bg-[#E8A020] text-white' : 'bg-[#1A6B5C] text-white'
    }`}>
      {initials}
    </div>
  );
}

// ── Category badge ────────────────────────────────────────────────────────────
function CatBadge({ value }: { value: string }) {
  const meta = catMeta(value);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.color}`}>
      <Tag size={9} /> {meta.label}
    </span>
  );
}

// ── New thread modal ──────────────────────────────────────────────────────────
function NewThreadModal({ onClose, onCreated }: { onClose: () => void; onCreated: (t: Thread) => void }) {
  const toast = useNotificationStore(s => s.toast);
  const [title, setTitle]       = useState('');
  const [body, setBody]         = useState('');
  const [category, setCategory] = useState<ChatCategory>('GENERAL');
  const [saving, setSaving]     = useState(false);

  const handleSubmit = async () => {
    if (title.trim().length < 5) { toast.error('Title must be at least 5 characters'); return; }
    if (body.trim().length < 10) { toast.error('Question must be at least 10 characters'); return; }
    setSaving(true);
    try {
      const { data } = await api.post('/knowledge/chat/threads', {
        title: title.trim(), body: body.trim(), category,
      });
      toast.success('Discussion started');
      onCreated(data.data);
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Failed to post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-16 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#D6F0E8] px-6 py-4">
          <h2 className="text-base font-bold text-[#0D4035]">Start a discussion</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#EDF7F3]"><X size={16} /></button>
        </div>
        <div className="grid gap-4 p-6">
          <div className="rounded-xl border border-[#D6F0E8] bg-[#EDF7F3] px-4 py-3 flex gap-2 items-start">
            <AlertTriangle size={14} className="text-[#1A6B5C] shrink-0 mt-0.5" />
            <p className="text-xs text-[#1A6B5C]">
              This community is for verified pharmacy professionals within your APOTEKH network.
              Clinical advice shared here does not replace a pharmacist's professional judgement.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1">Category</label>
            <div className="flex flex-wrap gap-2">
              {CHAT_CATEGORIES.map(c => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value as ChatCategory)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
                    category === c.value
                      ? 'border-[#1A6B5C] bg-[#1A6B5C] text-white'
                      : 'border-[#D6F0E8] text-[#64748B] hover:border-[#1A6B5C]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1">Title / Question *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Child with fever — safe to give paracetamol with amoxicillin?"
              className="w-full rounded-lg border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] focus:border-[#1A6B5C] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1">Details *</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={5}
              placeholder="Describe the situation, patient details (no names), what you've tried, what you need help with..."
              className="w-full rounded-lg border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] focus:border-[#1A6B5C] focus:outline-none resize-none"
            />
            <p className="mt-1 text-xs text-[#64748B]">{body.length}/2000</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[#D6F0E8] px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-[#D6F0E8] px-4 py-2 text-sm font-medium text-[#64748B] hover:bg-[#EDF7F3]">Cancel</button>
          <button
            onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#1A6B5C] px-5 py-2 text-sm font-semibold text-white hover:bg-[#145748] disabled:opacity-50"
          >
            {saving ? 'Posting…' : 'Post discussion'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Thread detail view ────────────────────────────────────────────────────────
function ThreadView({ threadId, onBack }: { threadId: string; onBack: () => void }) {
  const user  = useAuthStore(s => s.user);
  const toast = useNotificationStore(s => s.toast);
  const qc    = useQueryClient();

  const [reply, setReply]         = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody]   = useState('');
  const [sending, setSending]     = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['chat-thread', threadId],
    queryFn:  () => api.get(`/knowledge/chat/threads/${threadId}`).then(r => r.data.data as ThreadDetail),
    refetchInterval: 15_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['chat-thread', threadId] });

  const sendReply = async () => {
    if (reply.trim().length < 2) return;
    setSending(true);
    try {
      await api.post(`/knowledge/chat/threads/${threadId}/messages`, { body: reply.trim() });
      setReply('');
      invalidate();
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const saveEdit = async (messageId: string) => {
    if (editBody.trim().length < 2) return;
    try {
      await api.patch(`/knowledge/chat/threads/${threadId}/messages/${messageId}`, { body: editBody.trim() });
      setEditingId(null);
      invalidate();
    } catch {
      toast.error('Failed to edit message');
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await api.delete(`/knowledge/chat/threads/${threadId}/messages/${messageId}`);
      invalidate();
    } catch {
      toast.error('Failed to delete message');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1A6B5C] border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-[#1A6B5C] hover:text-[#0D4035]">
        <ChevronLeft size={15} /> Back to community
      </button>

      {/* Thread header */}
      <div className="rounded-2xl border border-[#D6F0E8] bg-white p-6">
        <div className="flex items-start gap-3">
          <Avatar author={data.author} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <CatBadge value={data.category} />
              {data.isPinned && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-[#1A6B5C] uppercase">
                  <Pin size={9} /> Pinned
                </span>
              )}
              {data.isLocked && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 uppercase">
                  <Lock size={9} /> Locked
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-[#0D4035] leading-snug mb-3">{data.title}</h2>
            <p className="text-sm text-[#0D4035] whitespace-pre-wrap leading-relaxed">{data.body}</p>
            <div className="mt-4 flex items-center gap-3 text-xs text-[#64748B]">
              <span className="font-medium text-[#0D4035]">{data.author.firstName} {data.author.lastName}</span>
              <span>·</span>
              <span>{roleLabel(data.author.role)}</span>
              <span>·</span>
              <span title={format(new Date(data.createdAt), 'PPpp')}>
                {formatDistanceToNow(new Date(data.createdAt), { addSuffix: true })}
              </span>
              <span>·</span>
              <span>{data.viewCount} view{data.viewCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {data.messages.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-[#64748B]">
            {data.messages.length} {data.messages.length === 1 ? 'Reply' : 'Replies'}
          </p>
          {data.messages.map(msg => (
            <div key={msg.id} className={`rounded-2xl border p-4 ${
              msg.author.role === 'SUPER_ADMIN'
                ? 'border-amber-200 bg-amber-50'
                : 'border-[#D6F0E8] bg-white'
            }`}>
              <div className="flex items-start gap-3">
                <Avatar author={msg.author} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#0D4035]">
                        {msg.author.firstName} {msg.author.lastName}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[#64748B]">
                        {roleLabel(msg.author.role)}
                      </span>
                      {msg.author.role === 'SUPER_ADMIN' && (
                        <span className="rounded-full bg-[#E8A020] px-2 py-0.5 text-[9px] font-bold text-white uppercase">APOTEKH</span>
                      )}
                      {msg.isEdited && (
                        <span className="text-[10px] text-[#64748B] italic">(edited)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-[#64748B]" title={format(new Date(msg.createdAt), 'PPpp')}>
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </span>
                      {msg.author.id === user?.id && editingId !== msg.id && (
                        <>
                          <button
                            onClick={() => { setEditingId(msg.id); setEditBody(msg.body); }}
                            className="rounded p-1 text-[#64748B] hover:bg-[#EDF7F3] hover:text-[#1A6B5C]"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            className="rounded p-1 text-[#64748B] hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={11} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {editingId === msg.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editBody}
                        onChange={e => setEditBody(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] focus:border-[#1A6B5C] focus:outline-none resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(msg.id)}
                          className="rounded-lg bg-[#1A6B5C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#145748]"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-[#D6F0E8] px-3 py-1.5 text-xs font-medium text-[#64748B] hover:bg-[#EDF7F3]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[#0D4035] whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply box */}
      {!data.isLocked ? (
        <div className="rounded-2xl border border-[#D6F0E8] bg-white p-4">
          <p className="text-xs font-semibold text-[#64748B] mb-3">Add your reply</p>
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            rows={4}
            placeholder="Share your knowledge, experience, or ask a follow-up question…"
            className="w-full rounded-lg border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] focus:border-[#1A6B5C] focus:outline-none resize-none"
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply(); }}
          />
          <div className="flex items-center justify-between mt-3">
            <p className="text-[10px] text-[#64748B]">Cmd/Ctrl + Enter to send</p>
            <button
              onClick={sendReply}
              disabled={sending || reply.trim().length < 2}
              className="flex items-center gap-2 rounded-lg bg-[#1A6B5C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#145748] disabled:opacity-40"
            >
              <Send size={13} /> {sending ? 'Sending…' : 'Post reply'}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-2">
          <Lock size={14} className="text-amber-600" />
          <p className="text-sm text-amber-800 font-medium">This thread is locked and no longer accepting replies.</p>
        </div>
      )}
    </div>
  );
}

// ── Thread list ───────────────────────────────────────────────────────────────
export const CommunityPage: React.FC = () => {
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [showNewThread, setShowNewThread]   = useState(false);
  const [filterCat, setFilterCat]           = useState<string>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['chat-threads', filterCat],
    queryFn: () => api.get('/knowledge/chat/threads', {
      params: { category: filterCat === 'ALL' ? undefined : filterCat, limit: 30 },
    }).then(r => r.data.data as Thread[]),
  });

  const threads = data ?? [];

  if (selectedThread) {
    return <ThreadView threadId={selectedThread} onBack={() => setSelectedThread(null)} />;
  }

  return (
    <>
      {showNewThread && (
        <NewThreadModal
          onClose={() => setShowNewThread(false)}
          onCreated={t => { setShowNewThread(false); setSelectedThread(t.id); }}
        />
      )}

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0D4035]">Community Discussions</h2>
            <p className="text-sm text-[#64748B]">
              Ask questions and share knowledge with dispensers and pharmacists in your network.
            </p>
          </div>
          <button
            onClick={() => setShowNewThread(true)}
            className="flex items-center gap-2 rounded-xl bg-[#1A6B5C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#145748]"
          >
            <Plus size={14} /> Start discussion
          </button>
        </div>

        {/* Notice */}
        <div className="rounded-xl border border-[#D6F0E8] bg-[#EDF7F3] px-4 py-3 flex gap-2 items-start">
          <MessageSquare size={14} className="text-[#1A6B5C] shrink-0 mt-0.5" />
          <p className="text-xs text-[#1A6B5C]">
            This is a professional discussion space for APOTEKH-verified pharmacy staff.
            All participants are licensed dispensers, pharmacists, or pharmacy owners.
            Do not share patient-identifying information.
          </p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCat('ALL')}
            className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
              filterCat === 'ALL'
                ? 'border-[#1A6B5C] bg-[#1A6B5C] text-white'
                : 'border-[#D6F0E8] text-[#64748B] hover:border-[#1A6B5C]'
            }`}
          >
            All topics
          </button>
          {CHAT_CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setFilterCat(c.value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
                filterCat === c.value
                  ? 'border-[#1A6B5C] bg-[#1A6B5C] text-white'
                  : 'border-[#D6F0E8] text-[#64748B] hover:border-[#1A6B5C]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Thread list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1A6B5C] border-t-transparent" />
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#D6F0E8] bg-white py-16 text-center">
            <MessageSquare size={36} className="text-[#D6F0E8]" />
            <div>
              <p className="text-sm font-semibold text-[#0D4035]">No discussions yet</p>
              <p className="text-xs text-[#64748B] mt-1">Be the first to start a discussion in your pharmacy network.</p>
            </div>
            <button
              onClick={() => setShowNewThread(true)}
              className="flex items-center gap-2 rounded-xl bg-[#1A6B5C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#145748]"
            >
              <Plus size={14} /> Start first discussion
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#EDF7F3] rounded-2xl border border-[#D6F0E8] bg-white overflow-hidden">
            {threads.map(thread => (
              <button
                key={thread.id}
                onClick={() => setSelectedThread(thread.id)}
                className="w-full text-left px-5 py-4 hover:bg-[#F8FAFB] transition-colors"
              >
                <div className="flex items-start gap-4">
                  <Avatar author={thread.author} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <CatBadge value={thread.category} />
                      {thread.isPinned && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-[#1A6B5C] uppercase">
                          <Pin size={9} /> Pinned
                        </span>
                      )}
                      {thread.isLocked && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 uppercase">
                          <Lock size={9} /> Locked
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-[#0D4035] leading-snug mb-1">{thread.title}</p>
                    <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed">{thread.body}</p>
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-[#64748B]">
                      <span className="font-medium">{thread.author.firstName} {thread.author.lastName}</span>
                      <span>·</span>
                      <span>{roleLabel(thread.author.role)}</span>
                      <span>·</span>
                      <span title={format(new Date(thread.updatedAt), 'PPpp')}>
                        {formatDistanceToNow(new Date(thread.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-center gap-1 text-center">
                    <div className="flex items-center gap-1 text-[#1A6B5C]">
                      <MessageSquare size={13} />
                      <span className="text-sm font-bold text-[#0D4035]">{thread.replyCount}</span>
                    </div>
                    <span className="text-[9px] text-[#64748B] uppercase font-bold">
                      {thread.replyCount === 1 ? 'reply' : 'replies'}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
