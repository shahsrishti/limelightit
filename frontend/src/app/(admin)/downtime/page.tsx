'use client';

import React from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Clock } from 'lucide-react';

export default function DowntimePage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Downtime Logs</h2>
        <p className="text-xs text-muted-foreground">Log and categorize unexpected stops and maintenance cycles.</p>
      </div>
      <EmptyState
        title="Downtime Event Tracking"
        description="This component is ready to handle reason categorization, event duration tracking, and offline root-cause analysis in Phase 5."
        icon={Clock}
      />
    </div>
  );
}
