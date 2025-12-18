import React, { useState, useEffect } from 'react';
import { useAuth, useApi } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Calendar, Plus, Award } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function TeacherOverview({ onNotificationUpdate }) {
  const { user } = useAuth();
  const api = useApi();
  const [daysAvailable, setDaysAvailable] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    permit_type: 'vacation_57',
    start_date: '',
    end_date: '',
    days_requested: 1,
    reason: ''
  });

  useEffect(() => {
    fetchDaysAvailable();
  }, []);

  const fetchDaysAvailable = async () => {
    try {
      const response = await api.get(`/teachers/${user.id}/days`);
      setDaysAvailable(response.data);
    } catch (error) {
      toast.error('Error al cargar días disponibles');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/permits', {
        ...formData,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString()
      });
      toast.success('Solicitud enviada exitosamente');
      setDialogOpen(false);
      setFormData({
        permit_type: 'vacation_57',
        start_date: '',
        end_date: '',
        days_requested: 1,
        reason: ''
      });
      fetchDaysAvailable();
      if (onNotificationUpdate) onNotificationUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al enviar solicitud');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Cargando...</div>;
  }

  const vacationPercentage = daysAvailable.total_vacation > 0 
    ? ((daysAvailable.vacation_period_1 + daysAvailable.vacation_period_2 + daysAvailable.vacation_additional) / daysAvailable.total_vacation * 100)
    : 0;
  const economicPercentage = daysAvailable.total_economic > 0
    ? (daysAvailable.economic_days / daysAvailable.total_economic * 100)
    : 0;

  return (
    <div className="p-8" data-testid="teacher-overview">
      {/* Welcome Banner */}
      <div className="relative mb-8 rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70 z-10"></div>
        <img
          src="https://images.unsplash.com/photo-1758270704025-0e1a1793e1ca"
          alt="Welcome"
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 z-20 flex flex-col justify-center p-8 text-white">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Bienvenido, {user?.name}</h1>
          <p className="text-xl text-blue-50">Gestiona tus permisos y vacaciones</p>
        </div>
      </div>

      {/* Quick Action */}
      <div className="mb-8">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="h-14 text-lg" data-testid="request-permit-button">
              <Plus className="mr-2 h-6 w-6" />
              Solicitar Permiso
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl">Nueva Solicitud de Permiso</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="permit-form">
              <div className="space-y-2">
                <Label htmlFor="permit_type">Tipo de Permiso</Label>
                <Select
                  value={formData.permit_type}
                  onValueChange={(value) => setFormData({ ...formData, permit_type: value })}
                >
                  <SelectTrigger data-testid="permit-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacation_57">Cláusula 57 - Vacaciones</SelectItem>
                    <SelectItem value="economic_62">Cláusula 62 - Económicos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Fecha Inicio</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                    data-testid="start-date-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Fecha Fin</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                    data-testid="end-date-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="days_requested">Días Solicitados</Label>
                <Input
                  id="days_requested"
                  type="number"
                  min="1"
                  value={formData.days_requested}
                  onChange={(e) => setFormData({ ...formData, days_requested: parseInt(e.target.value) })}
                  required
                  data-testid="days-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                  rows={4}
                  data-testid="reason-input"
                />
              </div>
              <Button type="submit" className="w-full" data-testid="submit-permit-button">
                Enviar Solicitud
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Clause 57 - Vacations */}
        <Card className="border-blue-200 border-2" data-testid="vacation-card">
          <CardHeader className="border-b border-blue-100 bg-blue-50">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              Cláusula 57 - Vacaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="text-center py-6">
              <p className="text-6xl font-bold text-blue-600 tabular-nums">
                {daysAvailable.vacation_period_1 + daysAvailable.vacation_period_2 + daysAvailable.vacation_additional}
              </p>
              <p className="text-lg text-muted-foreground mt-2">Días Disponibles</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Período 1</span>
                  <span className="tabular-nums">{daysAvailable.vacation_period_1} / 10 días</span>
                </div>
                <Progress value={(daysAvailable.vacation_period_1 / 10) * 100} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Período 2</span>
                  <span className="tabular-nums">{daysAvailable.vacation_period_2} / 10 días</span>
                </div>
                <Progress value={(daysAvailable.vacation_period_2 / 10) * 100} className="h-2" />
              </div>
              
              {daysAvailable.vacation_additional > 0 && (
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium text-sm">Días Adicionales por Antigüedad</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600 tabular-nums">
                    {daysAvailable.vacation_additional} días
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Clause 62 - Economic Days */}
        <Card className="border-red-200 border-2" data-testid="economic-card">
          <CardHeader className="border-b border-red-100 bg-red-50">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Calendar className="h-6 w-6 text-red-600" />
              Cláusula 62 - Económicos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="text-center py-6">
              <p className="text-6xl font-bold text-red-600 tabular-nums">
                {daysAvailable.economic_days}
              </p>
              <p className="text-lg text-muted-foreground mt-2">Días Disponibles</p>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Utilizados</span>
                <span className="tabular-nums">
                  {daysAvailable.total_economic - daysAvailable.economic_days} / {daysAvailable.total_economic} días
                </span>
              </div>
              <Progress value={economicPercentage} className="h-3" />
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                Los días económicos son para motivos personales o familiares y no pueden sumarse a los períodos vacacionales.
              </p>
              <p className="text-sm font-medium">
                Base: 8 días + 1 día por cada 10 años de antigüedad
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
