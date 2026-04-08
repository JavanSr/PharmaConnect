import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileCheck, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

export const NhifDashboardPage: React.FC = () => {
  const { data: analyticsData } = useQuery({ queryKey: ['nhif-analytics'], queryFn: () => api.get('/nhif/analytics/success-rate').then(r => r.data) });
  const { data: claimsData } = useQuery({ queryKey: ['nhif-claims-pending'], queryFn: () => api.get('/nhif/claims?status=DRAFT&limit=5').then(r => r.data) });

  const analytics = analyticsData?.data || { total: 0, approved: 0, rejected: 0, pending: 0, successRate: 0, topRejectionReasons: [] };
  const pendingClaims = claimsData?.data || [];

  const chartData = [{ value: analytics.successRate, fill: analytics.successRate >= 80 ? '#1A6B5C' : analytics.successRate >= 60 ? '#D97706' : '#DC2626' }];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#0D4035]">NHIF Claims</h1>
        <Link to="/nhif/claims"><Button variant="secondary">All Claims</Button></Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Claims', value: analytics.total, icon: <FileCheck size={20} />, color: 'bg-[#D6F0E8] text-[#1A6B5C]' },
          { label: 'Approved', value: analytics.approved, icon: <CheckCircle size={20} />, color: 'bg-[#D6F0E8] text-[#1A6B5C]' },
          { label: 'Rejected', value: analytics.rejected, icon: <XCircle size={20} />, color: 'bg-red-50 text-[#DC2626]' },
          { label: 'Pending', value: analytics.pending, icon: <Clock size={20} />, color: 'bg-amber-50 text-[#D97706]' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#D6F0E8] p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748B]">{s.label}</p>
              <p className="text-2xl font-bold text-[#0D4035] mt-0.5">{s.value}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center`}>{s.icon}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Success Rate */}
        <Card header={<span className="text-sm font-semibold text-[#0D4035]">Success Rate</span>}>
          <div className="flex flex-col items-center py-4">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="55%" outerRadius="100%" data={chartData} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar dataKey="value" angleAxisId={0} cornerRadius={8} background={{ fill: '#D6F0E8' }} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="-mt-12 text-center">
              <p className="text-3xl font-bold text-[#0D4035]">{analytics.successRate.toFixed(1)}%</p>
              <p className="text-xs text-[#64748B]">Approval Rate</p>
            </div>
          </div>
        </Card>

        {/* Rejection Reasons */}
        <Card header={<span className="text-sm font-semibold text-[#0D4035]">Top Rejection Reasons</span>}>
          {analytics.topRejectionReasons.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-[#64748B]">No rejection data</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={analytics.topRejectionReasons.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="reason" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="#DC2626" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Pending Claims */}
      <Card header={
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[#0D4035]">Pending Claims (DRAFT)</span>
          <Link to="/nhif/claims?status=DRAFT" className="text-xs text-[#1A6B5C] hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>
        </div>
      } padding={false}>
        {pendingClaims.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B]">No pending claims</div>
        ) : (
          <div className="divide-y divide-[#D6F0E8]">
            {pendingClaims.map((c: any) => (
              <Link key={c.id} to={`/nhif/claims/${c.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-[#EDF7F3] transition-colors">
                <div>
                  <p className="text-sm font-medium text-[#0D4035]">{c.icdCode} — {c.drugCode || 'No drug code'}</p>
                  <p className="text-xs text-[#64748B]">TZS {(c.claimedAmount || 0).toLocaleString()}</p>
                </div>
                <Badge variant="warning" size="sm">DRAFT</Badge>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
