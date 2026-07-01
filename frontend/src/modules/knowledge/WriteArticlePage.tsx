import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle, Clock, Edit3, Eye, FileText,
  Plus, Send, Trash2, XCircle, AlertTriangle, RotateCcw,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import DOMPurify from 'dompurify';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';

// ── Types ─────────────────────────────────────────────────────────────────────
type SubmissionStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

interface Submission {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  htmlContent?: string;
  category: string;
  submissionStatus: SubmissionStatus;
  rejectionNote?: string;
  authorBio?: string;
  isPublished: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = ['GENERAL','DRUG_SAFETY','REGULATORY','CLINICAL','BUSINESS','TECHNOLOGY','CPD'] as const;
type Category = typeof CATEGORIES[number];

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_META: Record<SubmissionStatus, { label: string; icon: React.ReactNode; color: string }> = {
  DRAFT:          { label: 'Draft',         icon: <Edit3 size={12} />,       color: 'bg-slate-100 text-slate-700' },
  PENDING_REVIEW: { label: 'Under review',  icon: <Clock size={12} />,       color: 'bg-amber-50 text-amber-700' },
  APPROVED:       { label: 'Published',     icon: <CheckCircle size={12} />, color: 'bg-[#EDF7F3] text-[#1A6B5C]' },
  REJECTED:       { label: 'Needs revision',icon: <XCircle size={12} />,     color: 'bg-red-50 text-red-700' },
};

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.color}`}>
      {meta.icon} {meta.label}
    </span>
  );
}

// ── Article editor ────────────────────────────────────────────────────────────
function ArticleEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Submission;
  onSave: (saved: Submission) => void;
  onCancel: () => void;
}) {
  const toast  = useNotificationStore(s => s.toast);
  const isEdit = Boolean(initial?.id);

  const [title,    setTitle]    = useState(initial?.title    ?? '');
  const [summary,  setSummary]  = useState(initial?.summary  ?? '');
  const [content,  setContent]  = useState(initial?.htmlContent ?? '');
  const [category, setCategory] = useState<Category>((initial?.category as Category) ?? 'GENERAL');
  const [bio,      setBio]      = useState(initial?.authorBio ?? '');
  const [saving,   setSaving]   = useState(false);
  const [preview,  setPreview]  = useState(false);

  const canSubmit = title.trim().length >= 5 && (content.trim().length >= 50 || summary.trim().length >= 20);

  const save = async (andSubmit = false) => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const payload = { title: title.trim(), summary: summary.trim(), htmlContent: content.trim(), category, authorBio: bio.trim() };
      let article: Submission;
      if (isEdit && initial) {
        const { data } = await api.patch(`/knowledge/submissions/${initial.id}`, payload);
        article = data.data;
      } else {
        const { data } = await api.post('/knowledge/submissions', payload);
        article = data.data;
      }
      if (andSubmit) {
        const { data } = await api.post(`/knowledge/submissions/${article.id}/submit`);
        article = data.data;
        toast.success('Article submitted for review!');
      } else {
        toast.success('Draft saved');
      }
      onSave(article);
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onCancel} className="flex items-center gap-1.5 text-sm font-medium text-[#1A6B5C] hover:text-[#0D4035]">
          <ArrowLeft size={15} /> Back to my articles
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreview(p => !p)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              preview ? 'border-[#1A6B5C] bg-[#EDF7F3] text-[#1A6B5C]' : 'border-[#D6F0E8] text-[#64748B] hover:bg-[#EDF7F3]'
            }`}
          >
            <Eye size={13} /> {preview ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="rounded-lg border border-[#D6F0E8] px-3 py-1.5 text-xs font-medium text-[#64748B] hover:bg-[#EDF7F3] disabled:opacity-40"
          >
            Save draft
          </button>
          <button
            onClick={() => save(true)}
            disabled={saving || !canSubmit}
            className="flex items-center gap-1.5 rounded-lg bg-[#1A6B5C] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#145748] disabled:opacity-40"
          >
            <Send size={12} /> {saving ? 'Saving…' : 'Submit for review'}
          </button>
        </div>
      </div>

      {/* Guidelines */}
      <div className="rounded-xl border border-[#D6F0E8] bg-[#EDF7F3] px-4 py-3">
        <p className="text-xs font-semibold text-[#1A6B5C] mb-1">Writing guidelines</p>
        <ul className="text-xs text-[#1A6B5C] space-y-0.5">
          <li>· Share clinical observations, operational tips, or regulatory insights from your real work</li>
          <li>· Do not include patient names or identifying information</li>
          <li>· Articles are reviewed before publishing — usually within 2 business days</li>
          <li>· Your name and role will appear as the author if approved</li>
        </ul>
      </div>

      {preview ? (
        /* Preview */
        <div className="rounded-2xl border border-[#D6F0E8] bg-white p-8 max-w-3xl">
          <div className="mb-2">
            <span className="rounded-full bg-[#EDF7F3] px-2.5 py-0.5 text-[10px] font-bold text-[#1A6B5C] uppercase">{category.replace(/_/g,' ')}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0D4035] leading-tight mb-3">{title || 'Untitled'}</h1>
          {summary && <p className="text-base text-[#64748B] leading-relaxed mb-6 border-l-2 border-[#D6F0E8] pl-4 italic">{summary}</p>}
          {content ? (
            <div
              className="prose prose-sm max-w-none text-[#0D4035] prose-headings:text-[#0D4035] prose-a:text-[#1A6B5C]"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
            />
          ) : (
            <p className="text-sm text-[#64748B] italic">No content yet — switch back to edit to write your article body.</p>
          )}
          {bio && (
            <div className="mt-8 pt-4 border-t border-[#D6F0E8]">
              <p className="text-xs font-bold text-[#64748B] uppercase mb-1">About the author</p>
              <p className="text-sm text-[#64748B]">{bio}</p>
            </div>
          )}
        </div>
      ) : (
        /* Edit form */
        <div className="grid gap-4 max-w-3xl">
          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    category === c
                      ? 'border-[#1A6B5C] bg-[#1A6B5C] text-white'
                      : 'border-[#D6F0E8] text-[#64748B] hover:border-[#1A6B5C]'
                  }`}
                >
                  {c.replace(/_/g,' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1">Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. What I've learned dispensing ARVs in a high-volume ADDO"
              className="w-full rounded-lg border border-[#D6F0E8] px-3 py-2.5 text-sm text-[#0D4035] focus:border-[#1A6B5C] focus:outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1">
              Summary / Lede <span className="text-[#AFDFD3] font-normal">(shown in the feed card)</span>
            </label>
            <textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="One or two sentences that capture the key insight of your article…"
              className="w-full rounded-lg border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] focus:border-[#1A6B5C] focus:outline-none resize-none"
            />
            <p className="mt-0.5 text-xs text-[#64748B]">{summary.length}/500</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#64748B]">Article body</label>
              <span className="text-[10px] text-[#64748B]">Supports HTML — <code className="bg-[#EDF7F3] px-1 rounded">&lt;h2&gt; &lt;p&gt; &lt;ul&gt; &lt;strong&gt; &lt;em&gt; &lt;blockquote&gt;</code></span>
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={16}
              placeholder={'<h2>Introduction</h2>\n<p>Start writing your article here…</p>\n\n<h2>What I observed</h2>\n<p>…</p>'}
              className="w-full rounded-lg border border-[#D6F0E8] px-3 py-2 text-sm font-mono text-[#0D4035] focus:border-[#1A6B5C] focus:outline-none resize-y"
            />
            <p className="mt-0.5 text-xs text-[#64748B]">
              Tip: Use the Preview button above to see how your article will look when published.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1">
              Author bio <span className="text-[#AFDFD3] font-normal">(optional — shown at end of article)</span>
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="e.g. Dispenser at Upendo Pharmacy, Arusha. 6 years in retail dispensing."
              className="w-full rounded-lg border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] focus:border-[#1A6B5C] focus:outline-none resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── My Articles list ──────────────────────────────────────────────────────────
export const WriteArticlePage: React.FC = () => {
  const toast = useNotificationStore(s => s.toast);
  const qc    = useQueryClient();
  const [view,    setView]    = useState<'list' | 'new' | 'edit'>('list');
  const [editing, setEditing] = useState<Submission | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['my-submissions'],
    queryFn:  () => api.get('/knowledge/submissions').then(r => r.data.data as Submission[]),
  });

  const submissions = data ?? [];
  const pending = submissions.filter(s => s.submissionStatus === 'PENDING_REVIEW').length;

  const afterSave = (saved: Submission) => {
    qc.invalidateQueries({ queryKey: ['my-submissions'] });
    setEditing(saved);
    setView('edit');
  };

  const withdraw = async (id: string) => {
    try {
      await api.post(`/knowledge/submissions/${id}/withdraw`);
      qc.invalidateQueries({ queryKey: ['my-submissions'] });
      toast.success('Withdrawn — you can now edit your draft');
    } catch {
      toast.error('Failed to withdraw');
    }
  };

  const deleteDraft = async (id: string) => {
    if (!window.confirm('Delete this draft?')) return;
    try {
      await api.delete(`/knowledge/submissions/${id}`);
      qc.invalidateQueries({ queryKey: ['my-submissions'] });
    } catch {
      toast.error('Failed to delete');
    }
  };

  const submitNow = async (id: string) => {
    try {
      await api.post(`/knowledge/submissions/${id}/submit`);
      qc.invalidateQueries({ queryKey: ['my-submissions'] });
      toast.success('Submitted for review!');
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Failed to submit');
    }
  };

  if (view === 'new') {
    return <ArticleEditor onSave={afterSave} onCancel={() => setView('list')} />;
  }
  if (view === 'edit' && editing) {
    return (
      <ArticleEditor
        initial={editing}
        onSave={afterSave}
        onCancel={() => { setEditing(undefined); setView('list'); }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#0D4035]">My Articles</h2>
          <p className="text-sm text-[#64748B]">Write and share your knowledge with the APOTEKH professional community.</p>
        </div>
        <button
          onClick={() => setView('new')}
          className="flex items-center gap-2 rounded-xl bg-[#1A6B5C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#145748]"
        >
          <Plus size={14} /> Write article
        </button>
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-[#D6F0E8] bg-[#EDF7F3] p-4">
        <p className="text-xs font-bold text-[#1A6B5C] mb-2">How it works</p>
        <div className="flex items-center gap-0 text-xs text-[#1A6B5C]">
          {[
            ['✍️', 'Write your draft'],
            ['→', null],
            ['📤', 'Submit for review'],
            ['→', null],
            ['✅', 'Published to Knowledge Hub with your name'],
          ].map(([icon, arrow], i) =>
            arrow === null ? (
              <span key={i} className="mx-2 text-[#AFDFD3]">→</span>
            ) : (
              <span key={i} className="flex items-center gap-1 font-medium">
                <span>{icon}</span> {arrow}
              </span>
            )
          )}
        </div>
      </div>

      {/* Pending notice */}
      {pending > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Clock size={14} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            You have {pending} article{pending > 1 ? 's' : ''} under review. We'll notify you once they're processed.
          </p>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1A6B5C] border-t-transparent" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#D6F0E8] bg-white py-16 text-center">
          <FileText size={36} className="text-[#D6F0E8]" />
          <div>
            <p className="text-sm font-semibold text-[#0D4035]">You haven't written anything yet</p>
            <p className="text-xs text-[#64748B] mt-1">
              Share a clinical observation, a dispensing tip, or a regulatory insight from your work.
            </p>
          </div>
          <button
            onClick={() => setView('new')}
            className="flex items-center gap-2 rounded-xl bg-[#1A6B5C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#145748]"
          >
            <Plus size={14} /> Write your first article
          </button>
        </div>
      ) : (
        <div className="divide-y divide-[#EDF7F3] rounded-2xl border border-[#D6F0E8] bg-white overflow-hidden">
          {submissions.map(sub => (
            <div key={sub.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <StatusBadge status={sub.submissionStatus} />
                    <span className="rounded-full bg-[#EDF7F3] px-2 py-0.5 text-[10px] font-bold text-[#1A6B5C] uppercase">
                      {sub.category.replace(/_/g,' ')}
                    </span>
                    {sub.isPublished && (
                      <span className="flex items-center gap-1 text-[10px] text-[#64748B]">
                        <Eye size={9} /> {sub.viewCount} views
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-[#0D4035] leading-snug">{sub.title}</p>
                  {sub.summary && <p className="mt-0.5 text-xs text-[#64748B] line-clamp-2">{sub.summary}</p>}

                  {/* Rejection feedback */}
                  {sub.submissionStatus === 'REJECTED' && sub.rejectionNote && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                      <AlertTriangle size={12} className="text-red-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700"><span className="font-semibold">Feedback: </span>{sub.rejectionNote}</p>
                    </div>
                  )}

                  <p className="mt-2 text-[10px] text-[#64748B]">
                    Updated {formatDistanceToNow(new Date(sub.updatedAt), { addSuffix: true })}
                    {sub.isPublished && ' · Published'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {(sub.submissionStatus === 'DRAFT' || sub.submissionStatus === 'REJECTED') && (
                    <>
                      <button
                        onClick={() => { setEditing(sub); setView('edit'); }}
                        className="flex items-center gap-1 rounded-lg border border-[#D6F0E8] px-3 py-1.5 text-xs font-medium text-[#64748B] hover:bg-[#EDF7F3]"
                      >
                        <Edit3 size={11} /> Edit
                      </button>
                      <button
                        onClick={() => submitNow(sub.id)}
                        className="flex items-center gap-1 rounded-lg bg-[#1A6B5C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#145748]"
                      >
                        <Send size={11} /> Submit
                      </button>
                      <button
                        onClick={() => deleteDraft(sub.id)}
                        className="rounded-lg p-1.5 text-[#64748B] hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                  {sub.submissionStatus === 'PENDING_REVIEW' && (
                    <button
                      onClick={() => withdraw(sub.id)}
                      className="flex items-center gap-1 rounded-lg border border-[#D6F0E8] px-3 py-1.5 text-xs font-medium text-[#64748B] hover:bg-[#EDF7F3]"
                    >
                      <RotateCcw size={11} /> Withdraw
                    </button>
                  )}
                  {sub.submissionStatus === 'APPROVED' && sub.isPublished && (
                    <a
                      href={`/knowledge/${sub.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 rounded-lg border border-[#D6F0E8] px-3 py-1.5 text-xs font-medium text-[#1A6B5C] hover:bg-[#EDF7F3]"
                    >
                      <Eye size={11} /> View published
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
