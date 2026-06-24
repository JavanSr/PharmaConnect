import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, Library, Megaphone, MessageSquare, Pencil, Search } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';
import { CommunityPage } from './CommunityPage';
import { WriteArticlePage } from './WriteArticlePage';
import type { Article, Bulletin, Publication } from '@/types';

const CATEGORIES = ['All', 'DRUG_SAFETY', 'REGULATORY', 'CLINICAL', 'BUSINESS', 'TECHNOLOGY', 'CPD', 'GENERAL'];

export const KnowledgeFeedPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [tab, setTab]       = useState<'feed' | 'community' | 'write'>('feed');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [email, setEmail] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const toast = useNotificationStore((state) => state.toast);

  const articlesQuery = useQuery({
    queryKey: ['knowledge-articles', category, debouncedSearch],
    queryFn: () => api.get('/knowledge/articles', {
      params: {
        category: category !== 'All' ? category : undefined,
        search: debouncedSearch || undefined,
        limit: 12,
      },
    }).then((response) => response.data),
  });

  const bulletinsQuery = useQuery({
    queryKey: ['knowledge-bulletins'],
    queryFn: () => api.get('/knowledge/bulletins').then((response) => response.data),
  });

  const publicationsQuery = useQuery({
    queryKey: ['knowledge-publications'],
    queryFn: () => api.get('/knowledge/publications').then((response) => response.data),
  });

  const subscribeMutation = useMutation({
    mutationFn: () => api.post('/knowledge/subscribe', { email }),
    onSuccess: () => {
      toast.success('Subscribed to the weekly digest');
      setEmail('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Could not subscribe');
    },
  });

  const articles: Article[] = articlesQuery.data?.data || [];
  const bulletins: Bulletin[] = bulletinsQuery.data?.data || [];
  const publications: Publication[] = publicationsQuery.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0D4035]">Knowledge Hub</h1>
          <p className="text-sm text-[#64748B]">Articles, bulletins, publications, and community discussions.</p>
        </div>
        <BookOpen size={24} className="text-[#1A6B5C]" />
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-[#D6F0E8]">
        <button
          onClick={() => setTab('feed')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'feed'
              ? 'border-[#1A6B5C] text-[#1A6B5C]'
              : 'border-transparent text-[#64748B] hover:text-[#0D4035]'
          }`}
        >
          <Library size={15} /> Articles & Bulletins
        </button>
        <button
          onClick={() => setTab('community')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'community'
              ? 'border-[#1A6B5C] text-[#1A6B5C]'
              : 'border-transparent text-[#64748B] hover:text-[#0D4035]'
          }`}
        >
          <MessageSquare size={15} /> Community
        </button>
        <button
          onClick={() => setTab('write')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'write'
              ? 'border-[#1A6B5C] text-[#1A6B5C]'
              : 'border-transparent text-[#64748B] hover:text-[#0D4035]'
          }`}
        >
          <Pencil size={15} /> Write
        </button>
      </div>

      {tab === 'community' && <CommunityPage />}
      {tab === 'write'     && <WriteArticlePage />}
      {tab === 'feed' && <>

      <Card>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            leftIcon={<Search size={16} />}
          />
          <div className="flex gap-2 overflow-x-auto">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${category === item ? 'border-[#1A6B5C] bg-[#1A6B5C] text-white' : 'border-[#D6F0E8] bg-white text-[#64748B] hover:bg-[#EDF7F3]'}`}
              >
                {item === 'All' ? 'All' : item.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-[#1A6B5C]" />
              <h2 className="text-base font-semibold text-[#0D4035]">Articles</h2>
            </div>
            {articles.length === 0 ? (
              <p className="text-sm text-[#64748B]">{articlesQuery.isLoading ? 'Loading articles...' : 'No articles found'}</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {articles.map((article) => (
                  <Link key={article.id} to={`/knowledge/${article.slug}`} className="rounded-2xl border border-[#D6F0E8] p-4 transition hover:shadow-md">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="info" size="sm">{article.category.replace(/_/g, ' ')}</Badge>
                      {article.isSponsored && <Badge variant="sponsored" size="sm">SPONSORED</Badge>}
                    </div>
                    <h3 className="text-sm font-semibold text-[#0D4035]">{article.title}</h3>
                    <p className="mt-2 text-sm text-[#64748B]">{article.summary}</p>
                    <p className="mt-3 text-xs text-[#64748B]">
                      {article.author
                        ? <><span className="font-medium text-[#0D4035]">{(article.author as any).firstName} {(article.author as any).lastName}</span> · </>
                        : null
                      }
                      {article.publishedAt ? format(new Date(article.publishedAt), 'dd MMM yyyy') : 'Draft'} · {article.readingTimeMinutes} min read
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Library size={18} className="text-[#1A6B5C]" />
              <h2 className="text-base font-semibold text-[#0D4035]">Publications</h2>
            </div>
            <div className="space-y-3">
              {publications.length === 0 ? (
                <p className="text-sm text-[#64748B]">{publicationsQuery.isLoading ? 'Loading publications...' : 'No publications yet'}</p>
              ) : (
                publications.slice(0, 6).map((publication) => (
                  <a key={publication.id} href={publication.fileUrl} target="_blank" rel="noreferrer" className="block rounded-2xl border border-[#D6F0E8] p-4 transition hover:bg-[#EDF7F3]">
                    <p className="text-sm font-semibold text-[#0D4035]">{publication.title}</p>
                    <p className="mt-1 text-sm text-[#64748B]">{publication.description}</p>
                  </a>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Megaphone size={18} className="text-[#1A6B5C]" />
              <h2 className="text-base font-semibold text-[#0D4035]">Bulletins</h2>
            </div>
            <div className="space-y-3">
              {bulletins.length === 0 ? (
                <p className="text-sm text-[#64748B]">{bulletinsQuery.isLoading ? 'Loading bulletins...' : 'No bulletins yet'}</p>
              ) : (
                bulletins.map((bulletin) => (
                  <div key={bulletin.id} className={`rounded-2xl border p-4 ${bulletin.isUrgent ? 'border-[#FBBF24] bg-amber-50' : 'border-[#D6F0E8]'}`}>
                    <div className="mb-2 flex items-center gap-2">
                      {bulletin.isUrgent && <Badge variant="warning" size="sm">Urgent</Badge>}
                      <span className="text-xs text-[#64748B]">{bulletin.publishedAt ? format(new Date(bulletin.publishedAt), 'dd MMM yyyy') : 'Draft'}</span>
                    </div>
                    <p className="text-sm font-semibold text-[#0D4035]">{bulletin.title}</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-[#0D4035]">Weekly digest</h2>
            <p className="mt-2 text-sm text-[#64748B]">Get a Monday 07:00 Africa/Nairobi roundup of recent articles and bulletins.</p>
            <div className="mt-4 space-y-3">
              <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
              <Button onClick={() => subscribeMutation.mutate()} loading={subscribeMutation.isPending} disabled={!email}>Subscribe</Button>
            </div>
          </Card>
        </div>
      </div>
      </>}
    </div>
  );
};
