// src/pages/Appointments.tsx
import { useEffect, useState } from "react";
import {
  appointmentApi,
  Appointment,
  userApi,
  Sorter,
  User,
  api,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getCached, invalidateCache, isCacheStale, setCached } from "@/lib/queryCache";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const APPOINTMENTS_CACHE_KEY = "appointments:list";
const DASHBOARD_CACHE_KEY = "dashboard:overview";
const CHART_CACHE_KEY = "chart:overview";

export default function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = (force = false) => {
    if (!force) {
      const cached = getCached<Appointment[]>(APPOINTMENTS_CACHE_KEY);
      if (cached) {
        setAppointments(cached.data);
        setLoading(false);

        if (!isCacheStale(cached.updatedAt)) return;
      }
    }

    appointmentApi
      .list()
      .then((r) => {
        setAppointments(r.data);
        setCached(APPOINTMENTS_CACHE_KEY, r.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Appointments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {appointments.length} total
          </p>
        </div>
        {user?.role === "farmer" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" /> Book Appointment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Book a Sorting Appointment</DialogTitle>
              </DialogHeader>
              <BookForm
                onSuccess={() => {
                  setOpen(false);
                  invalidateCache(APPOINTMENTS_CACHE_KEY);
                  invalidateCache(DASHBOARD_CACHE_KEY);
                  invalidateCache(CHART_CACHE_KEY);
                  load(true);
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-3">
        {appointments.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              No appointments found.
            </CardContent>
          </Card>
        )}
        {appointments.map((a) => (
          <AppointmentCard
            key={a.id}
            appointment={a}
            role={user?.role ?? "farmer"}
            onRefresh={load}
          />
        ))}
      </div>
    </div>
  );
}

function AppointmentCard({
  appointment: a,
  role,
  onRefresh,
}: {
  appointment: Appointment;
  role: string;
  onRefresh: (force?: boolean) => void;
}) {
  const counterpart =
    role === "farmer"
      ? `Sorter: ${a.sorter?.user?.full_name ?? "—"}`
      : `Farmer: ${a.farmer?.user?.full_name ?? "—"}`;

  const handleStatus = async (status: string) => {
    await appointmentApi.updateStatus(a.id, status);
    invalidateCache(APPOINTMENTS_CACHE_KEY);
    invalidateCache(DASHBOARD_CACHE_KEY);
    invalidateCache(CHART_CACHE_KEY);
    onRefresh(true);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{counterpart}</span>
              <Badge
                className={`text-xs capitalize ${STATUS_COLORS[a.status]}`}
                variant="outline"
              >
                {a.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              📅 {a.scheduled_date} &nbsp;·&nbsp; 🕐 {a.scheduled_time}
            </p>
            {a.sorting_session && (
              <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                <span>
                  🍅 Ripe:{" "}
                  <strong className="text-green-700">
                    {a.sorting_session.ripe_count}
                  </strong>
                </span>
                <span>
                  🟡 Unripe:{" "}
                  <strong className="text-amber-700">
                    {a.sorting_session.unripe_count}
                  </strong>
                </span>
                <span>
                  🟫 Rotten:{" "}
                  <strong className="text-red-700">
                    {a.sorting_session.rotten_count}
                  </strong>
                </span>
              </div>
            )}
            {a.notes && (
              <p className="text-xs text-muted-foreground italic">
                "{a.notes}"
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {role === "sorter" && a.status === "pending" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatus("confirmed")}
                >
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleStatus("cancelled")}
                >
                  Decline
                </Button>
              </>
            )}
            <Link to={`/dashboard?tab=appointment-detail&id=${a.id}`}>
              <Button size="icon" variant="ghost">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BookForm({ onSuccess }: { onSuccess: () => void }) {
  const [sorters, setSorters] = useState<any[]>([]);
  const [form, setForm] = useState<{
    sorter_id: string;
    scheduled_date: string;
    scheduled_time: string;
    notes: string;
  }>({
    sorter_id: "",
    scheduled_date: "",
    scheduled_time: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/sorters").then((r: any) => setSorters(r));
  }, []);

  const submit = async () => {
    if (!form.sorter_id || !form.scheduled_date || !form.scheduled_time) return;
    setLoading(true);
    try {
      await appointmentApi.create({
        sorter_id: Number(form.sorter_id),
        scheduled_date: form.scheduled_date,
        scheduled_time: form.scheduled_time,
        notes: form.notes || undefined,
      });
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <Label>Select Sorter</Label>
        <Select
          onValueChange={(v: string | null) =>
            v && setForm((f) => ({ ...f, sorter_id: v }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a sorter..." />
          </SelectTrigger>
          <SelectContent>
            {sorters.map((s: any) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.user?.full_name} — {s.location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input
            type="date"
            value={form.scheduled_date}
            onChange={(e) =>
              setForm((f) => ({ ...f, scheduled_date: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Time</Label>
          <Input
            type="time"
            value={form.scheduled_time}
            onChange={(e) =>
              setForm((f) => ({ ...f, scheduled_time: e.target.value }))
            }
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Notes (optional)</Label>
        <Textarea
          placeholder="Any special instructions..."
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </div>
      <Button className="w-full" onClick={submit} disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Book Appointment
      </Button>
    </div>
  );
}
