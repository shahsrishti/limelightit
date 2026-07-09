'use client';

import React from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { TrendingUp } from 'lucide-react';

export default function OEEPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">OEE Metrics</h2>
        <p className="text-xs text-muted-foreground">Compute Availability, Performance, and Quality factors.</p>
      </div>
      <EmptyState
        title="Overall Equipment Effectiveness"
        description="This component is ready to draw historical graphs representing Availability, Performance, and Quality factors in Phase 5."
        icon={TrendingUp}
      />
    </div>
  );
}
