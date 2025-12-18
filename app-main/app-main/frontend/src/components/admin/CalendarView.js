import React, { useState, useEffect } from 'react';
import { useApi } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CalendarView() {
  const api = useApi();
  const [permits, setPermits] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPermits();
  }, []);

  const fetchPermits = async () => {
    try {
      const response = await api.get('/permits');
      const approved = response.data.filter(p => p.status === 'approved');
      setPermits(approved);
    } catch (error) {
      toast.error('Error al cargar permisos');
    } finally {
      setLoading(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getPermitsForDay = (day) => {
    return permits.filter(permit => {
      const start = parseISO(permit.start_date);
      const end = parseISO(permit.end_date);
      return day >= start && day <= end;
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  if (loading) {
    return <div className="flex items-center justify-center h-full">Cargando...</div>;
  }

  return (
    <div className="p-8" data-testid="calendar-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Calendario de Permisos</h1>
        <p className="text-muted-foreground">Vista mensual de todos los permisos aprobados</p>
      </div>

      <Card className="border-border">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={previousMonth} data-testid="prev-month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth} data-testid="next-month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                {day}
              </div>
            ))}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {daysInMonth.map((day) => {
              const dayPermits = getPermitsForDay(day);
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={day.toString()}
                  className={`aspect-square border rounded-lg p-2 ${
                    isToday ? 'border-primary border-2 bg-accent' : 'border-border'
                  }`}
                  data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                >
                  <div className="text-sm font-medium mb-1">{format(day, 'd')}</div>
                  {dayPermits.length > 0 && (
                    <div className="space-y-1">
                      {dayPermits.slice(0, 2).map((permit) => (
                        <div
                          key={permit.id}
                          className={`text-xs px-1 py-0.5 rounded truncate ${
                            permit.permit_type === 'vacation_57'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                          title={permit.teacher_name}
                        >
                          {permit.teacher_name}
                        </div>
                      ))}
                      {dayPermits.length > 2 && (
                        <div className="text-xs text-muted-foreground px-1">
                          +{dayPermits.length - 2} más
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="border-border mt-6">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Leyenda</h3>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-100 border border-blue-200"></div>
              <span className="text-sm">Cláusula 57 - Vacaciones</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100 border border-red-200"></div>
              <span className="text-sm">Cláusula 62 - Económicos</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
