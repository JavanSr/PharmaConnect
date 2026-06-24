import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  BookOpen, Megaphone, Plus, Pencil, Trash2, Eye, EyeOff,
  CheckCircle2, AlertTriangle, X, ChevronDown, ChevronUp,
  Users, Clock, XCircle, Check,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  htmlContent: string | null;
  category: string;
  tags: string[];
  isPublished: boolean;
  isSponsored: boolean;
  sponsorName: string | null;
  readingTimeMinutes: number;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string } | null;
}

interface Bulletin {
  id: string;
  title: string;
  is_urgent: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

const CATEGORIES = ['DRUG_SAFETY','REGULATORY','CLINICAL','BUSINESS','TECHNOLOGY','CPD','GENERAL'] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_LABELS: Record<Category, string> = {
  DRUG_SAFETY: 'Drug Safety', REGULATORY: 'Regulatory', CLINICAL: 'Clinical',
  BUSINESS: 'Business', TECHNOLOGY: 'Technology', CPD: 'CPD', GENERAL: 'General',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default'|'success'|'warning'|'danger'|'info' }) {
  const cls = {
    default: 'bg-[#EDF7F3] text-[#1A6B5C]',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-amber-50 text-amber-700',
    danger:  'bg-red-50 text-red-700',
    info:    'bg-blue-50 text-blue-700',
  }[variant];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}>{children}</span>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-[#64748B] mb-1">{children}</label>;
}

// ── Article form ──────────────────────────────────────────────────────────────
interface ArticleFormState {
  title: string;
  summary: string;
  htmlContent: string;
  category: Category;
  tags: string;
  readingTimeMinutes: number;
  isSponsored: boolean;
  sponsorName: string;
}

const BLANK_ARTICLE: ArticleFormState = {
  title: '', summary: '', htmlContent: '', category: 'GENERAL',
  tags: '', readingTimeMinutes: 5, isSponsored: false, sponsorName: '',
};

function ArticleModal({
  article,
  onClose,
  onSaved,
}: {
  article: Article | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useNotificationStore(s => s.toast);
  const [form, setForm] = useState<ArticleFormState>(() =>
    article ? {
      title:              article.title,
      summary:            article.summary ?? '',
      htmlContent:        article.htmlContent ?? '',
      category:           article.category as Category,
      tags:               (article.tags ?? []).join(', '),
      readingTimeMinutes: article.readingTimeMinutes,
      isSponsored:        article.isSponsored,
      sponsorName:        article.sponsorName ?? '',
    } : { ...BLANK_ARTICLE }
  );
  const [saving, setSaving] = useState(false);

  const set = (k: keyof ArticleFormState, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const payload = {
        title:              form.title.trim(),
        summary:            form.summary.trim() || undefined,
        htmlContent:        form.htmlContent.trim() || undefined,
        category:           form.category,
        tags:               form.tags.split(',').map(t => t.trim()).filter(Boolean),
        readingTimeMinutes: form.readingTimeMinutes,
        isSponsored:        form.isSponsored,
        sponsorName:        form.isSponsored ? form.sponsorName.trim() || null : null,
      };
      if (article) {
        await api.patch(`/admin/knowledge/articles/${article.id}`, payload);
        toast.success('Article updated');
      } else {
        await api.post('/admin/knowledge/articles', payload);
        toast.success('Article created (unpublished)');
      }
      onSaved();
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-16 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D6F0E8] px-6 py-4">
          <h2 className="text-base font-bold text-[#0D4035]">
            {article ? 'Edit article' : 'New article'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#EDF7F3]"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="grid gap-4 p-6">
          <div>
            <Label>Title *</Label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Amoxicillin–Warfarin Interaction: What Dispensers Must Know"
              className="w-full rounded-lg border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] focus:border-[#1A6B5C] focus:outline-none"
            />
          </div>

          <div>
            <Label>Summary (shown in article card, max 500 chars)</Label>
            <textarea
              value={form.summary}
              onChange={e => set('summary', e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="One or two sentences describing the article..."
              className="w-full rounded-lg border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] focus:border-[#1A6B5C] focus:outline-none resize-none"
            />
            <p className="mt-1 text-xs text-[#64748B]">{form.summary.length}/500</p>
          </div>

          <div>
            <Label>Content (HTML supported — headings, paragraphs, lists, bold)</Label>
            <textarea
              value={form.htmlContent}
              onChange={e => set('htmlContent', e.target.value)}
              rows={14}
              placeholder={`<h2>Background</h2>\n<p>Amoxicillin is a broad-spectrum penicillin antibiotic...</p>\n<h2>Clinical significance</h2>\n<p>Co-administration with warfarin...</p>`}
              className="w-full rounded-lg border border-[#D6F0E8] bg-[#F8FAFB] px-3 py-2 font-mono text-xs text-[#0D4035] focus:border-[#1A6B5C] focus:outline-none resize-y"
            />
            <p className="mt-1 text-xs text-[#64748B]">
              Supported tags: &lt;h2&gt; &lt;h3&gt; &lt;p&gt; &lt;ul&gt; &lt;ol&gt; &lt;li&gt; &lt;strong&gt; &lt;em&gt; &lt;br&gt;.
              Scripts and iframes are stripped automatically.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value as Category)}
                className="w-full rounded-lg border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] focus:border-[#1A6B5C] focus:outline-none"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Reading time (minutes)</Label>
              <input
                type="number" min={1} max={120}
                value={form.readingTimeMinutes}
                onChange={e => set('readingTimeMinutes', Number(e.target.value))}
                className="w-full rounded-lg border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] focus:border-[#1A6B5C] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <Label>Tags (comma-separated)</Label>
            <input
              value={form.tags}
              onChange={e => set('tags', e.target.value)}
              placeholder="amoxicillin, warfarin, drug interaction, anticoagulant"
              className="w-full rounded-lg border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] focus:border-[#1A6B5C] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[#D6F0E8] bg-[#EDF7F3] p-3">
            <input
              type="checkbox"
              id="isSponsored"
              checked={form.isSponsored}
              onChange={e => set('isSponsored', e.target.checked)}
              className="h-4 w-4 accent-[#1A6B5C]"
            />
            <label htmlFor="isSponsored" className="text-sm font-medium text-[#0D4035]">
              Sponsored content
            </label>
            {form.isSponsored && (
              <input
                value={form.sponsorName}
                onChange={e => set('sponsorName', e.target.value)}
                placeholder="Sponsor name"
                className="ml-auto flex-1 rounded-lg border border-[#D6F0E8] bg-white px-3 py-1.5 text-sm text-[#0D4035] focus:border-[#1A6B5C] focus:outline-none"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#D6F0E8] px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-[#D6F0E8] px-4 py-2 text-sm font-medium text-[#64748B] hover:bg-[#EDF7F3]">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#1A6B5C] px-5 py-2 text-sm font-semibold text-white hover:bg-[#145748] disabled:opacity-50"
          >
            {saving ? 'Saving…' : article ? 'Save changes' : 'Create article'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bulletin form ─────────────────────────────────────────────────────────────
function BulletinModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const toast = useNotificationStore(s => s.toast);
  const [title, setTitle]       = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [saving, setSaving]     = useState(false);

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      await api.post('/admin/knowledge/bulletins', { title: title.trim(), isUrgent });
      toast.success('Bulletin published');
      onSaved();
    } catch {
      toast.error('Failed to create bulletin');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#D6F0E8] px-6 py-4">
          <h2 className="text-base font-bold text-[#0D4035]">New bulletin</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#EDF7F3]"><X size={16} /></button>
        </div>
        <div className="grid gap-4 p-6">
          <div>
            <Label>Bulletin text *</Label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. TMDA has updated the 2024 Essential Medicines List — see article."
              className="w-full rounded-lg border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] focus:border-[#1A6B5C] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <input
              type="checkbox" id="isUrgent" checked={isUrgent}
              onChange={e => setIsUrgent(e.target.checked)}
              className="h-4 w-4 accent-amber-600"
            />
            <label htmlFor="isUrgent" className="text-sm font-medium text-amber-900">
              Mark as urgent (shown highlighted to all users)
            </label>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[#D6F0E8] px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-[#D6F0E8] px-4 py-2 text-sm font-medium text-[#64748B] hover:bg-[#EDF7F3]">Cancel</button>
          <button
            onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#1A6B5C] px-5 py-2 text-sm font-semibold text-white hover:bg-[#145748] disabled:opacity-50"
          >
            {saving ? 'Publishing…' : 'Publish bulletin'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
type Tab = 'articles' | 'bulletins' | 'submissions';

interface Submission {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  htmlContent: string | null;
  category: string;
  submissionStatus: string;
  rejectionNote: string | null;
  authorBio: string | null;
  isPublished: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  submittedBy: { id: string; firstName: string; lastName: string; role: string; email: string };
}

export const AdminKnowledgePage: React.FC = () => {
  const qc    = useQueryClient();
  const toast = useNotificationStore(s => s.toast);
  const [tab, setTab]               = useState<Tab>('articles');
  const [articleModal, setArticleModal] = useState<Article | null | 'new'>(null);
  const [bulletinModal, setBulletinModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Queries ──
  const articlesQ = useQuery({
    queryKey: ['admin-knowledge-articles'],
    queryFn:  () => api.get('/admin/knowledge/articles').then(r => r.data.data as Article[]),
  });

  const bulletinsQ = useQuery({
    queryKey: ['admin-knowledge-bulletins'],
    queryFn:  () => api.get('/admin/knowledge/bulletins').then(r => r.data.data as Bulletin[]),
    enabled:  tab === 'bulletins',
  });

  const submissionsQ = useQuery({
    queryKey: ['admin-knowledge-submissions'],
    queryFn:  () => api.get('/admin/knowledge/submissions').then(r => r.data.data as Submission[]),
    enabled:  tab === 'submissions',
  });

  // ── Mutations ──
  const publishMut = useMutation({
    mutationFn: ({ id, publish }: { id: string; publish: boolean }) =>
      api.post(`/admin/knowledge/articles/${id}/publish`, { publish }),
    onSuccess: (_, { publish }) => {
      toast.success(publish ? 'Article published' : 'Article unpublished');
      qc.invalidateQueries({ queryKey: ['admin-knowledge-articles'] });
    },
    onError: () => toast.error('Failed to update publish status'),
  });

  const deleteArticleMut = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/knowledge/articles/${id}`),
    onSuccess: () => {
      toast.success('Article deleted');
      qc.invalidateQueries({ queryKey: ['admin-knowledge-articles'] });
    },
    onError: () => toast.error('Failed to delete article'),
  });

  const deleteBulletinMut = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/knowledge/bulletins/${id}`),
    onSuccess: () => {
      toast.success('Bulletin deleted');
      qc.invalidateQueries({ queryKey: ['admin-knowledge-bulletins'] });
    },
    onError: () => toast.error('Failed to delete bulletin'),
  });

  const onArticleSaved = () => {
    setArticleModal(null);
    qc.invalidateQueries({ queryKey: ['admin-knowledge-articles'] });
  };

  const articles    = articlesQ.data    ?? [];
  const bulletins   = bulletinsQ.data   ?? [];
  const submissions = submissionsQ.data ?? [];
  const pendingCount = submissions.filter(s => s.submissionStatus === 'PENDING_REVIEW').length;

  return (
    <>
      {/* Article modal */}
      {articleModal !== null && (
        <ArticleModal
          article={articleModal === 'new' ? null : articleModal}
          onClose={() => setArticleModal(null)}
          onSaved={onArticleSaved}
        />
      )}

      {/* Bulletin modal */}
      {bulletinModal && (
        <BulletinModal
          onClose={() => setBulletinModal(false)}
          onSaved={() => { setBulletinModal(false); qc.invalidateQueries({ queryKey: ['admin-knowledge-bulletins'] }); }}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#0D4035]">Knowledge Hub CMS</h1>
            <p className="mt-0.5 text-sm text-[#64748B]">
              Create and publish articles and bulletins for all APOTEKH OS pharmacies.
            </p>
          </div>
          {tab !== 'submissions' && (
            <button
              onClick={() => tab === 'articles' ? setArticleModal('new') : setBulletinModal(true)}
              className="flex items-center gap-2 rounded-xl bg-[#1A6B5C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#145748]"
            >
              <Plus size={15} />
              {tab === 'articles' ? 'New article' : 'New bulletin'}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-[#D6F0E8] bg-white p-1 w-fit">
          {([
            { key: 'articles',    label: 'Articles',    icon: <BookOpen size={14} />,  count: articles.length },
            { key: 'bulletins',   label: 'Bulletins',   icon: <Megaphone size={14} />, count: bulletins.length },
            { key: 'submissions', label: 'Submissions', icon: <Users size={14} />,     count: pendingCount, alert: pendingCount > 0 },
          ] as Array<{ key: Tab; label: string; icon: React.ReactNode; count: number; alert?: boolean }>).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                tab === t.key ? 'bg-[#1A6B5C] text-white' : 'text-[#64748B] hover:text-[#0D4035]'
              }`}
            >
              {t.icon}
              {t.label}
              {t.count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  tab === t.key
                    ? 'bg-white/20 text-white'
                    : t.alert
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-[#EDF7F3] text-[#1A6B5C]'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Articles ── */}
        {tab === 'articles' && (
          <div className="rounded-2xl border border-[#D6F0E8] bg-white overflow-hidden">
            {articlesQ.isLoading ? (
              <div className="p-8 text-center text-sm text-[#64748B]">Loading articles…</div>
            ) : articles.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-12 text-center">
                <BookOpen size={32} className="text-[#D6F0E8]" />
                <p className="text-sm font-medium text-[#0D4035]">No articles yet</p>
                <p className="text-xs text-[#64748B]">Create your first article to populate the Knowledge Hub.</p>
                <button
                  onClick={() => setArticleModal('new')}
                  className="mt-2 flex items-center gap-2 rounded-xl bg-[#1A6B5C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#145748]"
                >
                  <Plus size={14} /> Write first article
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="border-b border-[#D6F0E8] bg-[#F8FAFB]">
                  <tr>
                    {['Title', 'Category', 'Status', 'Views', 'Published', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#64748B]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF7F3]">
                  {articles.map(article => (
                    <React.Fragment key={article.id}>
                      <tr className="hover:bg-[#F8FAFB] transition-colors">
                        <td className="px-4 py-3 max-w-xs">
                          <button
                            onClick={() => setExpandedId(id => id === article.id ? null : article.id)}
                            className="flex items-start gap-1.5 text-left"
                          >
                            {expandedId === article.id ? <ChevronUp size={13} className="mt-0.5 shrink-0 text-[#1A6B5C]" /> : <ChevronDown size={13} className="mt-0.5 shrink-0 text-[#64748B]" />}
                            <span className="text-sm font-semibold text-[#0D4035] leading-snug">{article.title}</span>
                          </button>
                          {article.summary && (
                            <p className="mt-1 pl-5 text-xs text-[#64748B] line-clamp-1">{article.summary}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="info">{CATEGORY_LABELS[article.category as Category] ?? article.category}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {article.isPublished
                            ? <Badge variant="success"><CheckCircle2 size={10} className="mr-0.5" />Published</Badge>
                            : <Badge variant="warning">Draft</Badge>
                          }
                          {article.isSponsored && <Badge variant="warning" >Sponsored</Badge>}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">{article.viewCount}</td>
                        <td className="px-4 py-3 text-xs text-[#64748B]">
                          {article.publishedAt ? format(new Date(article.publishedAt), 'dd MMM yyyy') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              title="Edit"
                              onClick={() => setArticleModal(article)}
                              className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#EDF7F3] hover:text-[#1A6B5C]"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              title={article.isPublished ? 'Unpublish' : 'Publish'}
                              onClick={() => publishMut.mutate({ id: article.id, publish: !article.isPublished })}
                              className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#EDF7F3] hover:text-[#1A6B5C]"
                            >
                              {article.isPublished ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                            <button
                              title="Delete"
                              onClick={() => {
                                if (window.confirm(`Delete "${article.title}"? This cannot be undone.`)) {
                                  deleteArticleMut.mutate(article.id);
                                }
                              }}
                              className="rounded-lg p-1.5 text-[#64748B] hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === article.id && (
                        <tr>
                          <td colSpan={6} className="bg-[#F8FAFB] px-6 pb-4 pt-2">
                            <div className="grid grid-cols-3 gap-4 text-xs">
                              <div>
                                <p className="font-semibold text-[#0D4035] mb-1">Tags</p>
                                <p className="text-[#64748B]">{(article.tags ?? []).join(', ') || '—'}</p>
                              </div>
                              <div>
                                <p className="font-semibold text-[#0D4035] mb-1">Reading time</p>
                                <p className="text-[#64748B]">{article.readingTimeMinutes} min</p>
                              </div>
                              <div>
                                <p className="font-semibold text-[#0D4035] mb-1">Author</p>
                                <p className="text-[#64748B]">
                                  {article.author ? `${article.author.firstName} ${article.author.lastName}` : 'APOTEKH Editorial'}
                                </p>
                              </div>
                              {article.htmlContent && (
                                <div className="col-span-3">
                                  <p className="font-semibold text-[#0D4035] mb-1">Content preview</p>
                                  <div
                                    className="prose prose-sm max-w-none text-[#0D4035] opacity-70 line-clamp-3"
                                    dangerouslySetInnerHTML={{ __html: article.htmlContent.slice(0, 400) + '…' }}
                                  />
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Bulletins ── */}
        {tab === 'bulletins' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3 items-start">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Bulletins are short notices published immediately to all APOTEKH OS users.
                Urgent bulletins are highlighted in amber across the app. Use them for TMDA alerts,
                safety recalls, or important regulatory changes.
              </p>
            </div>

            {bulletinsQ.isLoading ? (
              <div className="rounded-2xl border border-[#D6F0E8] bg-white p-8 text-center text-sm text-[#64748B]">Loading bulletins…</div>
            ) : bulletins.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#D6F0E8] bg-white p-12 text-center">
                <Megaphone size={32} className="text-[#D6F0E8]" />
                <p className="text-sm font-medium text-[#0D4035]">No bulletins yet</p>
                <button
                  onClick={() => setBulletinModal(true)}
                  className="mt-2 flex items-center gap-2 rounded-xl bg-[#1A6B5C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#145748]"
                >
                  <Plus size={14} /> Post first bulletin
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#D6F0E8] bg-white overflow-hidden">
                <table className="w-full">
                  <thead className="border-b border-[#D6F0E8] bg-[#F8FAFB]">
                    <tr>
                      {['Bulletin', 'Urgency', 'Published', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#64748B]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDF7F3]">
                    {bulletins.map(b => (
                      <tr key={b.id} className="hover:bg-[#F8FAFB]">
                        <td className="px-4 py-3 text-sm font-medium text-[#0D4035]">{b.title}</td>
                        <td className="px-4 py-3">
                          {b.is_urgent
                            ? <Badge variant="warning">Urgent</Badge>
                            : <Badge>Normal</Badge>
                          }
                        </td>
                        <td className="px-4 py-3 text-xs text-[#64748B]">
                          {b.published_at ? format(new Date(b.published_at), 'dd MMM yyyy') : format(new Date(b.created_at), 'dd MMM yyyy')}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            title="Delete"
                            onClick={() => {
                              if (window.confirm('Delete this bulletin?')) deleteBulletinMut.mutate(b.id);
                            }}
                            className="rounded-lg p-1.5 text-[#64748B] hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Submissions ── */}
        {tab === 'submissions' && (
          <SubmissionsPanel
            submissions={submissions}
            isLoading={submissionsQ.isLoading}
            onRefresh={() => qc.invalidateQueries({ queryKey: ['admin-knowledge-submissions'] })}
          />
        )}
      </div>
    </>
  );
};

// ── Submissions panel ─────────────────────────────────────────────────────────
function SubmissionsPanel({
  submissions, isLoading, onRefresh,
}: {
  submissions: Submission[];
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const toast = useNotificationStore(s => s.toast);
  const [rejectId,   setRejectId]   = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [preview,    setPreview]    = useState<Submission | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('PENDING_REVIEW');

  const approveMut = useMutation({
    mutationFn: (id: string) => api.post(`/admin/knowledge/submissions/${id}/approve`),
    onSuccess: () => { toast.success('Article approved and published'); onRefresh(); },
    onError:   () => toast.error('Failed to approve'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      api.post(`/admin/knowledge/submissions/${id}/reject`, { note }),
    onSuccess: () => { toast.success('Submission returned to author'); setRejectId(null); setRejectNote(''); onRefresh(); },
    onError:   () => toast.error('Failed to reject'),
  });

  const STATUS_FILTERS = [
    { value: 'PENDING_REVIEW', label: 'Pending review' },
    { value: 'APPROVED',       label: 'Approved' },
    { value: 'REJECTED',       label: 'Returned' },
    { value: 'DRAFT',          label: 'Drafts' },
  ] as const;

  const filtered = submissions.filter(s => filterStatus === 'ALL' || s.submissionStatus === filterStatus);

  return (
    <>
      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-10 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#D6F0E8] px-6 py-4">
              <div>
                <p className="text-xs text-[#64748B] font-medium">Preview — {preview.submittedBy.firstName} {preview.submittedBy.lastName}</p>
                <h2 className="text-base font-bold text-[#0D4035]">{preview.title}</h2>
              </div>
              <button onClick={() => setPreview(null)} className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#EDF7F3]"><X size={16} /></button>
            </div>
            <div className="p-8 max-h-[70vh] overflow-y-auto">
              {preview.summary && (
                <p className="text-base text-[#64748B] mb-6 border-l-2 border-[#D6F0E8] pl-4 italic">{preview.summary}</p>
              )}
              {preview.htmlContent ? (
                <div
                  className="prose prose-sm max-w-none text-[#0D4035]"
                  dangerouslySetInnerHTML={{ __html: preview.htmlContent }}
                />
              ) : (
                <p className="text-sm text-[#64748B] italic">No article body — only summary submitted.</p>
              )}
              {preview.authorBio && (
                <div className="mt-8 pt-4 border-t border-[#D6F0E8]">
                  <p className="text-xs font-bold text-[#64748B] uppercase mb-1">About the author</p>
                  <p className="text-sm text-[#64748B]">{preview.authorBio}</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-[#D6F0E8] px-6 py-4">
              {preview.submissionStatus === 'PENDING_REVIEW' && (
                <>
                  <button
                    onClick={() => { setRejectId(preview.id); setPreview(null); }}
                    className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <XCircle size={14} /> Return to author
                  </button>
                  <button
                    onClick={() => { approveMut.mutate(preview.id); setPreview(null); }}
                    className="flex items-center gap-2 rounded-lg bg-[#1A6B5C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#145748]"
                  >
                    <Check size={14} /> Approve & publish
                  </button>
                </>
              )}
              {preview.submissionStatus !== 'PENDING_REVIEW' && (
                <button onClick={() => setPreview(null)} className="rounded-lg border border-[#D6F0E8] px-4 py-2 text-sm font-medium text-[#64748B] hover:bg-[#EDF7F3]">Close</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[#0D4035]">Return to author</h3>
            <p className="text-sm text-[#64748B]">Give the author feedback on what to improve. They'll be able to revise and resubmit.</p>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              rows={4}
              placeholder="e.g. Great idea but please remove the brand name in paragraph 3 and add a reference for the dosing claim…"
              className="w-full rounded-lg border border-[#D6F0E8] px-3 py-2 text-sm text-[#0D4035] focus:border-[#1A6B5C] focus:outline-none resize-none"
            />
            <div className="flex gap-3">
              <button onClick={() => { setRejectId(null); setRejectNote(''); }} className="flex-1 rounded-lg border border-[#D6F0E8] py-2 text-sm font-medium text-[#64748B] hover:bg-[#EDF7F3]">Cancel</button>
              <button
                onClick={() => rejectMut.mutate({ id: rejectId, note: rejectNote })}
                disabled={rejectMut.isPending}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
              >
                {rejectMut.isPending ? 'Sending…' : 'Return to author'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#64748B]">Articles written by pharmacy professionals and submitted for editorial review.</p>
          <div className="flex gap-1">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilterStatus(f.value)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  filterStatus === f.value
                    ? 'border-[#1A6B5C] bg-[#1A6B5C] text-white'
                    : 'border-[#D6F0E8] text-[#64748B] hover:border-[#1A6B5C]'
                }`}
              >
                {f.label}
                {' '}
                <span className="opacity-70">
                  ({submissions.filter(s => s.submissionStatus === f.value).length})
                </span>
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1A6B5C] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#D6F0E8] bg-white p-12 text-center">
            <Users size={32} className="text-[#D6F0E8]" />
            <p className="text-sm font-medium text-[#0D4035]">No submissions in this filter</p>
            <p className="text-xs text-[#64748B]">When pharmacists submit articles, they appear here for review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(sub => (
              <div key={sub.id} className={`rounded-2xl border p-5 ${
                sub.submissionStatus === 'PENDING_REVIEW' ? 'border-amber-200 bg-amber-50/40' : 'border-[#D6F0E8] bg-white'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {sub.submissionStatus === 'PENDING_REVIEW' && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                          <Clock size={10} /> Awaiting review
                        </span>
                      )}
                      {sub.submissionStatus === 'APPROVED' && (
                        <span className="flex items-center gap-1 rounded-full bg-[#EDF7F3] px-2.5 py-0.5 text-[11px] font-bold text-[#1A6B5C]">
                          <CheckCircle2 size={10} /> Published
                        </span>
                      )}
                      {sub.submissionStatus === 'REJECTED' && (
                        <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-600">
                          <XCircle size={10} /> Returned
                        </span>
                      )}
                      {sub.submissionStatus === 'DRAFT' && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">Draft</span>
                      )}
                      <span className="rounded-full bg-[#EDF7F3] px-2 py-0.5 text-[10px] font-bold text-[#1A6B5C] uppercase">
                        {sub.category.replace(/_/g,' ')}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#0D4035]">{sub.title}</p>
                    {sub.summary && <p className="mt-0.5 text-xs text-[#64748B] line-clamp-2">{sub.summary}</p>}
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-[#64748B]">
                      <span className="font-medium text-[#0D4035]">{sub.submittedBy.firstName} {sub.submittedBy.lastName}</span>
                      <span>·</span>
                      <span>{sub.submittedBy.role.replace(/_/g,' ')}</span>
                      <span>·</span>
                      <span>{sub.submittedBy.email}</span>
                      <span>·</span>
                      <span>Submitted {format(new Date(sub.updatedAt), 'dd MMM yyyy')}</span>
                    </div>
                    {sub.rejectionNote && (
                      <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5">
                        <p className="text-xs text-red-700"><span className="font-semibold">Your feedback: </span>{sub.rejectionNote}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setPreview(sub)}
                      className="flex items-center gap-1 rounded-lg border border-[#D6F0E8] px-3 py-1.5 text-xs font-medium text-[#64748B] hover:bg-[#EDF7F3]"
                    >
                      <Eye size={12} /> Read
                    </button>
                    {sub.submissionStatus === 'PENDING_REVIEW' && (
                      <>
                        <button
                          onClick={() => setRejectId(sub.id)}
                          className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          <XCircle size={12} /> Return
                        </button>
                        <button
                          onClick={() => approveMut.mutate(sub.id)}
                          disabled={approveMut.isPending}
                          className="flex items-center gap-1 rounded-lg bg-[#1A6B5C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#145748] disabled:opacity-40"
                        >
                          <Check size={12} /> Approve
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
