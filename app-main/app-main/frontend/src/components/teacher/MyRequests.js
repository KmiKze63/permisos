import React, { useState, useEffect } from 'react';
import { useApi } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MyRequests({ onRequestUpdate }) {
  const api = useApi();
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPermits();
  }, []);

  const fetchPermits = async () => {
    try {
      const response = await api.get('/permits');
      setPermits(response.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (error) {
      toast.error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200', icon: Clock },
      approved: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', icon: CheckCircle },
      rejected: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', icon: XCircle }
    };
    const labels = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' };
    const StatusIcon = styles[status].icon;
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-md border ${styles[status].bg} ${styles[status].text} ${styles[status].border}`}>
        <StatusIcon className="h-4 w-4" />
        <span className="font-medium">{labels[status]}</span>
      </div>
    );
  };

  const getPermitTypeBadge = (type) => {
    return type === 'vacation_57' ? (
      <span className="px-3 py-1 text-sm font-medium rounded-md bg-blue-100 text-blue-800 border border-blue-200">
        Cláusula 57 - Vacaciones
      </span>
    ) : (
      <span className="px-3 py-1 text-sm font-medium rounded-md bg-red-100 text-red-800 border border-red-200">
        Cláusula 62 - Económicos
      </span>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Cargando...</div>;
  }

  return (
    <div className="p-8" data-testid="my-requests-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Mis Solicitudes</h1>
        <p className="text-muted-foreground">Historial de solicitudes de permisos</p>
      </div>

      <div className="space-y-4">
        {permits.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
              <p className="text-lg text-muted-foreground">No tienes solicitudes aún</p>
            </CardContent>
          </Card>
        ) : (
          permits.map((permit) => (
            <Card key={permit.id} className="border-border" data-testid={`permit-${permit.id}`}>
              <CardHeader className="border-b border-border bg-accent/30">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Solicitud de Permiso</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Solicitado el {format(new Date(permit.created_at), 'dd MMMM yyyy, HH:mm', { locale: es })}
                    </p>
                  </div>
                  {getStatusBadge(permit.status)}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Tipo de Permiso</p>
                      {getPermitTypeBadge(permit.permit_type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Período</p>
                      <p className="text-base">
                        {format(new Date(permit.start_date), 'dd MMM yyyy', { locale: es })} -{' '}
                        {format(new Date(permit.end_date), 'dd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Días Solicitados</p>
                      <p className="text-2xl font-bold tabular-nums">{permit.days_requested}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Motivo</p>
                      <p className="text-base">{permit.reason}</p>
                    </div>
                    {permit.reviewed_by && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Revisado por</p>
                        <p className="text-base">
                          {permit.reviewed_by} - {format(new Date(permit.reviewed_at), 'dd MMM yyyy', { locale: es })}
                        </p>
                      </div>
                    )}
                    {permit.rejection_reason && (
                      <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                        <p className="text-sm font-medium text-red-900 mb-1">Motivo de Rechazo</p>
                        <p className="text-sm text-red-700">{permit.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
