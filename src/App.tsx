// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Appointments from '@/pages/Appointments';
import ActivityLogPage from '@/pages/ActivityLog';
import AppointmentDetail from '@/pages/AppointmentDetail';
import Notifications from '@/pages/Notifications';
import Users from '@/pages/Users';
import { useEffect, useState } from 'react';
import { notificationApi } from '@/lib/api';
import type { Notification } from '@/lib/api';
import { Loader2, LayoutDashboard, CalendarDays, Users as UsersIcon, Bell, LogOut, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

function ProtectedLayout() {
  const { user, logout, isLoading } = useAuth();
  const [unread, setUnread] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!user) return;
    notificationApi.list()
      .then((r: { data: Notification[] }) => setUnread(r.data.filter((n: Notification) => !n.is_read).length))
      .catch(() => {});
  }, [user]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  const activeTab = searchParams.get('tab') ?? 'overview';

  const navItems = [
    { tab: 'overview', icon: LayoutDashboard, label: 'Dashboard' },
    { tab: 'appointments', icon: CalendarDays, label: 'Appointments' },
    ...(user.role === 'admin'
      ? [{ tab: 'users', icon: UsersIcon, label: 'Users' }]
      : []),
    { tab: 'activity-log', icon: Activity, label: 'Activity Log' },
  ];

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
      isActive
        ? 'bg-primary text-primary-foreground font-medium'
        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
    }`;

  const switchTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    if (tab !== 'appointment-detail') next.delete('id');
    setSearchParams(next);
  };

  let content = <Dashboard />;
  if (activeTab === 'appointments') content = <Appointments />;
  if (activeTab === 'notifications') content = <Notifications />;
  if (activeTab === 'activity-log') content = <ActivityLogPage />;
  if (activeTab === 'appointment-detail') content = <AppointmentDetail />;
  if (activeTab === 'users' && user.role === 'admin') content = <Users />;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-background flex flex-col py-4 px-3 gap-1 shrink-0">
        <div className="px-2 mb-5">
          <span className="text-lg font-bold tracking-tight">🍅 TomatoSort</span>
          <p className="text-[11px] text-muted-foreground capitalize mt-0.5">{user.role}</p>
        </div>

        {navItems.map(n => (
          <button
            key={n.tab}
            type="button"
            onClick={() => switchTab(n.tab)}
            className={linkClass(activeTab === n.tab)}
          >
            <n.icon className="w-4 h-4 shrink-0" />
            {n.label}
          </button>
        ))}

        <button type="button" onClick={() => switchTab('notifications')} className={linkClass(activeTab === 'notifications')}>
          <div className="relative shrink-0">
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold leading-none">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>
          Notifications
        </button>

        <div className="mt-auto px-1 pt-4 border-t">
          <p className="text-xs text-muted-foreground px-2 mb-1 truncate font-medium">{user.full_name}</p>
          <p className="text-[11px] text-muted-foreground px-2 mb-3 truncate">{user.email}</p>
          <Button
            variant="ghost" size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={logout}
          >
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          {content}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute />} />
          <Route path="/dashboard" element={<ProtectedLayout />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function PublicRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  );
  if (user) return <Navigate to="/dashboard" replace />;
  return <Login />;
}
