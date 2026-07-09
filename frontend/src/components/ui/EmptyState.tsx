'use client';

import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({
  title = 'No data available',
  description = 'There are no records to display at this time.',
  icon: Icon = Inbox,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center bg-card/30">
      <div className="mb-4 rounded-full bg-muted p-3 text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mb-1 text-sm font-semibold tracking-tight">{title}</h3>
      <p className="mb-6 max-w-sm text-xs text-muted-foreground">{description}</p>
      {actionText && onAction && (
        <Button onClick={onAction} size="sm" variant="outline">
          {actionText}
        </Button>
      )}
    </div>
  );
}
