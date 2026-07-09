'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { MachineStatus } from '@/types/dashboard.types';

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: MachineStatus | string;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const getStatusColor = (s: string) => {
    switch (s.toUpperCase()) {
      case 'RUNNING':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'IDLE':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'STOPPED':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'ERROR':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider',
        getStatusColor(status),
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'mr-1.5 h-1.5 w-1.5 rounded-full',
          status.toUpperCase() === 'RUNNING' && 'bg-emerald-500 live-indicator',
          status.toUpperCase() === 'IDLE' && 'bg-amber-500',
          status.toUpperCase() === 'STOPPED' && 'bg-slate-400',
          status.toUpperCase() === 'ERROR' && 'bg-rose-500 animate-pulse'
        )}
      />
      {status.toLowerCase()}
    </span>
  );
}
