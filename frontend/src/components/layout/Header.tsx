'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { Breadcrumb } from './Breadcrumb';
import { NotificationPanel } from './NotificationPanel';
import { UserMenu } from './UserMenu';
import { Button } from '../ui/Button';
import { Moon, Sun, Menu } from 'lucide-react';
import { useUIStore } from '@/store/ui.store';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { toggleSidebar } = useUIStore();

  return (
    <header className="flex h-16 w-full items-center justify-between border-b px-4 md:px-6 bg-card text-card-foreground relative z-20 shadow-sm">
      {/* Left side: Mobile menu trigger + Breadcrumbs */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="lg:hidden hover:bg-accent rounded-lg"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden sm:block">
          <Breadcrumb />
        </div>
      </div>

      {/* Right side: Actions & User Panel */}
      <div className="flex items-center space-x-3.5">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-accent rounded-full text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-4.5 w-4.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4.5 w-4.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <NotificationPanel />

        {/* Separator */}
        <div className="h-5 w-px bg-border" />

        {/* User profile dropdown */}
        <UserMenu />
      </div>
    </header>
  );
}
