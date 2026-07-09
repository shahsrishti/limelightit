'use client';

import React from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { FileSpreadsheet } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Reports & Exports</h2>
        <p className="text-xs text-muted-foreground">Download custom shifts, production, and efficiency summaries.</p>
      </div>
      <EmptyState
        title="PDF & CSV Generator"
        description="This component is ready to trigger reporting routines and export structured machine datasets in Phase 5."
        icon={FileSpreadsheet}
      />
    </div>
  );
}
