'use client';

import React from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Users } from 'lucide-react';

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
        <p className="text-xs text-muted-foreground">Manage administrative user details and role profiles.</p>
      </div>
      <EmptyState
        title="Access Control & Profiles"
        description="This component is ready to support user creation, editing, and granular RBAC role mappings in Phase 5."
        icon={Users}
      />
    </div>
  );
}
