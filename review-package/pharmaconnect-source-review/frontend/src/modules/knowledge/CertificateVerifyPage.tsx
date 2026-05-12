import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import type { CertificateVerification } from '@/types';

export const CertificateVerifyPage: React.FC = () => {
  const { certificateId = '' } = useParams<{ certificateId: string }>();
  const query = useQuery({
    queryKey: ['certificate-verify', certificateId],
    queryFn: () => api.get(`/knowledge/verify/${certificateId}`).then((response) => response.data),
  });

  const certificate: CertificateVerification | undefined = query.data?.data;

  if (!certificate) {
    return <div className="mx-auto max-w-2xl p-6">{query.isLoading ? 'Loading certificate...' : 'Certificate not found'}</div>;
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Card>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#0D4035]">Certificate Verification</h1>
            {!certificate.isPcAccredited && <Badge variant="warning" size="sm">Non-accredited</Badge>}
          </div>
          <p className="text-sm text-[#64748B]">{certificate.holderName}</p>
          <p className="text-sm text-[#0D4035]">{certificate.courseTitle}</p>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Completed</p>
              <p className="text-sm text-[#0D4035]">{certificate.completedAt ? new Date(certificate.completedAt).toLocaleString() : '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Score</p>
              <p className="text-sm text-[#0D4035]">{certificate.score ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Points</p>
              <p className="text-sm text-[#0D4035]">{certificate.pointsAwarded}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
