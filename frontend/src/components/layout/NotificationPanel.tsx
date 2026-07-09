'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useUIStore } from '@/store/ui.store';
import { Bell, Check, Trash2, X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDays}d ago`;
  } catch {
    return 'Recently';
  }
}

export function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, markNotificationRead, clearNotifications, unreadCount } = useUIStore();
  const count = unreadCount();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-rose-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative hover:bg-accent hover:text-accent-foreground rounded-full"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-background animate-pulse-ring">
            {count}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2.5 w-80 sm:w-96 origin-top-right rounded-xl border bg-card text-card-foreground shadow-lg ring-1 ring-black/5 focus:outline-none z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm">Notifications</span>
                {count > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {count} new
                  </span>
                )}
              </div>
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearNotifications}
                  className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 flex items-center space-x-1 h-7 px-2"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Clear all</span>
                </Button>
              )}
            </div>

            <div className="max-h-[350px] overflow-y-auto divide-y">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-medium">All caught up!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">No new system alerts or notifications.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      'flex items-start gap-3 p-4 hover:bg-accent/40 transition-colors',
                      !n.read && 'bg-primary/5 hover:bg-primary/10'
                    )}
                  >
                    <div className="mt-0.5">{getAlertIcon(n.type)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className={cn('text-xs font-semibold', !n.read && 'text-foreground', n.read && 'text-muted-foreground')}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground">
                          {formatRelativeTime(n.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {n.message}
                      </p>
                      {!n.read && (
                        <button
                          onClick={() => markNotificationRead(n.id)}
                          className="mt-1 flex items-center text-[10px] font-semibold text-primary hover:underline"
                        >
                          <Check className="mr-0.5 h-3 w-3" />
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
