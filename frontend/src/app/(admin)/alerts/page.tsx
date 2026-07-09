'use client';

import React from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { AlertTriangle } from 'lucide-react';

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Active Alerts</h2>
        <p className="text-xs text-muted-foreground">View and acknowledge critical threshold breaches.</p>
      </div>
      <EmptyState
        title="Incident Control Room"
        description="This component is ready to support real-time threshold alert grids, filtering, and operator confirmations in Phase 5."
        icon={AlertTriangle}
      />
    </div>
  );
}
