// src/pages/ActivityLog.tsx
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getCached, isCacheStale, setCached } from '@/lib/queryCache';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Activity, User, Calendar, Server, LogIn, LogOut, AlertCircle } from 'lucide-react';

interface ActivityLogEntry {
  id: number;
  user_id: number | null;
  action: string;
  model_type: string | null;
  model_id: number | null;
  description: string;
  changes: Record<string, any> | null;
  ip_address: string | null;
  performed_at: string;
  user?: { id: number; full_name: string; role: string; email: string };
}

interface Paginated {
  data: ActivityLogEntry[];
  current_page: number;
  last_page: number;
  total: number;
}

const activityCacheKey = (
  isAdmin: boolean,
  page: number,
  search: string,
  action: string,
  model: string
) => `activity:${isAdmin ? 'admin' : 'user'}:${page}:${search}:${action}:${model}`;

const ACTION_STYLES: Record<string, { color: string; icon: any }> = {
  logged_in:         { color: 'bg-green-100 text-green-800 border-green-200',     icon: LogIn },
  logged_out:        { color: 'bg-gray-100 text-gray-700 border-gray-200',        icon: LogOut },
  login_failed:      { color: 'bg-red-100 text-red-800 border-red-200',           icon: AlertCircle },
  registered:        { color: 'bg-blue-100 text-blue-800 border-blue-200',        icon: User },
  created:           { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Activity },
  updated:           { color: 'bg-amber-100 text-amber-800 border-amber-200',     icon: Activity },
  deleted:           { color: 'bg-red-100 text-red-800 border-red-200',           icon: Activity },
  status_changed:    { color: 'bg-purple-100 text-purple-800 border-purple-200',  icon: Calendar },
  session_started:   { color: 'bg-blue-100 text-blue-800 border-blue-200',        icon: Server },
  session_completed: { color: 'bg-green-100 text-green-800 border-green-200',     icon: Server },
};

const MODEL_ICONS: Record<string, any> = {
  User:           User,
  Appointment:    Calendar,
  SortingSession: Server,
};

export default function ActivityLogPage() {
  const { user }                      = useAuth();
  const isAdmin                       = user?.role === 'admin';
  const [logs, setLogs]               = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [page, setPage]               = useState(1);
  const [lastPage, setLastPage]       = useState(1);
  const [total, setTotal]             = useState(0);
  const [search, setSearch] = useState('');
  const [action, setAction]           = useState('all');
  const [model, setModel]             = useState('all');

  const load = (p = 1, force = false) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), per_page: '20' });
    if (search)                      params.append('search', search);
    if (action !== 'all')            params.append('action', action);
    if (isAdmin && model !== 'all')  params.append('model', model);
    const key = activityCacheKey(!!isAdmin, p, search, action, model);

    if (!force) {
      const cached = getCached<Paginated>(key);
      if (cached) {
        setLogs(cached.data.data);
        setPage(cached.data.current_page);
        setLastPage(cached.data.last_page);
        setTotal(cached.data.total);
        setLoading(false);

        if (!isCacheStale(cached.updatedAt)) return;
      }
    }

    api.get<Paginated>(`/activity-logs?${params}`)
      .then(res => {
        setLogs(res.data);
        setPage(res.current_page);
        setLastPage(res.last_page);
        setTotal(res.total);
        setCached(key, res);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, [search, action, model]);

  const handleAction = (v: string | null) => { if (v) setAction(v); };
  const handleModel  = (v: string | null) => { if (v) setModel(v); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity Log</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin
            ? `${total} total events across all users`
            : `${total} events from your account`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search activity..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Select value={action} onValueChange={handleAction}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="logged_in">Logged in</SelectItem>
            <SelectItem value="logged_out">Logged out</SelectItem>
            {isAdmin && <SelectItem value="login_failed">Login failed</SelectItem>}
            <SelectItem value="registered">Registered</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="updated">Updated</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
            <SelectItem value="status_changed">Status changed</SelectItem>
            <SelectItem value="session_started">Session started</SelectItem>
            <SelectItem value="session_completed">Session completed</SelectItem>
          </SelectContent>
        </Select>

        {/* Model type filter — admin only */}
        {isAdmin && (
          <Select value={model} onValueChange={handleModel}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="User">User</SelectItem>
              <SelectItem value="Appointment">Appointment</SelectItem>
              <SelectItem value="SortingSession">Sorting Session</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Log entries */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4" />
            {isAdmin ? 'All Activity' : 'My Activity'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-12">
              No activity found.
            </div>
          ) : (
            <div className="divide-y">
              {logs.map(log => {
                const style = ACTION_STYLES[log.action] ?? { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Activity };
                const Icon  = style.icon;
                const MIcon = log.model_type ? (MODEL_ICONS[log.model_type] ?? Activity) : Activity;

                return (
                  <div key={log.id} className="px-6 py-4 flex items-start gap-4 hover:bg-muted/30 transition-colors">
                    <div className={`mt-0.5 p-2 rounded-full shrink-0 ${style.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className={`text-[11px] capitalize ${style.color}`}>
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                        {log.model_type && (
                          <Badge variant="outline" className="text-[11px] flex items-center gap-1">
                            <MIcon className="w-2.5 h-2.5" />
                            {log.user?.full_name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground">{log.description}</p>
                      <div className="flex justify-between items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        {/* User info and IP — admin only */}
                        <div className="flex flex-1 gap-2">
                          {isAdmin && log.user && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {log.user.email}
                              <span className="capitalize opacity-60">({log.user.role})</span>
                            </span>
                          )}
                          {isAdmin && log.ip_address && (
                            <span className="opacity-60">IP: {log.ip_address}</span>
                          )}
                        </div>
                        <div className="">
                          <span>{new Date(log.performed_at).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Changes diff */}
                      {log.changes && (
                        <div className="mt-2 text-xs bg-muted rounded-md px-3 py-2 font-mono space-y-1">
                          {Object.keys(log.changes.before ?? {}).map(key => (
                            <div key={key} className="flex gap-2">
                              <span className="text-muted-foreground w-24 shrink-0">{key}:</span>
                              <span className="text-red-600 line-through">{String(log.changes!.before[key])}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-green-700">{String(log.changes!.after[key])}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {lastPage}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => load(page - 1)}
              className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-accent transition-colors"
            >Previous</button>
            <button
              disabled={page >= lastPage}
              onClick={() => load(page + 1)}
              className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-accent transition-colors"
            >Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
