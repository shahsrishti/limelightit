'use client';

import React from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { HeartPulse } from 'lucide-react';

export default function DeviceHealthPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Device Health</h2>
        <p className="text-xs text-muted-foreground">Monitor ESP32 physical health metrics and MQTT transport packets.</p>
      </div>
      <EmptyState
        title="Physical Assets & Connections"
        description="This component is ready to display MQTT connections, CPU temperatures, and drop rate statistics in Phase 5."
        icon={HeartPulse}
      />
    </div>
  );
}
