import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useAuth, useApi } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bell, Users, Calendar, FileText, LogOut, Menu, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Overview from '@/components/admin/Overview';
import Teachers from '@/components/admin/Teachers';
import Requests from '@/components/admin/Requests';
import CalendarView from '@/components/admin/CalendarView';
import Notifications from '@/components/admin/Notifications';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const api = useApi();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications');
      const unread = response.data.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/admin', label: 'Inicio', icon: FileText },
    { path: '/admin/teachers', label: 'Maestros', icon: Users },
    { path: '/admin/requests', label: 'Solicitudes', icon: FileText },
    { path: '/admin/calendar', label: 'Calendario', icon: Calendar },
    { path: '/admin/notifications', label: 'Notificaciones', icon: Bell, badge: unreadCount }
  ];

  return (
    <div className="flex h-screen bg-background" data-testid="admin-dashboard">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-border">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Panel Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Sistema de Permisos</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent'
                }`
              }
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              {({ isActive }) => (
                <>
                  <item.icon className="h-5 w-5" strokeWidth={1.5} />
                  <span className="font-medium">{item.label}</span>
                  {item.badge > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user?.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full"
            data-testid="logout-button"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-border">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold text-primary">Panel Admin</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-white">
          <div className="flex flex-col h-full pt-16">
            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-accent'
                    }`
                  }
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                  {item.badge > 0 && <Badge variant="destructive">{item.badge}</Badge>}
                </NavLink>
              ))}
            </nav>
            <div className="p-4 border-t">
              <Button onClick={handleLogout} variant="outline" className="w-full">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto lg:pt-0 pt-16">
        <Routes>
          <Route path="/" element={<Overview onNotificationUpdate={fetchUnreadCount} />} />
          <Route path="/teachers" element={<Teachers />} />
          <Route path="/requests" element={<Requests onRequestUpdate={fetchUnreadCount} />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/notifications" element={<Notifications onNotificationRead={fetchUnreadCount} />} />
        </Routes>
      </main>
    </div>
  );
}
