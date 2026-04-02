// src/pages/Notifications.tsx
import { useEffect, useState } from 'react';
import { notificationApi, Notification } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Loader2 } from 'lucide-react';

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    notificationApi.list()
      .then(r => setNotifications(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    await notificationApi.markAllRead();
    load();
  };

  const markRead = async (id: number) => {
    await notificationApi.markRead(id);
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-2 divide-y">
          {notifications.length === 0 && (
            <div className="py-12 text-center">
              <BellOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            </div>
          )}
          {notifications.map(n => (
            <div
              key={n.id}
              className={`py-3 flex items-start gap-3 cursor-pointer ${
                !n.is_read ? 'opacity-100' : 'opacity-60'
              }`}
              onClick={() => !n.is_read && markRead(n.id)}
            >
              <div className={`mt-0.5 p-1.5 rounded-full ${n.is_read ? 'bg-muted' : 'bg-primary/10'}`}>
                <Bell className={`w-3.5 h-3.5 ${n.is_read ? 'text-muted-foreground' : 'text-primary'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${!n.is_read ? 'font-medium' : ''}`}>
                  {n.message}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(n.sent_at).toLocaleString()}
                </p>
              </div>
              {!n.is_read && (
                <Badge className="bg-primary/10 text-primary border-0 text-[10px] shrink-0">New</Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
