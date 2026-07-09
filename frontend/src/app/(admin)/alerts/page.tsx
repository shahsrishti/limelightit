'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { ApiResponse } from '@/types/api.types';
import { LoadingTable } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSocket } from '@/hooks/useSocket';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { toast } from 'sonner';

interface AlertItem {
  id: string;
  machineId: string;
  type: string;
  message: string;
  resolved: boolean;
  timestamp: string;
  machine: {
    name: string;
  };
}

export default function AlertsPage() {
  const queryClient = useQueryClient();

  const { data: alerts, isLoading, error, refetch } = useQuery<AlertItem[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<AlertItem[]>>('/alerts', {
        params: { resolved: 'false' }, // Display active unresolved alerts
      });
      return data.data;
    },
    refetchInterval: 10000,
  });

  // Real-time alert trigger
  useSocket('alert:new', () => {
    refetch();
  });

  const resolveMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { data } = await apiClient.patch(`/alerts/${alertId}/resolve`);
      return data;
    },
    onSuccess: () => {
      toast.success('Alert resolved successfully');
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
    onError: () => {
      toast.error('Failed to resolve alert');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Active Alerts</h2>
          <p className="text-xs text-muted-foreground">Loading active alerts control room...</p>
        </div>
        <LoadingTable rows={4} cols={4} />
      </div>
    );
  }

  if (error || !alerts) {
    return (
      <EmptyState
        title="Failed to fetch alerts"
        description="Could not connect to the API to pull alerts."
        icon={AlertTriangle}
        actionText="Try Again"
        onAction={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Active Alerts</h2>
          <p className="text-xs text-muted-foreground">View and acknowledge critical threshold breaches in real-time.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="flex items-center space-x-1">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          title="No Active Alerts"
          description="All systems are running normally. No warnings reported."
          icon={CheckCircle}
        />
      ) : (
        <div className="grid gap-4">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className={`border-l-4 bg-card/60 backdrop-blur-sm shadow-sm transition-all duration-200 ${
                alert.type === 'CRITICAL'
                  ? 'border-l-rose-500 border-border/60 hover:border-l-rose-600'
                  : 'border-l-amber-500 border-border/60 hover:border-l-amber-600'
              }`}
            >
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        alert.type === 'CRITICAL'
                          ? 'bg-rose-500/10 text-rose-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}
                    >
                      {alert.type}
                    </span>
                    <span className="text-xs font-semibold text-foreground/80">{alert.machine.name}</span>
                  </div>
                  <p className="font-semibold text-sm text-foreground">{alert.message}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Triggered at {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => resolveMutation.mutate(alert.id)}
                  disabled={resolveMutation.isPending}
                  className="bg-primary/95 hover:bg-primary font-semibold text-xs h-8 px-4"
                >
                  Acknowledge & Resolve
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
