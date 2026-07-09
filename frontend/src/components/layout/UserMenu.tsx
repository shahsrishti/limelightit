'use client';

import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, User, Settings, Shield } from 'lucide-react';
import { Avatar, AvatarFallback } from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';

export function UserMenu() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || user.email.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center space-x-2 focus:outline-none hover:opacity-95 transition-opacity">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold text-xs select-none">
            {initials}
          </div>
          <div className="hidden md:flex flex-col items-start text-left">
            <span className="text-xs font-semibold leading-none text-foreground">
              {user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.email}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium capitalize mt-0.5">
              {user.role.name.toLowerCase().replace('_', ' ')}
            </span>
          </div>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="w-56 rounded-xl border bg-card text-card-foreground p-1 shadow-lg z-50 animate-in fade-in-50 slide-in-from-top-1"
        >
          <div className="px-3 py-2 border-b mb-1">
            <p className="text-xs font-semibold text-foreground leading-none">
              {user.firstName ? `${user.firstName} ${user.lastName || ''}` : 'My Account'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 truncate">{user.email}</p>
          </div>

          <DropdownMenu.Item
            disabled
            className="flex items-center space-x-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground outline-none cursor-not-allowed"
          >
            <User className="h-4 w-4" />
            <span>Profile settings</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            disabled
            className="flex items-center space-x-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground outline-none cursor-not-allowed"
          >
            <Settings className="h-4 w-4" />
            <span>App Preferences</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            disabled
            className="flex items-center space-x-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground outline-none cursor-not-allowed"
          >
            <Shield className="h-4 w-4" />
            <span>Security logs</span>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-border my-1" />

          <DropdownMenu.Item
            onClick={logout}
            className="flex items-center space-x-2 rounded-lg px-3 py-2 text-xs font-medium text-rose-500 hover:bg-rose-500/10 focus:bg-rose-500/10 outline-none cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
