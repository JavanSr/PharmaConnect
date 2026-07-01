import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Eye, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

function renderBody(body: any): string {
  if (!body || !body.content) return '';
  return body.content.map((node: any) => {
    if (node.type === 'paragraph' && node.content) {
      return '<p>' + node.content.map((contentNode: any) => contentNode.text || '').join('') + '</p>';
    }
    if (node.type === 'heading') {
      const level = node.attrs?.level || 2;
      const text = (node.content || []).map((contentNode: any) => contentNode.text || '').join('');
      return `<h${level}>${text}</h${level}>`;
    }
    return '';
  }).join('\n');
}

export const ArticlePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [scrollProgress, setScrollProgress] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['article', slug],
    queryFn: () => api.get(`/knowledge/articles/${slug}`).then(response => response.data),
  });

  useEffect(() => {
    const handleScroll = () => {
      const element = document.documentElement;
      const progress = (element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100;
      setScrollProgress(Math.min(100, progress));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const article = data?.data;

  if (isLoading) return <div className="p-8 text-center text-[#64748B]">Loading article...</div>;
  if (!article) return <div className="p-8 text-center text-[#DC2626]">Article not found</div>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="fixed left-0 right-0 top-14 z-20 h-1 bg-[#D6F0E8]">
        <div className="h-full bg-[#1A6B5C] transition-all duration-100" style={{ width: `${scrollProgress}%` }} />
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/knowledge" className="rounded-xl p-2 text-[#64748B] hover:bg-[#D6F0E8]">
            <ArrowLeft size={18} />
          </Link>
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="info">{article.category.replace(/_/g, ' ')}</Badge>
            {article.isSponsored && <Badge variant="sponsored">SPONSORED - {article.sponsorName}</Badge>}
          </div>
          <h1 className="mb-3 text-2xl font-bold text-[#0D4035]">{article.title}</h1>
          <div className="flex items-center gap-4 text-sm text-[#64748B]">
            {article.author && <span>By {article.author.firstName} {article.author.lastName}</span>}
            {article.publishedAt && <span>{format(new Date(article.publishedAt), 'dd MMMM yyyy')}</span>}
            <div className="flex items-center gap-1"><Clock size={14} /><span>{article.readingTimeMinutes} min read</span></div>
            <div className="flex items-center gap-1"><Eye size={14} /><span>{article.viewCount} views</span></div>
          </div>
        </div>

        <div
          className="prose prose-sm max-w-none text-[#0D4035] [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_p]:mb-4"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderBody(article.body)) }}
        />

        <div className="border-t border-[#D6F0E8] pt-5">
          <div className="flex items-center gap-3 rounded-xl bg-[#EDF7F3] p-4">
            <GraduationCap size={20} className="text-[#1A6B5C]" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[#0D4035]">Log this as internal CPD learning</p>
              <p className="text-xs text-[#64748B]">Pharmacy Council accreditation is still deferred, but internal tracking is available.</p>
            </div>
            <Link to="/cpd">
              <Button size="sm">Open tracker</Button>
            </Link>
          </div>
        </div>

        {article.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {article.tags.map((tag: string) => <Badge key={tag} variant="muted" size="sm">#{tag}</Badge>)}
          </div>
        )}
      </div>
    </div>
  );
};
