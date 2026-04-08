import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Eye, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

function renderBody(body: any): string {
  if (!body || !body.content) return '';
  return body.content.map((node: any) => {
    if (node.type === 'paragraph' && node.content) {
      return '<p>' + node.content.map((c: any) => c.text || '').join('') + '</p>';
    }
    if (node.type === 'heading') {
      const level = node.attrs?.level || 2;
      const text = (node.content || []).map((c: any) => c.text || '').join('');
      return `<h${level}>${text}</h${level}>`;
    }
    return '';
  }).join('\n');
}

export const ArticlePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [cpdModal, setCpdModal] = useState(false);
  const toast = useNotificationStore(s => s.toast);
  const { canAccess } = useAuth();
  const canLogCpd = canAccess('cpd');

  const { data, isLoading } = useQuery({
    queryKey: ['article', slug],
    queryFn: () => api.get(`/knowledge/articles/${slug}`).then(r => r.data),
  });

  useEffect(() => {
    const handleScroll = () => {
      const el = document.documentElement;
      const progress = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
      setScrollProgress(Math.min(100, progress));
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const logCpdMutation = useMutation({
    mutationFn: () => api.post('/cpd/activities', {
      activityType: 'READING',
      title: article?.title || 'Article reading',
      activityDate: new Date().toISOString(),
      pointsClaimed: 1,
      sourceArticleId: article?.id,
    }),
    onSuccess: () => { toast.success('1 CPD point logged!'); setCpdModal(false); },
    onError: () => toast.error('Failed to log CPD point'),
  });

  const article = data?.data;

  if (isLoading) return <div className="p-8 text-center text-[#64748B]">Loading article...</div>;
  if (!article) return <div className="p-8 text-center text-[#DC2626]">Article not found</div>;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Reading progress bar */}
      <div className="fixed top-14 left-0 right-0 h-1 bg-[#D6F0E8] z-20">
        <div className="h-full bg-[#1A6B5C] transition-all duration-100" style={{ width: `${scrollProgress}%` }} />
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/knowledge" className="p-2 rounded-xl hover:bg-[#D6F0E8] text-[#64748B]"><ArrowLeft size={18} /></Link>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="info">{article.category.replace(/_/g, ' ')}</Badge>
            {article.isSponsored && <Badge variant="sponsored">SPONSORED — {article.sponsorName}</Badge>}
          </div>
          <h1 className="text-2xl font-bold text-[#0D4035] mb-3">{article.title}</h1>
          <div className="flex items-center gap-4 text-sm text-[#64748B]">
            {article.author && <span>By {article.author.firstName} {article.author.lastName}</span>}
            {article.publishedAt && <span>{format(new Date(article.publishedAt), 'dd MMMM yyyy')}</span>}
            <div className="flex items-center gap-1"><Clock size={14} /><span>{article.readingTimeMinutes} min read</span></div>
            <div className="flex items-center gap-1"><Eye size={14} /><span>{article.viewCount} views</span></div>
          </div>
        </div>

        {/* Body */}
        <div
          className="prose prose-sm max-w-none text-[#0D4035] [&_p]:mb-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3"
          dangerouslySetInnerHTML={{ __html: renderBody(article.body) }}
        />

        {/* CPD button */}
        {canLogCpd && (
          <div className="border-t border-[#D6F0E8] pt-5">
            <div className="flex items-center gap-3 p-4 bg-[#EDF7F3] rounded-xl">
              <GraduationCap size={20} className="text-[#1A6B5C]" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[#0D4035]">Earn 1 CPD Point</p>
                <p className="text-xs text-[#64748B]">Log this article as a reading activity</p>
              </div>
              <Button size="sm" onClick={() => setCpdModal(true)}>Log CPD</Button>
            </div>
          </div>
        )}

        {/* Tags */}
        {article.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {article.tags.map((t: string) => <Badge key={t} variant="muted" size="sm">#{t}</Badge>)}
          </div>
        )}
      </div>

      <Modal isOpen={canLogCpd && cpdModal} onClose={() => setCpdModal(false)} title="Log CPD Activity"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setCpdModal(false)}>Cancel</Button>
            <Button onClick={() => logCpdMutation.mutate()} loading={logCpdMutation.isPending}>Log 1 CPD Point</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[#64748B]">Log reading <strong>"{article.title}"</strong> as a CPD activity for 1 point.</p>
          <div className="p-3 bg-[#EDF7F3] rounded-xl">
            <p className="text-xs text-[#64748B]">Activity type: Reading</p>
            <p className="text-xs text-[#64748B]">Points: 1</p>
            <p className="text-xs text-[#64748B]">Date: Today</p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
