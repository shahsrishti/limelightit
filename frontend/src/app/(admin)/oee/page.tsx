'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { ApiResponse } from '@/types/api.types';
import { LoadingTable } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { TrendingUp, RefreshCw, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface OEESnapshot {
  id: string;
  machineId: string;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  timestamp: string;
  machine: {
    name: string;
  };
}

interface OEEResponse {
  summary: {
    averageAvailability: number | null;
    averagePerformance: number | null;
    averageQuality: number | null;
    overallOEE: number | null;
  };
  snapshots: OEESnapshot[];
}

export default function OEEPage() {
  const { data: oeeData, isLoading, error, refetch } = useQuery<OEEResponse>({
    queryKey: ['oee-snapshots-list'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<OEEResponse>>('/oee');
      return data.data;
    },
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">OEE Metrics</h2>
          <p className="text-xs text-muted-foreground">Loading plant effectiveness metrics...</p>
        </div>
        <LoadingTable rows={4} cols={4} />
      </div>
    );
  }

  if (error || !oeeData) {
    return (
      <EmptyState
        title="Failed to fetch OEE snapshots"
        description="Could not connect to the API to pull OEE metrics."
        icon={TrendingUp}
        actionText="Try Again"
        onAction={refetch}
      />
    );
  }

  const { summary, snapshots } = oeeData;

  // Group latest OEE per machine for the bar chart
  const latestMachineOEE = Object.values(
    snapshots.reduce((acc, curr) => {
      if (!acc[curr.machineId]) {
        acc[curr.machineId] = {
          name: curr.machine.name,
          OEE: Math.round(curr.oee * 100),
          Availability: Math.round(curr.availability * 100),
          Performance: Math.round(curr.performance * 100),
          Quality: Math.round(curr.quality * 100),
        };
      }
      return acc;
    }, {} as Record<string, any>)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">OEE Metrics</h2>
          <p className="text-xs text-muted-foreground">Compute Availability, Performance, and Quality factors across your fleet.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="flex items-center space-x-1">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {snapshots.length === 0 ? (
        <EmptyState
          title="No OEE Records"
          description="Operational metrics snapshots will populate automatically as telemetry runs."
          icon={TrendingUp}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border border-border/60 bg-card/60 backdrop-blur-sm p-5 space-y-1.5 shadow-sm">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Avg OEE</span>
              <p className="text-2xl font-extrabold text-foreground">
                {summary.overallOEE !== null ? `${(summary.overallOEE * 100).toFixed(1)}%` : '--'}
              </p>
              <p className="text-[10px] text-muted-foreground">Overall equipment effectiveness</p>
            </Card>

            <Card className="border border-border/60 bg-card/60 backdrop-blur-sm p-5 space-y-1.5 shadow-sm">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Availability</span>
              <p className="text-2xl font-extrabold text-emerald-500">
                {summary.averageAvailability !== null ? `${(summary.averageAvailability * 100).toFixed(1)}%` : '--'}
              </p>
              <p className="text-[10px] text-muted-foreground">Proportion of scheduled runtime active</p>
            </Card>

            <Card className="border border-border/60 bg-card/60 backdrop-blur-sm p-5 space-y-1.5 shadow-sm">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Performance</span>
              <p className="text-2xl font-extrabold text-blue-500">
                {summary.averagePerformance !== null ? `${(summary.averagePerformance * 100).toFixed(1)}%` : '--'}
              </p>
              <p className="text-[10px] text-muted-foreground">Operating speed relative to design speed</p>
            </Card>

            <Card className="border border-border/60 bg-card/60 backdrop-blur-sm p-5 space-y-1.5 shadow-sm">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Quality</span>
              <p className="text-2xl font-extrabold text-purple-500">
                {summary.averageQuality !== null ? `${(summary.averageQuality * 100).toFixed(1)}%` : '--'}
              </p>
              <p className="text-[10px] text-muted-foreground">Defect-free parts produced vs total</p>
            </Card>
          </div>

          <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center space-x-2">
                <Gauge className="h-4.5 w-4.5 text-primary" />
                <span>OEE Factor Distribution</span>
              </CardTitle>
              <CardDescription>Comparison of OEE components per machine.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={latestMachineOEE}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />
                    <XAxis dataKey="name" className="text-[10px] text-muted-foreground" />
                    <YAxis className="text-[10px] text-muted-foreground" unit="%" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                      }}
                    />
                    <Legend className="text-xs" iconSize={10} iconType="circle" />
                    <Bar dataKey="OEE" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Availability" fill="hsl(var(--status-running))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Performance" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Quality" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
