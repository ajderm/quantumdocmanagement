import { ReactNode } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Settings, 
  Building2, 
  CreditCard, 
  LogOut, 
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/dashboard', label: 'Documents', icon: FileText },
  { href: '/settings/account', label: 'Account Settings', icon: Building2 },
  { href: '/settings/leasing', label: 'Leasing Partners', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/20" />
          <div className="h-4 w-24 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between h-16 px-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold">DocGen</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-64 bg-sidebar transform transition-transform duration-200 lg:translate-x-0 lg:static',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Sidebar header */}
          <div className="hidden lg:flex items-center gap-3 h-16 px-6 border-b border-sidebar-border">
            <div className="h-9 w-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <FileText className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <span className="font-display font-semibold text-sidebar-foreground">DocGen</span>
              <p className="text-xs text-sidebar-foreground/60">Document Generator</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1 mt-16 lg:mt-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href || 
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 mb-3 px-3">
              <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="text-xs font-medium text-sidebar-foreground">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user.user_metadata?.full_name || user.email}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-h-screen lg:min-h-[calc(100vh)]">
          {children}
        </main>
      </div>
    </div>
  );
}