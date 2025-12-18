import React, { useState, useEffect } from 'react';
import { useApi } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bell, Check } from 'lucide-react';

export default function Notifications({ onNotificationRead }) {
  const api = useApi();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
    } catch (error) {
      toast.error('Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      if (onNotificationRead) onNotificationRead();
    } catch (error) {
      toast.error('Error al marcar notificación');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Cargando...</div>;
  }

  return (
    <div className="p-8" data-testid="notifications-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Notificaciones</h1>
        <p className="text-muted-foreground">Centro de notificaciones del sistema</p>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">No tienes notificaciones</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`border-border transition-all ${
                notification.read ? 'opacity-60' : 'bg-accent/30'
              }`}
              data-testid={`notification-${notification.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{notification.title}</h3>
                      {!notification.read && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary text-primary-foreground">
                          Nuevo
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground mb-2">{notification.message}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: es
                      })}
                    </p>
                  </div>
                  {!notification.read && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                      data-testid={`mark-read-${notification.id}`}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Marcar como leída
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
