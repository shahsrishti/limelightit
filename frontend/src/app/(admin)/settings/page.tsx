'use client';

import React from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>
        <p className="text-xs text-muted-foreground">Adjust system integration configurations and thresholds.</p>
      </div>
      <EmptyState
        title="Admin Settings & Thresholds"
        description="This component is ready to support threshold tuning, broker configs, and system preference edits in Phase 5."
        icon={Settings}
      />
    </div>
  );
}
