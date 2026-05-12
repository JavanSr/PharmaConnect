import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';
import type { Course } from '@/types';

export const CourseDetailPage: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const toast = useNotificationStore((state) => state.toast);
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const courseQuery = useQuery({
    queryKey: ['cpd-course', slug],
    queryFn: () => api.get(`/knowledge/courses/${slug}`).then((response) => response.data),
  });

  const course: Course | undefined = courseQuery.data?.data;
  const questions = useMemo(() => course?.assessment?.questions || [], [course]);

  const enrolMutation = useMutation({
    mutationFn: () => api.post(`/knowledge/courses/${course?.id}/enrol`),
    onSuccess: () => {
      toast.success('Enrolled successfully');
      queryClient.invalidateQueries({ queryKey: ['cpd-course', slug] });
    },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Could not enrol'),
  });

  const attemptMutation = useMutation({
    mutationFn: () => api.post(`/knowledge/courses/${course?.id}/attempt`, { answers }),
    onSuccess: (response) => {
      const result = response.data.data;
      toast.success(result.passed ? 'Course passed' : `Scored ${result.score}%`);
      queryClient.invalidateQueries({ queryKey: ['cpd-course', slug] });
      queryClient.invalidateQueries({ queryKey: ['cpd-summary'] });
      queryClient.invalidateQueries({ queryKey: ['cpd-activities'] });
    },
    onError: (error: any) => {
      const retryAfter = error.response?.data?.retry_after;
      toast.error(retryAfter ? `Cooling off until ${new Date(retryAfter).toLocaleString()}` : (error.response?.data?.error || 'Assessment failed'));
    },
  });

  if (!course) {
    return <Card><p className="text-sm text-[#64748B]">{courseQuery.isLoading ? 'Loading course...' : 'Course not found'}</p></Card>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#0D4035]">{course.title}</h1>
            {!course.isPcAccredited && <Badge variant="warning" size="sm">Non-accredited</Badge>}
          </div>
          <p className="text-sm text-[#64748B]">{course.description}</p>
          <div className="flex gap-3 text-xs text-[#64748B]">
            <span>{course.pointsAwarded} points</span>
            <span>{course.cooldownHours}h cooldown</span>
            <span>Pass mark {course.passingScore}%</span>
          </div>
          {!course.enrolment && <Button onClick={() => enrolMutation.mutate()} loading={enrolMutation.isPending}>Enroll now</Button>}
        </div>
      </Card>

      {course.enrolment && (
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#0D4035]">Assessment</h2>
              <Badge variant="info" size="sm">{course.enrolment.attempts} attempts</Badge>
            </div>
            {questions.map((question) => (
              <div key={question.id} className="rounded-2xl border border-[#D6F0E8] p-4">
                <p className="text-sm font-medium text-[#0D4035]">{question.prompt}</p>
                <div className="mt-3 space-y-2">
                  {question.options.map((option, index) => (
                    <label key={option} className="flex items-center gap-2 text-sm text-[#475569]">
                      <input
                        type="radio"
                        name={question.id}
                        checked={answers[question.id] === index}
                        onChange={() => setAnswers((current) => ({ ...current, [question.id]: index }))}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-3">
              <Button onClick={() => attemptMutation.mutate()} loading={attemptMutation.isPending}>Submit assessment</Button>
              {course.enrolment.certificateId && (
                <a href={`/verify/${course.enrolment.certificateId}`} className="inline-flex">
                  <Button variant="secondary">Verify certificate</Button>
                </a>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
