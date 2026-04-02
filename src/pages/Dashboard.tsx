// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { dashboardApi, DashboardData, Appointment } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, Users, CheckCircle2, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.get().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    { label: 'Total Appointments', value: data.total_appointments, icon: CalendarDays, color: 'text-blue-600' },
    { label: 'Pending',            value: data.pending_appointments, icon: Clock, color: 'text-amber-600' },
    { label: 'Confirmed',          value: data.confirmed_appointments, icon: CheckCircle2, color: 'text-green-600' },
    { label: 'Completed',          value: data.completed_appointments, icon: CheckCircle2, color: 'text-emerald-600' },
    ...(user?.role === 'admin' ? [
      { label: 'Total Farmers', value: data.total_farmers ?? 0, icon: Users, color: 'text-purple-600' },
      { label: 'Total Sorters', value: data.total_sorters ?? 0, icon: Users, color: 'text-rose-600' },
    ] : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {user?.full_name}
        </h1>
        <p className="text-muted-foreground text-sm mt-1 capitalize">{user?.role} Dashboard</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Recent Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {data.recent_appointments.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No appointments yet.</p>
            )}
            {data.recent_appointments.map(a => (
              <AppointmentRow key={a.id} appointment={a} role={user?.role ?? 'farmer'} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AppointmentRow({ appointment: a, role }: { appointment: Appointment; role: string }) {
  const statusColor: Record<string, string> = {
    pending:   'bg-amber-100 text-amber-800',
    confirmed: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const counterpart = role === 'farmer'
    ? a.sorter?.user?.full_name
    : a.farmer?.user?.full_name;

  return (
    <div className="py-3 flex items-center justify-between gap-2">
      <div>
        <p className="text-sm font-medium">{counterpart ?? '—'}</p>
        <p className="text-xs text-muted-foreground">
          {a.scheduled_date} · {a.scheduled_time}
        </p>
        {a.sorting_session && (
          <p className="text-xs text-muted-foreground mt-0.5">
            🍅 {a.sorting_session.ripe_count} ripe ·{' '}
            🟡 {a.sorting_session.unripe_count} unripe ·{' '}
            🟫 {a.sorting_session.rotten_count} rotten
          </p>
        )}
      </div>
      <Badge className={`text-xs capitalize ${statusColor[a.status]}`} variant="outline">
        {a.status}
      </Badge>
    </div>
  );
}
