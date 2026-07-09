'use client';

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { ApiResponse } from '@/types/api.types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingTable } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSocket } from '@/hooks/useSocket';
import { Cpu, RefreshCw, Zap, Thermometer, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

interface MachineListItem {
  id: string;
  name: string;
  factory: string;
  currentStatus: string;
  lastSeen: string | null;
  power: number | null;
  temperature: number | null;
  deviceCount: number;
}

export default function MachinesPage() {
  const { data: machines, isLoading, error, refetch } = useQuery<MachineListItem[]>({
    queryKey: ['machines'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<MachineListItem[]>>('/machines');
      return data.data;
    },
    refetchInterval: 10000,
  });

  // Real-time status update trigger
  useSocket('machine:status', () => {
    refetch();
  });

  // Real-time telemetry update trigger
  useSocket('telemetry:update', () => {
    refetch();
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Machine Fleet</h2>
          <p className="text-xs text-muted-foreground">Loading machines overview...</p>
        </div>
        <LoadingTable rows={5} cols={5} />
      </div>
    );
  }

  if (error || !machines) {
    return (
      <EmptyState
        title="Failed to fetch machines"
        description="Could not connect to the API to pull machine status."
        icon={Cpu}
        actionText="Try Again"
        onAction={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Machine Fleet</h2>
          <p className="text-xs text-muted-foreground">Manage and observe machine entities across all factories.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="flex items-center space-x-1">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {machines.length === 0 ? (
        <EmptyState
          title="No Machines Registered"
          description="Your machine fleet is currently empty. Connect an MQTT device to auto-provision."
          icon={Cpu}
        />
      ) : (
        <div className="grid gap-4">
          {machines.map((machine) => (
            <Card key={machine.id} className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm hover:border-primary/30 transition-all duration-200">
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2.5">
                    <h3 className="font-bold text-sm text-foreground">{machine.name}</h3>
                    <span className="text-[10px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded">
                      {machine.id}
                    </span>
                    <StatusBadge status={machine.currentStatus} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Factory: <span className="font-medium text-foreground/80">{machine.factory}</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-6 items-center">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4.5 w-4.5 text-amber-500" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Power Load</p>
                      <p className="text-xs font-bold text-foreground">
                        {machine.power !== null ? `${(machine.power / 1000).toFixed(2)} kW` : '--'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Thermometer className="h-4.5 w-4.5 text-rose-500" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Temp</p>
                      <p className="text-xs font-bold text-foreground">
                        {machine.temperature !== null ? `${machine.temperature.toFixed(1)} °C` : '--'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Clock className="h-4.5 w-4.5 text-blue-500" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Last Seen</p>
                      <p className="text-xs font-bold text-foreground">
                        {machine.lastSeen ? new Date(machine.lastSeen).toLocaleTimeString() : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
