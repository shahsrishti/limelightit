'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { ApiResponse } from '@/types/api.types';
import { LoadingTable } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSocket } from '@/hooks/useSocket';
import { Clock, RefreshCw, AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

interface DowntimeSession {
  id: string;
  machineId: string;
  startTime: string;
  endTime: string | null;
  reason: string | null;
  machine: {
    name: string;
  };
}

export default function DowntimePage() {
  const { data: sessions, isLoading, error, refetch } = useQuery<DowntimeSession[]>({
    queryKey: ['downtime-sessions'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<DowntimeSession[]>>('/downtime');
      return data.data;
    },
    refetchInterval: 10000,
  });

  // Real-time downtime triggers
  useSocket('downtime:start', () => refetch());
  useSocket('downtime:end', () => refetch());

  const formatDuration = (startStr: string, endStr: string | null) => {
    const start = new Date(startStr).getTime();
    const end = endStr ? new Date(endStr).getTime() : Date.now();
    const diffMs = end - start;
    
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    }
    if (diffMins > 0) {
      return `${diffMins}m`;
    }
    return `${diffSecs}s`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Downtime Logs</h2>
          <p className="text-xs text-muted-foreground">Loading historical downtime logs...</p>
        </div>
        <LoadingTable rows={4} cols={4} />
      </div>
    );
  }

  if (error || !sessions) {
    return (
      <EmptyState
        title="Failed to fetch logs"
        description="Could not connect to the API to pull downtime sessions."
        icon={Clock}
        actionText="Try Again"
        onAction={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Downtime Logs</h2>
          <p className="text-xs text-muted-foreground">Log and categorize unexpected stops and maintenance cycles.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="flex items-center space-x-1">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          title="No Downtime Logged"
          description="Your plant floor has had 100% continuous runtime. No downtime sessions recorded."
          icon={Clock}
        />
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <Card
              key={session.id}
              className={`border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm transition-all duration-200 ${
                !session.endTime ? 'ring-1 ring-amber-500/25 border-amber-500/30' : ''
              }`}
            >
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2.5">
                    <h3 className="font-bold text-sm text-foreground">{session.machine.name}</h3>
                    <span className="text-[10px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded">
                      {session.machineId}
                    </span>
                    {!session.endTime ? (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                    ) : null}
                  </div>
                  <p className="font-semibold text-xs text-foreground/80">
                    Reason: <span className="font-normal text-muted-foreground">{session.reason || 'Unspecified Halt'}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Start: <span className="font-medium">{new Date(session.startTime).toLocaleString()}</span>
                    {session.endTime && (
                      <>
                        {' • '}End: <span className="font-medium">{new Date(session.endTime).toLocaleString()}</span>
                      </>
                    )}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Duration</p>
                  <p className={`text-base font-extrabold ${!session.endTime ? 'text-amber-500' : 'text-foreground'}`}>
                    {formatDuration(session.startTime, session.endTime)}
                  </p>
                  {!session.endTime && (
                    <span className="inline-block text-[9px] font-bold text-amber-500 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-full mt-1.5">
                      Active Halt
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
