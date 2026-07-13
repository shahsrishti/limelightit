'use client';

import * as React from 'react';
import { Card, CardContent } from './Card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    type: 'up' | 'down' | 'neutral';
  };
  sparklineData?: number[];
  timestamp?: string;
  loading?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  sparklineData,
  timestamp,
  loading = false,
  className,
}: StatCardProps) {
  if (loading) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-5">
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

  // Format data for Recharts sparkline
  const chartData = sparklineData
    ? sparklineData.map((val, idx) => ({ id: idx, value: val }))
    : [];

  const trendColor = trend
    ? trend.type === 'up'
      ? 'text-emerald-500 bg-emerald-500/10'
      : trend.type === 'down'
      ? 'text-rose-500 bg-rose-500/10'
      : 'text-muted-foreground bg-muted'
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card className={cn('overflow-hidden hover:shadow-md transition-all duration-200 border-border/60 bg-card/65 backdrop-blur-sm', className)}>
        <CardContent className="p-5 flex flex-col justify-between h-full min-h-[145px]">
          {/* Header Row */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
              <h3 className="text-xl font-extrabold tracking-tight text-foreground">{value}</h3>
            </div>
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Icon className="h-4 w-4" />
            </div>
          </div>

          {/* Sparkline Visualisation */}
          {chartData.length > 0 && (
            <div className="h-9 w-full mt-2 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`sparkGlow-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={trend?.type === 'down' ? 'hsl(var(--status-error))' : 'hsl(var(--primary))'} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={trend?.type === 'down' ? 'hsl(var(--status-error))' : 'hsl(var(--primary))'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={trend?.type === 'down' ? 'hsl(var(--status-error))' : 'hsl(var(--primary))'}
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill={`url(#sparkGlow-${title.replace(/\s+/g, '')})`}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Footer Metadata */}
          <div className="mt-3 flex flex-col space-y-1 border-t border-border/10 pt-2 text-[10px]">
            <div className="flex items-center space-x-1.5">
              {trend && (
                <span className={cn('font-bold px-1 rounded', trendColor)}>
                  {trend.type === 'up' && '+'}
                  {trend.type === 'down' && '-'}
                  {trend.value}%
                </span>
              )}
              {description && <span className="text-muted-foreground font-medium">{description}</span>}
            </div>
            {timestamp && (
              <span className="text-muted-foreground/60 font-mono text-[9px]">
                Updated: {timestamp}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
