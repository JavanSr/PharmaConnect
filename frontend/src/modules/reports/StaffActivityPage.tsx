import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, CalendarDays, ShieldCheck, UserRound } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';

type StaffRole = 'OWNER' | 'PHARMACIST_IN_CHARGE' | 'DISPENSER' | 'CASHIER' | string;

interface StaffActivityDay {
  date: string;
  active?: boolean;
  revenue?: number;
}

interface StaffActivityStaff {
  id: string;
  name: string;
  role: StaffRole;
  lastActiveAt: string | null;
  today: {
    loginTime: string | null;
    dispenses: number;
    revenue: number;
  };
  week: {
    dispenses: number;
    revenue: number;
    voids: number;
    adjustments: number;
    interactionAlerts: number;
    pinOverrides: number;
  };
  detail: {
    loginDays: StaffActivityDay[];
    revenueByDay: StaffActivityDay[];
    topMedicines: Array<{ medicine: string; count: number }>;
    interactionAlerts: Array<{
      id: string;
      date: string;
      medicinePair: string;
      severity: string;
      overridden: boolean;
    }>;
    voidsAndAdjustments: Array<{
      id: string;
      date: string;
      type: string;
      reason: string | null;
      reference: string | null;
    }>;
  };
}

interface StaffActivityReport {
  generatedAt: string;
  range: {
    todayStart: string;
    weekStart: string;
    thirtyDayStart: string;
  };
  staff: StaffActivityStaff[];
  comparison: Array<{
    userId: string;
    name: string;
    dispenses: number;
    revenue: number;
    pinOverrides: number;
    flagPinOverrides: boolean;
  }>;
}

const formatTzs = (value: number) => `TZS ${Math.round(value || 0).toLocaleString('en-TZ')}`;

