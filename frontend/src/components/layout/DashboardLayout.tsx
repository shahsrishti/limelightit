'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUIStore } from '@/store/ui.store';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { X, LayoutDashboard, Cpu, HeartPulse, TrendingUp, Flame, AlertTriangle, Clock, FileSpreadsheet, Users, Settings } from 'lucide-react';
import { Button } from '../ui/Button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const menuItems: SidebarItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Machines', href: '/machines', icon: Cpu },
  { name: 'Device Health', href: '/device-health', icon: HeartPulse },
  { name: 'OEE Performance', href: '/oee', icon: TrendingUp },
  { name: 'Energy', href: '/energy', icon: Flame },
  { name: 'Alerts', href: '/alerts', icon: AlertTriangle },
  { name: 'Downtime Log', href: '/downtime', icon: Clock },
  { name: 'Reports', href: '/reports', icon: FileSpreadsheet },
  { name: 'User Management', href: '/users', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const userRole = user?.role?.name || 'VIEWER';
  const filteredItems = menuItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity duration-300 animate-in fade-in"
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border z-50 flex flex-col lg:hidden transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold">
              M
            </div>
            <span className="font-bold text-sm tracking-wide text-white">ManufactureIQ</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="hover:bg-sidebar-accent rounded-lg text-sidebar-foreground/75 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1.5 px-2 py-4 overflow-y-auto">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150 space-x-3',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-white'
                )}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Right Side Content */}
      <div className="flex flex-1 flex-col h-full overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background/50">
          <div className="max-w-[1600px] mx-auto w-full space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
