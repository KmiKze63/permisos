import React, { useState, useEffect } from 'react';
import { useApi } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Requests({ onRequestUpdate }) {
  const api = useApi();
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filter, setFilter] = useState('all');

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

  const handleReview = async (permitId, status) => {
    try {
      const payload = { status };
      if (status === 'rejected' && rejectionReason) {
        payload.rejection_reason = rejectionReason;
      }
      await api.put(`/permits/${permitId}/review`, payload);
      toast.success(status === 'approved' ? 'Permiso aprobado' : 'Permiso rechazado');
      setReviewDialog(false);
      setSelectedPermit(null);
      setRejectionReason('');
      fetchPermits();
      if (onRequestUpdate) onRequestUpdate();
    } catch (error) {
      toast.error('Error al revisar permiso');
    }
  };

  const openRejectDialog = (permit) => {
    setSelectedPermit(permit);
    setReviewDialog(true);
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

  const filteredPermits = permits.filter(p => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-full">Cargando...</div>;
  }

  return (
    <div className="p-8" data-testid="requests-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Solicitudes de Permisos</h1>
        <p className="text-muted-foreground">Revisar y gestionar solicitudes</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {[{ key: 'all', label: 'Todas' }, { key: 'pending', label: 'Pendientes' }, { key: 'approved', label: 'Aprobadas' }, { key: 'rejected', label: 'Rechazadas' }].map((tab) => (
          <Button
            key={tab.key}
            variant={filter === tab.key ? 'default' : 'outline'}
            onClick={() => setFilter(tab.key)}
            data-testid={`filter-${tab.key}`}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredPermits.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center text-muted-foreground">
              No hay solicitudes para mostrar
            </CardContent>
          </Card>
        ) : (
          filteredPermits.map((permit) => (
            <Card key={permit.id} className="border-border" data-testid={`permit-${permit.id}`}>
              <CardHeader className="border-b border-border bg-accent/30">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{permit.teacher_name}</CardTitle>
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
                        <p className="text-base">{permit.reviewed_by} - {format(new Date(permit.reviewed_at), 'dd MMM yyyy', { locale: es })}</p>
                      </div>
                    )}
                    {permit.rejection_reason && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Motivo de Rechazo</p>
                        <p className="text-base text-red-600">{permit.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                </div>
                {permit.status === 'pending' && (
                  <div className="flex gap-3 mt-6 pt-6 border-t border-border">
                    <Button
                      onClick={() => handleReview(permit.id, 'approved')}
                      className="flex-1"
                      data-testid={`approve-${permit.id}`}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Aprobar
                    </Button>
                    <Button
                      onClick={() => openRejectDialog(permit)}
                      variant="destructive"
                      className="flex-1"
                      data-testid={`reject-${permit.id}`}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Rechazar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Rejection Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl">Rechazar Solicitud</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                ¿Estás seguro de rechazar la solicitud de {selectedPermit?.teacher_name}?
              </p>
              <Textarea
                placeholder="Motivo del rechazo (opcional)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                data-testid="rejection-reason-input"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setReviewDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleReview(selectedPermit?.id, 'rejected')}
                className="flex-1"
                data-testid="confirm-reject-button"
              >
                Rechazar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