const formatRole = (role: string) => role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const formatDateTime = (value: string | null) => {
  if (!value) return 'No activity yet';
  return new Intl.DateTimeFormat('en-TZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const formatTime = (value: string | null) => {
  if (!value) return 'No login today';
  return new Intl.DateTimeFormat('en-TZ', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const shortDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('en-TZ', { month: 'short', day: 'numeric' }).format(date);
};

const readStaffActivity = async () => {
  const response = await api.get<{ data: StaffActivityReport }>('/staff-activity');
  return response.data.data;
};

const Metric = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="mt-1 text-sm font-semibold text-[#0D4035]">{value}</p>
  </div>
);

export const StaffActivityPage: React.FC = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['staff-activity'],
    queryFn: readStaffActivity,
    staleTime: 60_000,
  });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedId && data?.staff?.[0]) {
      setSelectedId(data.staff[0].id);
    }
  }, [data?.staff, selectedId]);

  const selected = data?.staff.find((staff) => staff.id === selectedId) ?? data?.staff[0] ?? null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#0D4035]">Staff Activity</h1>
          <p className="mt-1 text-sm text-gray-500">Loading staff activity...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 text-[#D97706]" size={20} />
          <div>
            <h1 className="text-lg font-semibold text-[#0D4035]">Staff Activity</h1>
            <p className="mt-1 text-sm text-gray-600">Unable to load staff activity right now.</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!data || data.staff.length === 0) {
    return (
      <Card>
        <div>
          <h1 className="text-lg font-semibold text-[#0D4035]">Staff Activity</h1>
          <p className="mt-1 text-sm text-gray-600">No staff activity has been recorded yet.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#0D4035]">Staff Activity</h1>
        <p className="mt-1 text-sm text-gray-500">
          Derived from logins, dispensing, receiving, adjustments, safety alerts, and PIN override records.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {data.staff.map((staff) => {
          const isSelected = staff.id === selected?.id;
          const flagged = staff.week.pinOverrides > 3;
          return (
            <button
              key={staff.id}
              type="button"
              onClick={() => setSelectedId(staff.id)}
              className={`rounded-2xl border bg-white p-5 text-left shadow-[0_1px_3px_rgba(13,64,53,0.08)] transition ${
                isSelected ? 'border-[#1A6B5C] ring-2 ring-[#D6F0E8]' : 'border-[#D6F0E8] hover:border-[#1D9E75]'
              } ${flagged ? 'bg-amber-50/60' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-[#0D4035]">{staff.name}</p>
                  <p className="mt-1 text-xs text-gray-500">{formatRole(staff.role)}</p>
                </div>
                <UserRound size={20} className="text-[#1A6B5C]" />
              </div>
              <p className="mt-3 text-xs text-gray-500">Last active</p>
              <p className="mt-1 text-sm font-medium text-[#0D4035]">{formatDateTime(staff.lastActiveAt)}</p>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <Metric label="Login" value={formatTime(staff.today.loginTime)} />
                <Metric label="Today" value={`${staff.today.dispenses} dispenses`} />
                <Metric label="Revenue" value={formatTzs(staff.today.revenue)} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[#D6F0E8] pt-4">
                <Metric label="Week dispenses" value={staff.week.dispenses} />
                <Metric label="Week revenue" value={formatTzs(staff.week.revenue)} />
                <Metric label="PIN overrides" value={staff.week.pinOverrides} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="muted" size="sm">{staff.week.voids} voids</Badge>
                <Badge variant="muted" size="sm">{staff.week.adjustments} adjustments</Badge>
                <Badge variant="info" size="sm">{staff.week.interactionAlerts} alerts</Badge>
                {flagged && <Badge variant="warning" size="sm">Review pattern</Badge>}
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Card
              header={(
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-[#0D4035]">{selected.name}</h2>
                    <p className="text-sm text-gray-500">{formatRole(selected.role)}</p>
                  </div>
                  <CalendarDays size={20} className="text-[#1A6B5C]" />
                </div>
              )}
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold text-[#0D4035]">Daily login times</h3>
                  <div className="mt-4 grid grid-cols-10 gap-2">
                    {selected.detail.loginDays.map((day) => (
                      <div
                        key={day.date}
                        title={`${shortDate(day.date)}: ${day.active ? 'active' : 'inactive'}`}
                        className={`h-7 rounded-md border ${
                          day.active ? 'border-[#1A6B5C] bg-[#1A6B5C]' : 'border-[#D6F0E8] bg-[#EDF7F3]'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[#0D4035]">Revenue per day</h3>
                  <div className="mt-3 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={selected.detail.revenueByDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2EFEA" />
                        <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10 }} width={42} />
                        <Tooltip formatter={(value) => formatTzs(Number(value))} labelFormatter={(label) => shortDate(String(label))} />
                        <Bar dataKey="revenue" fill="#1A6B5C" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </Card>

            <Card
              header={(
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[#1A6B5C]" />
                  <h2 className="font-semibold text-[#0D4035]">Interaction alert history</h2>
                </div>
              )}
            >
              {selected.detail.interactionAlerts.length === 0 ? (
                <p className="text-sm text-gray-500">No interaction alerts recorded in the last 30 days.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#D6F0E8] text-left text-xs uppercase text-gray-500">
                        <th className="pb-2 pr-4 font-medium">Date</th>
                        <th className="pb-2 pr-4 font-medium">Medicine pair</th>
                        <th className="pb-2 pr-4 font-medium">Severity</th>
                        <th className="pb-2 font-medium">Override</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.detail.interactionAlerts.map((alert) => (
                        <tr key={alert.id} className="border-b border-[#EDF7F3] last:border-0">
                          <td className="py-3 pr-4 text-gray-600">{formatDateTime(alert.date)}</td>
                          <td className="py-3 pr-4 font-medium text-[#0D4035]">{alert.medicinePair}</td>
                          <td className="py-3 pr-4">
                            <Badge variant={alert.severity === 'HIGH' || alert.severity === 'SEVERE' ? 'danger' : 'warning'} size="sm">
                              {alert.severity}
                            </Badge>
                          </td>
                          <td className="py-3">{alert.overridden ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card
              header={(
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-[#1A6B5C]" />
                  <h2 className="font-semibold text-[#0D4035]">Current week comparison</h2>
                </div>
              )}
            >
              <div className="space-y-3">
                {data.comparison.map((row) => (
                  <div
                    key={row.userId}
                    className={`rounded-xl border p-3 ${row.flagPinOverrides ? 'border-amber-200 bg-amber-50' : 'border-[#D6F0E8] bg-white'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-[#0D4035]">{row.name}</p>
                      {row.flagPinOverrides && <Badge variant="warning" size="sm">Review pattern</Badge>}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <Metric label="Dispenses" value={row.dispenses} />
                      <Metric label="Revenue" value={formatTzs(row.revenue)} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card header={<h2 className="font-semibold text-[#0D4035]">Top medicines dispensed</h2>}>
              {selected.detail.topMedicines.length === 0 ? (
                <p className="text-sm text-gray-500">No medicines dispensed in the last 30 days.</p>
              ) : (
                <div className="space-y-3">
                  {selected.detail.topMedicines.map((medicine, index) => (
                    <div key={`${medicine.medicine}-${index}`} className="flex items-center justify-between gap-4">
                      <p className="truncate text-sm font-medium text-[#0D4035]">{medicine.medicine}</p>
                      <Badge variant="muted" size="sm">{medicine.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card header={<h2 className="font-semibold text-[#0D4035]">Void and adjustment history</h2>}>
              {selected.detail.voidsAndAdjustments.length === 0 ? (
                <p className="text-sm text-gray-500">No voids or adjustments recorded in the last 30 days.</p>
              ) : (
                <div className="space-y-3">
                  {selected.detail.voidsAndAdjustments.map((event) => (
                    <div key={event.id} className="rounded-xl border border-[#D6F0E8] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[#0D4035]">{event.type.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-gray-500">{formatDateTime(event.date)}</p>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{event.reason || event.reference || 'No reason captured'}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
