import React, { useState, useEffect } from 'react';
import { useApi } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, CheckCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function Overview({ onNotificationUpdate }) {
  const api = useApi();
  const [stats, setStats] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, requestsRes] = await Promise.all([
        api.get('/stats'),
        api.get('/permits')
      ]);
      setStats(statsRes.data);
      setRecentRequests(requestsRes.data.slice(0, 5));
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Maestros',
      value: stats?.total_teachers || 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      title: 'Solicitudes Pendientes',
      value: stats?.pending_requests || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50'
    },
    {
      title: 'Permisos Activos',
      value: stats?.active_permits || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    {
      title: 'Ausencias Hoy',
      value: stats?.todays_absences || 0,
      icon: Calendar,
      color: 'text-red-600',
      bg: 'bg-red-50'
    }
  ];

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    };
    const labels = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-md border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getPermitTypeBadge = (type) => {
    return type === 'vacation_57' ? (
      <span className="px-2 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-800 border border-blue-200">
        Cláusula 57
      </span>
    ) : (
      <span className="px-2 py-1 text-xs font-medium rounded-md bg-red-100 text-red-800 border border-red-200">
        Cláusula 62
      </span>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Cargando...</div>;
  }

  return (
    <div className="p-8" data-testid="admin-overview">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Panel de Control</h1>
        <p className="text-muted-foreground">Vista general del sistema de permisos</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-border" data-testid={`stat-card-${index}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold tracking-tight tabular-nums">{stat.value}</p>
                </div>
                <div className={`${stat.bg} p-3 rounded-lg`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} strokeWidth={1.5} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Requests */}
      <Card className="border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-2xl">Solicitudes Recientes</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {recentRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay solicitudes recientes</p>
          ) : (
            <div className="space-y-4">
              {recentRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
                  data-testid={`recent-request-${request.id}`}
                >
                  <div className="flex-1">
                    <p className="font-semibold">{request.teacher_name}</p>
                    <div className="flex gap-2 mt-1">
                      {getPermitTypeBadge(request.permit_type)}
                      <span className="text-sm text-muted-foreground">
                        {request.days_requested} días
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
