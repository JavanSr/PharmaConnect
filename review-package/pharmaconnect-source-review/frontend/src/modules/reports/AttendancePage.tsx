import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import type { AttendanceRecord } from '@/types';

export const AttendancePage: React.FC = () => {
  const attendanceQuery = useQuery({
    queryKey: ['attendance-my-records'],
    queryFn: () => api.get('/attendance/my-records').then((response) => response.data.data as AttendanceRecord[]),
  });

  return (
    <Card header={<h1 className="text-xl font-semibold text-[#0D4035]">Attendance</h1>}>
      <div className="space-y-3">
        {(attendanceQuery.data ?? []).map((record) => (
          <div key={record.id} className="rounded-2xl border border-[#D6F0E8] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-[#0D4035]">{record.attendanceDate}</p>
                <p className="text-sm text-[#64748B]">{record.clockInAt ? new Date(record.clockInAt).toLocaleTimeString() : 'No clock-in recorded'}</p>
              </div>
              <span className="rounded-full bg-[#EDF7F3] px-3 py-1 text-xs font-semibold text-[#0D4035]">{record.status}</span>
            </div>
          </div>
        ))}
        {attendanceQuery.data?.length === 0 && <p className="text-sm text-[#64748B]">No attendance records yet.</p>}
      </div>
    </Card>
  );
};
