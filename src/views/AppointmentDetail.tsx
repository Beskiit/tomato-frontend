// src/pages/AppointmentDetail.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { appointmentApi, sessionApi, Appointment, SortingSession } from '@/lib/api';
import { getCached, invalidateCache, isCacheStale, setCached } from '@/lib/queryCache';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Play, CheckCircle2 } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-800 border-amber-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

const APPOINTMENTS_CACHE_KEY = 'appointments:list';
const DASHBOARD_CACHE_KEY = 'dashboard:overview';
const CHART_CACHE_KEY = 'chart:overview';
const detailCacheKey = (id: string) => `appointments:detail:${id}`;

export default function AppointmentDetail() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionOpen, setSessionOpen] = useState(false);

  const load = (force = false) => {
    if (!id) {
      setLoading(false);
      setAppointment(null);
      return;
    }
    const key = detailCacheKey(id);

    if (!force) {
      const cached = getCached<Appointment>(key);
      if (cached) {
        setAppointment(cached.data);
        setLoading(false);

        if (!isCacheStale(cached.updatedAt)) return;
      }
    }

    appointmentApi.get(Number(id))
      .then(next => {
        setAppointment(next);
        setCached(key, next);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!id || appointment?.sorting_session?.session_status !== 'in_progress') return;
    const interval = setInterval(() => {
      appointmentApi.get(Number(id))
        .then(next => {
          setAppointment(next);
          setCached(detailCacheKey(id), next);
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [id, appointment?.sorting_session?.session_status]);

  const completeSession = async () => {
    if (!appointment?.sorting_session) return;
    await sessionApi.complete(appointment.sorting_session.id);
    if (id) invalidateCache(detailCacheKey(id));
    invalidateCache(APPOINTMENTS_CACHE_KEY);
    invalidateCache(DASHBOARD_CACHE_KEY);
    invalidateCache(CHART_CACHE_KEY);
    load(true);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (!appointment) return (
    <div className="text-center py-16 text-muted-foreground">Appointment not found.</div>
  );

  const session = appointment.sorting_session;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard?tab=appointments')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Appointment to {appointment.farmer?.farm_name}</h1>
          <p className="text-sm text-muted-foreground">Scheduled sorting session</p>
        </div>
      </div>

      {/* Details */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Details</CardTitle>
            <Badge className={`capitalize ${STATUS_COLORS[appointment.status]}`} variant="outline">
              {appointment.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Farmer"  value={appointment.farmer?.user?.full_name ?? '—'} />
          <Row label="Sorter"  value={appointment.sorter?.user?.full_name ?? '—'} />
          <Row label="Date"    value={appointment.scheduled_date} />
          <Row label="Time"    value={appointment.scheduled_time} />
          {appointment.notes && <Row label="Notes" value={appointment.notes} />}
        </CardContent>
      </Card>

      {/* Sorting Results */}
      {session && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Sorting Results</CardTitle>
              <Badge variant="outline" className={
                session.session_status === 'completed' ? 'text-green-700 bg-green-50' :
                session.session_status === 'in_progress' ? 'text-blue-700 bg-blue-50' :
                'text-red-700 bg-red-50'
              }>
                {session.session_status.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <ResultCard label="Ripe"   count={session.ripe_count}   color="green" emoji="🍅" />
              <ResultCard label="Unripe" count={session.unripe_count} color="amber" emoji="🟡" />
              <ResultCard label="Rotten" count={session.rotten_count} color="red"   emoji="🟫" />
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <Row label="Device ID" value={session.raspberry_pi_id ?? '—'} />
              {session.started_at && <Row label="Started"  value={new Date(session.started_at).toLocaleString()} />}
              {session.ended_at   && <Row label="Finished" value={new Date(session.ended_at).toLocaleString()} />}
            </div>

            {user?.role === 'sorter' && session.session_status === 'in_progress' && (
              <Button className="mt-4 w-full gap-2" variant="outline" onClick={completeSession}>
                <CheckCircle2 className="w-4 h-4" /> Mark Session as Complete
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Start Session (sorter only, confirmed appointment, no session yet) */}
      {user?.role === 'sorter' && appointment.status === 'confirmed' && !session && (
        <Dialog open={sessionOpen} onOpenChange={setSessionOpen}>
          <DialogTrigger>
            <Button className="w-full gap-2">
              <Play className="w-4 h-4" /> Start Sorting Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start Sorting Session</DialogTitle>
            </DialogHeader>
            <StartSessionForm
              appointmentId={appointment.id}
              onSuccess={() => { setSessionOpen(false); load(true); }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground shrink-0 w-24">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function ResultCard({ label, count, color, emoji }: {
  label: string; count: number; color: string; emoji: string;
}) {
  const bg: Record<string, string> = {
    green: 'bg-green-50 border-green-200',
    amber: 'bg-amber-50 border-amber-200',
    red:   'bg-red-50 border-red-200',
  };
  const text: Record<string, string> = {
    green: 'text-green-800',
    amber: 'text-amber-800',
    red:   'text-red-800',
  };
  return (
    <div className={`rounded-lg border p-3 text-center ${bg[color]}`}>
      <div className="text-xl mb-1">{emoji}</div>
      <div className={`text-2xl font-bold ${text[color]}`}>{count}</div>
      <div className={`text-xs font-medium ${text[color]} opacity-80`}>{label}</div>
    </div>
  );
}

function StartSessionForm({ appointmentId, onSuccess }: {
  appointmentId: number; onSuccess: () => void;
}) {
  const [piId, setPiId]     = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!piId.trim()) return;
    setLoading(true);
    try {
      await sessionApi.create(appointmentId, piId.trim());
      invalidateCache(detailCacheKey(String(appointmentId)));
      invalidateCache(APPOINTMENTS_CACHE_KEY);
      invalidateCache(DASHBOARD_CACHE_KEY);
      invalidateCache(CHART_CACHE_KEY);
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <Label>Raspberry Pi Device ID</Label>
        <Input
          placeholder="e.g. RPI-001"
          value={piId}
          onChange={e => setPiId(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Enter the hardware ID of the Raspberry Pi unit being used.
        </p>
      </div>
      <Button className="w-full" onClick={submit} disabled={loading || !piId.trim()}>
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Start Session
      </Button>
    </div>
  );
}
