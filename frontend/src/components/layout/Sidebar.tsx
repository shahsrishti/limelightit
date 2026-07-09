'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/store/ui.store';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Cpu,
  HeartPulse,
  BarChart3,
  Flame,
  AlertTriangle,
  Clock,
  FileSpreadsheet,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';

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

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();

  const userRole = user?.role?.name || 'VIEWER';

  const filteredItems = menuItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  return (
    <div
      className={cn(
        'hidden lg:flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 relative z-30',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Sidebar Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {!sidebarCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold">
              M
            </div>
            <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              ManufactureIQ
            </span>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold">
            M
          </div>
        )}
      </div>

      {/* Sidebar Items */}
      <nav className="flex-1 space-y-1.5 px-2 py-4 overflow-y-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-white',
                sidebarCollapsed ? 'justify-center' : 'space-x-3'
              )}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {!sidebarCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-sidebar-border flex items-center justify-end">
        <button
          onClick={toggleSidebarCollapsed}
          className="rounded-lg p-1.5 bg-sidebar-accent border border-sidebar-border hover:bg-sidebar-border text-sidebar-foreground/75 hover:text-white transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
