import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Newspaper } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Bulletin, Publication } from '@/types';

export const TmdaUpdatesPage: React.FC = () => {
  const bulletinsQuery = useQuery({
    queryKey: ['tmda-bulletins'],
    queryFn: () => api.get('/knowledge/bulletins').then((response) => response.data.data as Bulletin[]),
  });
  const publicationsQuery = useQuery({
    queryKey: ['tmda-publications'],
    queryFn: () => api.get('/knowledge/publications').then((response) => response.data.data as Publication[]),
  });

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-[linear-gradient(135deg,#0B3A5B_0%,#146E94_55%,#D9F2FB_180%)] text-white" padding={false} shadow="md">
        <div className="grid gap-4 px-5 py-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              <Newspaper size={14} />
              TMDA updates
            </div>
            <h1 className="text-3xl font-semibold">Regulatory notices and publications in one feed.</h1>
            <p className="max-w-2xl text-sm text-white/80">
              This feed brings together the latest published bulletins and regulatory publications already available in APOTEKH so outlet teams can review updates without leaving the app.
            </p>
          </div>
          <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur">
            <p className="text-sm font-semibold">Feed content</p>
            <div className="mt-3 grid gap-2 text-sm text-white/80">
              <span>Urgent bulletins first</span>
              <span>Newest publications first</span>
              <span>Inspection-ready reference links</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card header={<h2 className="text-lg font-semibold text-[#0D4035]">Bulletins</h2>}>
          <div className="space-y-3">
            {(bulletinsQuery.data ?? []).map((bulletin) => (
              <div key={bulletin.id} className="rounded-2xl border border-[#D6F0E8] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-[#0D4035]">{bulletin.title}</p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      {new Date(bulletin.publishedAt ?? bulletin.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {bulletin.isUrgent && <Badge variant="danger" size="sm">Urgent</Badge>}
                </div>
              </div>
            ))}
            {(bulletinsQuery.data?.length ?? 0) === 0 && <p className="text-sm text-[#64748B]">No published TMDA bulletins yet.</p>}
          </div>
        </Card>

        <Card header={<h2 className="text-lg font-semibold text-[#0D4035]">Publications</h2>}>
          <div className="space-y-3">
            {(publicationsQuery.data ?? []).map((publication) => (
              <a
                key={publication.id}
                href={publication.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="block rounded-2xl border border-[#D6F0E8] p-4 transition-colors hover:bg-[#F7FCFA]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-[#0D4035]">{publication.title}</p>
                    {publication.description && <p className="mt-1 text-sm text-[#64748B]">{publication.description}</p>}
                    <p className="mt-2 text-xs text-[#64748B]">
                      {`${publication.category ?? 'Publication'} | ${new Date(publication.publishedAt ?? publication.createdAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <ExternalLink size={16} className="mt-0.5 text-[#1A6B5C]" />
                </div>
              </a>
            ))}
            {(publicationsQuery.data?.length ?? 0) === 0 && <p className="text-sm text-[#64748B]">No published TMDA publications yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
};
