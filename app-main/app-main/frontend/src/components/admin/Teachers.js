import React, { useState, useEffect } from 'react';
import { useApi } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { UserPlus, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Teachers() {
  const api = useApi();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    contract_type: 'full_time',
    hire_date: ''
  });

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const response = await api.get('/teachers');
      setTeachers(response.data);
    } catch (error) {
      toast.error('Error al cargar maestros');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', {
        ...formData,
        role: 'teacher',
        hire_date: formData.hire_date ? new Date(formData.hire_date).toISOString() : null
      });
      toast.success('Maestro registrado exitosamente');
      setDialogOpen(false);
      setFormData({
        email: '',
        password: '',
        name: '',
        contract_type: 'full_time',
        hire_date: ''
      });
      fetchTeachers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrar maestro');
    }
  };

  const contractTypeLabels = {
    full_time: 'Tiempo Completo',
    part_time: 'Medio Tiempo',
    hourly: 'Hora-Semana-Mes'
  };

  const getContractBadge = (type) => {
    const styles = {
      full_time: 'bg-blue-100 text-blue-800 border-blue-200',
      part_time: 'bg-purple-100 text-purple-800 border-purple-200',
      hourly: 'bg-green-100 text-green-800 border-green-200'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-md border ${styles[type]}`}>
        {contractTypeLabels[type]}
      </span>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Cargando...</div>;
  }

  return (
    <div className="p-8" data-testid="teachers-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Maestros</h1>
          <p className="text-muted-foreground">Gestión de profesores del sistema</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" data-testid="add-teacher-button">
              <UserPlus className="mr-2 h-5 w-5" />
              Agregar Maestro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl">Registrar Nuevo Maestro</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="teacher-form">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="teacher-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  data-testid="teacher-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  data-testid="teacher-password-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contract_type">Tipo de Contrato</Label>
                <Select
                  value={formData.contract_type}
                  onValueChange={(value) => setFormData({ ...formData, contract_type: value })}
                >
                  <SelectTrigger data-testid="teacher-contract-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Tiempo Completo</SelectItem>
                    <SelectItem value="part_time">Medio Tiempo</SelectItem>
                    <SelectItem value="hourly">Hora-Semana-Mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hire_date">Fecha de Contratación</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  required
                  data-testid="teacher-hire-date-input"
                />
              </div>
              <Button type="submit" className="w-full" data-testid="submit-teacher-button">
                Registrar Maestro
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-2xl">Lista de Maestros ({teachers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="flex items-center justify-between p-4 rounded-lg bg-white border border-border hover:shadow-sm transition-shadow"
                data-testid={`teacher-${teacher.id}`}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {teacher.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-lg">{teacher.name}</p>
                    <p className="text-sm text-muted-foreground">{teacher.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {teacher.contract_type && getContractBadge(teacher.contract_type)}
                  {teacher.hire_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(teacher.hire_date), 'dd MMM yyyy', { locale: es })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
