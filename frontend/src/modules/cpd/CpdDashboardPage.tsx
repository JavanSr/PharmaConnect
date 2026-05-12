import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Award, BookOpen, GraduationCap, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import type { CpdActivity, Course } from '@/types';

export const CpdDashboardPage: React.FC = () => {
  const pharmacy = usePharmacyStore((state) => state.pharmacy);
  const isAddo = pharmacy?.subscriptionTier === 'ADDO' || pharmacy?.pharmacyType === 'ADDO';
  const isWholesale = pharmacy?.subscriptionTier === 'WHOLESALE' || pharmacy?.pharmacyType === 'WHOLESALE';
  const showCourses = pharmacy?.subscriptionTier === 'PREMIUM' || pharmacy?.subscriptionTier === 'ENTERPRISE';

  const summaryQuery = useQuery({
    queryKey: ['cpd-summary'],
    queryFn: () => api.get('/cpd/summary').then((response) => response.data),
    enabled: !isAddo && !isWholesale,
  });

  const activitiesQuery = useQuery({
    queryKey: ['cpd-activities'],
    queryFn: () => api.get('/cpd/activities').then((response) => response.data),
    enabled: !isAddo && !isWholesale,
  });

  const coursesQuery = useQuery({
    queryKey: ['cpd-courses'],
    queryFn: () => api.get('/knowledge/courses').then((response) => response.data),
    enabled: showCourses,
  });

  if (isAddo || isWholesale) {
    return (
      <Card>
        <div className="space-y-3">
          <h1 className="text-xl font-bold text-[#0D4035]">CPD Tracker</h1>
          <p className="text-sm text-[#64748B]">
            CPD tracking is available for Standard, Premium, and Enterprise retail pharmacies.
            Accredited recognition still lives on the separate status page.
          </p>
          <Link to="/accredited-cpd">
            <Button variant="secondary">View accreditation status</Button>
          </Link>
        </div>
      </Card>
    );
  }

  const summary = summaryQuery.data?.data;
  const activities: CpdActivity[] = activitiesQuery.data?.data || [];
  const courses: Course[] = coursesQuery.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0D4035]">CPD Tracker</h1>
          <p className="text-sm text-[#64748B]">Internal learning log with non-accredited APOTEKH tracking.</p>
        </div>
        <Link to="/cpd/log">
          <Button leftIcon={<Plus size={16} />}>Log activity</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <Award className="text-[#1A6B5C]" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Total points</p>
              <p className="text-2xl font-bold text-[#0D4035]">{summary?.totalPoints ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <BookOpen className="text-[#1A6B5C]" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">This year</p>
              <p className="text-2xl font-bold text-[#0D4035]">{summary?.thisYearPoints ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <GraduationCap className="text-[#1A6B5C]" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Renewal countdown</p>
              <p className="text-2xl font-bold text-[#0D4035]">{summary?.daysToRenewal ?? '—'}</p>
            </div>
          </div>
          {summary?.renewalAlerts?.due14 && <Badge variant="warning" size="sm">14-day alert window</Badge>}
          {!summary?.renewalAlerts?.due14 && summary?.renewalAlerts?.due60 && <Badge variant="info" size="sm">60-day alert window</Badge>}
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#0D4035]">Recent CPD activity</h2>
          <Badge variant="muted" size="sm">{activities.length} entries</Badge>
        </div>
        <div className="mt-4 space-y-3">
          {activities.length === 0 ? (
            <p className="text-sm text-[#64748B]">No CPD activities logged yet.</p>
          ) : (
            activities.slice(0, 8).map((activity) => (
              <div key={activity.id} className="rounded-2xl border border-[#D6F0E8] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#0D4035]">{activity.title}</p>
                    <p className="text-xs text-[#64748B]">{activity.activityType.replace(/_/g, ' ')} · {new Date(activity.activityDate).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#1A6B5C]">{activity.pointsApproved ?? activity.pointsClaimed} pts</p>
                    {activity.auto_logged ? <Badge variant="info" size="sm">Auto-logged</Badge> : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {showCourses && (
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0D4035]">Premium courses</h2>
            <Badge variant="info" size="sm">Premium+</Badge>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {courses.length === 0 ? (
              <p className="text-sm text-[#64748B]">No published courses yet.</p>
            ) : (
              courses.map((course) => (
                <div key={course.id} className="rounded-2xl border border-[#D6F0E8] p-4">
                  <p className="text-sm font-semibold text-[#0D4035]">{course.title}</p>
                  <p className="mt-2 text-sm text-[#64748B]">{course.description}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-[#64748B]">
                    <span>{course.pointsAwarded} points</span>
                    <span>{course.cooldownHours}h cooldown</span>
                  </div>
                  <Link to={`/cpd/courses/${course.slug}`} className="mt-4 inline-block">
                    <Button size="sm" variant="secondary">Open course</Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
