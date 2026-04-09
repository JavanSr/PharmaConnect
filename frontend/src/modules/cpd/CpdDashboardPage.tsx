import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { GraduationCap, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { api } from '@/lib/api';

const typeColors: Record<string, any> = {
  READING: 'info', WEBINAR: 'purple', CONFERENCE: 'warning', WORKSHOP: 'success', SELF_STUDY: 'muted',
};

export const CpdDashboardPage: React.FC = () => {
  const { data: summaryData } = useQuery({ queryKey: ['cpd-summary'], queryFn: () => api.get('/cpd/summary').then(r => r.data) });
  const summary = summaryData?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#0D4035]">CPD Tracker</h1>
        <Link to="/cpd/log"><Button leftIcon={<Plus size={16} />}>Log Activity</Button></Link>
      </div>

      {/* Progress card */}
      <Card>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 bg-[#D6F0E8] rounded-xl flex items-center justify-center">
            <GraduationCap size={24} className="text-[#1A6B5C]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#0D4035]">
              {summary?.renewalYear} Renewal Year
            </h2>
            <p className="text-sm text-[#64748B]">
              {summary?.totalPoints ?? 0} of {summary?.requiredPoints ?? 20} CPD points earned
            </p>
          </div>
          {summary?.isComplete && (
            <Badge variant="success" className="ml-auto">Requirements Met ✓</Badge>
          )}
        </div>
        <ProgressBar
          value={summary?.percentComplete ?? 0}
          height="lg"
          showPercent
          label="Progress"
        />
        <p className="text-xs text-[#64748B] mt-2">
          {Math.max(0, (summary?.requiredPoints ?? 20) - (summary?.totalPoints ?? 0))} points remaining to complete annual CPD requirement
        </p>
      </Card>

      {/* Activity log */}
      <Card header={<span className="text-sm font-semibold text-[#0D4035]">Activity Log</span>} padding={false}>
        {!summary?.activities?.length ? (
          <div className="p-8 text-center">
            <p className="text-sm text-[#64748B] mb-3">No CPD activities logged yet</p>
            <Link to="/cpd/log"><Button size="sm">Log your first activity</Button></Link>
          </div>
        ) : (
          <div className="divide-y divide-[#D6F0E8]">
            {summary.activities.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-[#0D4035]">{a.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant={typeColors[a.activityType] || 'muted'} size="sm">{a.activityType.replace(/_/g, ' ')}</Badge>
                    <span className="text-xs text-[#64748B]">{format(new Date(a.activityDate), 'dd MMM yyyy')}</span>
                  </div>
                </div>
                <Badge variant="success">{a.pointsClaimed}pt</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
