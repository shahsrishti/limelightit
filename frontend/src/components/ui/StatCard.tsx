'use client';

import * as React from 'react';
import { Card, CardContent } from './Card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    type: 'up' | 'down' | 'neutral';
  };
  loading?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  loading = false,
  className,
}: StatCardProps) {
  if (loading) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn('overflow-hidden hover:shadow-md transition-shadow duration-200', className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
            </div>
            <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
              <Icon className="h-5 w-5" />
            </div>
          </div>
          {(description || trend) && (
            <div className="mt-4 flex items-center space-x-2 text-xs">
              {trend && (
                <span
                  className={cn(
                    'font-semibold px-1.5 py-0.5 rounded flex items-center',
                    trend.type === 'up'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : trend.type === 'down'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {trend.type === 'up' && '+'}
                  {trend.value}%
                </span>
              )}
              {description && <span className="text-muted-foreground">{description}</span>}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
