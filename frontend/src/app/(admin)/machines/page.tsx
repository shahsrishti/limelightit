'use client';

import React from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Cpu } from 'lucide-react';

export default function MachinesPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Machine Fleet</h2>
        <p className="text-xs text-muted-foreground">Manage and observe machine entities across all factories.</p>
      </div>
      <EmptyState
        title="Machines Detail View"
        description="This component is ready to receive dynamic machine lists and detailed telemetry telemetry panels in Phase 5."
        icon={Cpu}
      />
    </div>
  );
}
