'use client';

import React from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Flame } from 'lucide-react';

export default function EnergyPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Energy Consumption</h2>
        <p className="text-xs text-muted-foreground">Monitor real-time energy profiles and active power draw.</p>
      </div>
      <EmptyState
        title="Power Analytics"
        description="This component is ready to aggregate kilowatt-hour graphs and estimate total operational utility costs in Phase 5."
        icon={Flame}
      />
    </div>
  );
}
