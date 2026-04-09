import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Clock, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import type { Article } from '@/types';

const CATEGORIES = ['All', 'REGULATORY_UPDATES', 'PHARMACY_PRACTICE', 'MEDICINE_SAFETY', 'BUSINESS_TIPS'];
const CAT_LABELS: Record<string, string> = {
  'All': 'All', REGULATORY_UPDATES: 'Regulatory', PHARMACY_PRACTICE: 'Practice', MEDICINE_SAFETY: 'Safety', BUSINESS_TIPS: 'Business',
};

export const KnowledgeFeedPage: React.FC = () => {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['articles', category, debouncedSearch],
    queryFn: () => api.get('/knowledge/articles', {
      params: { category: category !== 'All' ? category : undefined, search: debouncedSearch || undefined, limit: 12 }
    }).then(r => r.data),
  });

  const articles: Article[] = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#0D4035]">Knowledge Hub</h1>
        <BookOpen size={24} className="text-[#1A6B5C]" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search articles..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          leftIcon={<Search size={16} />}
          className="flex-1"
        />
        <div className="flex gap-2 overflow-x-auto">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap transition-colors ${category === c ? 'bg-[#1A6B5C] text-white border-[#1A6B5C]' : 'bg-white text-[#64748B] border-[#D6F0E8] hover:bg-[#EDF7F3]'}`}>
              {CAT_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-[#D6F0E8] h-48 animate-pulse" />)}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 text-[#64748B]">No articles found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((article) => (
            <Link key={article.id} to={`/knowledge/${article.slug}`} className="group block">
              <div className="bg-white rounded-2xl border border-[#D6F0E8] overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
                {/* Image placeholder */}
                <div className="h-32 bg-gradient-to-br from-[#1A6B5C] to-[#1D9E75] flex items-center justify-center">
                  <BookOpen size={32} className="text-white/40" />
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="info" size="sm">{CAT_LABELS[article.category] || article.category}</Badge>
                    {article.isSponsored && <Badge variant="sponsored" size="sm">SPONSORED</Badge>}
                  </div>
                  <h3 className="text-sm font-semibold text-[#0D4035] group-hover:text-[#1A6B5C] transition-colors line-clamp-2 flex-1">
                    {article.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-3 text-xs text-[#64748B]">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{article.readingTimeMinutes} min read</span>
                    </div>
                    {article.publishedAt && (
                      <span>{format(new Date(article.publishedAt), 'dd MMM yyyy')}</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
