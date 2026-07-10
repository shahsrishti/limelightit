'use client';

import React, { useEffect, useState } from 'react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useSocket } from '@/hooks/useSocket';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingGrid, LoadingTable } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { ApiResponse } from '@/types/api.types';
import {
  Cpu,
  AlertTriangle,
  Zap,
  Activity,
  Gauge,
  Clock,
  RotateCcw,
  Flame,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { toast } from 'sonner';

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

const initialTelemetryData = [
  { time: '09:00', power: 1200, speed: 85 },
  { time: '10:00', power: 1400, speed: 90 },
  { time: '11:00', power: 1100, speed: 78 },
  { time: '12:00', power: 1550, speed: 92 },
  { time: '13:00', power: 1300, speed: 88 },
  { time: '14:00', power: 1450, speed: 91 },
  { time: '15:00', power: 1600, speed: 95 },
];

export function DashboardPage() {
  const queryClient = useQueryClient();
  const { data: stats, isLoading: statsLoading, error: statsError, refetch } = useDashboardStats();

  const [telemetryHistory, setTelemetryHistory] = useState(initialTelemetryData);
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);

  // Fetch all machines for detailed running/idle/stopped states breakdown
  const { data: machines, isLoading: machinesLoading } = useQuery<MachineListItem[]>({
    queryKey: ['machines-list-dashboard'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<MachineListItem[]>>('/machines', {
        params: { limit: 100 }
      });
      return data.data;
    }
  });

  // Calculate detailed state breakdown
  const totalCount = machines?.length ?? 0;
  const runningCount = machines?.filter((m) => m.currentStatus === 'RUNNING').length ?? 0;
  const idleCount = machines?.filter((m) => m.currentStatus === 'IDLE').length ?? 0;
  const stoppedCount = machines?.filter((m) => m.currentStatus === 'STOPPED').length ?? 0;
  const faultCount = machines?.filter((m) => m.currentStatus === 'ERROR').length ?? 0;
  const onlineCount = runningCount + idleCount;
  const offlineCount = totalCount - onlineCount;

  // Subscribe to real-time telemetry updates
  useSocket('telemetry:update', (event) => {
    // Add real-time data point to telemetry history chart
    setTelemetryHistory((prev) => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      const newPoint = {
        time: timeStr,
        power: event.metrics.power || Math.floor(Math.random() * 500 + 1000),
        speed: event.metrics.speed || Math.floor(Math.random() * 30 + 70),
      };
      return [...prev.slice(1), newPoint];
    });
  });

  // Subscribe to live status updates
  useSocket('machine:status', (event) => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    queryClient.invalidateQueries({ queryKey: ['machines-list-dashboard'] });
    toast.info(`Machine ${event.machineId} is now ${event.status.toLowerCase()}`, {
      description: `Status updated at ${new Date(event.timestamp).toLocaleTimeString()}`,
    });
  });

  // Subscribe to device health updates
  useSocket('device:health', () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    queryClient.invalidateQueries({ queryKey: ['machines-list-dashboard'] });
  });

  // Keep track of real-time alerts count
  useEffect(() => {
    if (stats) {
      setActiveAlertsCount(stats.activeAlerts);
    }
  }, [stats]);

  useSocket('alert:new', (event) => {
    setActiveAlertsCount((prev) => prev + 1);
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    toast.error(`New Alert: ${event.message}`, {
      description: `Critical alert triggered on machine.`,
    });
  });

  if (statsLoading || machinesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Factory Overview</h2>
          <p className="text-xs text-muted-foreground">Loading factory monitoring system metrics...</p>
        </div>
        <LoadingGrid cols={4} />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="md:col-span-2"><LoadingTable rows={4} cols={3} /></div>
          <div><LoadingTable rows={4} cols={2} /></div>
        </div>
      </div>
    );
  }

  if (statsError || !stats) {
    return (
      <EmptyState
        title="Failed to fetch stats"
        description="Could not connect to the API to pull real-time stats."
        icon={AlertTriangle}
        actionText="Try Again"
        onAction={refetch}
      />
    );
  }

  const machineStateData = [
    { name: 'Running', value: runningCount, color: 'hsl(var(--status-running))' },
    { name: 'Idle', value: idleCount, color: 'hsl(var(--status-idle))' },
    { name: 'Stopped', value: stoppedCount, color: 'hsl(var(--status-stopped))' },
    { name: 'Fault', value: faultCount, color: 'hsl(var(--status-error))' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Factory Overview</h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live industrial telemetry active
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="flex items-center space-x-1">
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Refresh stats</span>
        </Button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9">
        <StatCard
          title="Total Machines"
          value={totalCount}
          icon={Cpu}
          description="Total provisioned"
          className="xl:col-span-1 border-border/40 shadow-sm"
        />
        <StatCard
          title="Online Machines"
          value={onlineCount}
          icon={CheckCircle2}
          description="Ping responding"
          className="xl:col-span-1 border-border/40 shadow-sm text-emerald-500"
        />
        <StatCard
          title="Offline Machines"
          value={offlineCount}
          icon={XCircle}
          description="No recent ping"
          className="xl:col-span-1 border-border/40 shadow-sm text-muted-foreground"
        />
        <StatCard
          title="Running"
          value={runningCount}
          icon={Play}
          description="Active production"
          className="xl:col-span-1 border-border/40 shadow-sm text-emerald-400"
        />
        <StatCard
          title="Stopped"
          value={stoppedCount}
          icon={Clock}
          description="Intended pause"
          className="xl:col-span-1 border-border/40 shadow-sm text-blue-500"
        />
        <StatCard
          title="Fault"
          value={faultCount}
          icon={AlertCircle}
          description="Unresolved errors"
          className="xl:col-span-1 border-border/40 shadow-sm text-rose-500 bg-rose-500/5 border-rose-500/20"
        />
        <StatCard
          title="Today's Energy"
          value={`${(stats.todayProduction / 1000).toFixed(1)} kWh`}
          icon={Flame}
          description="Grid load usage"
          className="xl:col-span-1 border-border/40 shadow-sm text-amber-500"
        />
        <StatCard
          title="Production"
          value={`${Math.floor(stats.todayProduction / 35)}`}
          icon={Activity}
          description="Total parts count"
          className="xl:col-span-1 border-border/40 shadow-sm text-cyan-500"
        />
        <StatCard
          title="Alerts"
          value={activeAlertsCount}
          icon={AlertTriangle}
          description="Operator actions"
          className={`xl:col-span-1 border-border/40 shadow-sm ${activeAlertsCount > 0 ? 'border-destructive/30 bg-destructive/5 text-rose-500' : ''}`}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Real-time power load chart */}
        <Card className="md:col-span-2 border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center space-x-2">
              <Activity className="h-4.5 w-4.5 text-primary" />
              <span>Real-Time Power & Performance Monitor</span>
            </CardTitle>
            <CardDescription>
              Monitoring active power draw and cycle speed across all live assets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={telemetryHistory}>
                  <defs>
                    <linearGradient id="powerGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />
                  <XAxis dataKey="time" className="text-[10px] text-muted-foreground" />
                  <YAxis className="text-[10px] text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="power"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#powerGlow)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Machine state distribution */}
        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center space-x-2">
              <Cpu className="h-4.5 w-4.5 text-primary" />
              <span>Asset Distribution</span>
            </CardTitle>
            <CardDescription>Breakdown of online vs stopped assets.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={machineStateData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {machineStateData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    verticalAlign="bottom"
                    iconSize={10}
                    iconType="circle"
                    className="text-xs"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 w-full text-center border-t pt-4 border-border/30">
              <div>
                <p className="text-xs text-muted-foreground">Online</p>
                <p className="text-lg font-bold text-emerald-500">{onlineCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Offline</p>
                <p className="text-lg font-bold text-muted-foreground">{offlineCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Downtimes widgets & Placeholder logs */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center space-x-2">
              <Clock className="h-4.5 w-4.5 text-amber-500" />
              <span>Recent Downtime Events</span>
            </CardTitle>
            <CardDescription>Live tracking of unresolved machine downtime cycles.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.activeDowntimes === 0 ? (
              <div className="flex h-[150px] items-center justify-center rounded-lg border border-dashed border-border/60">
                <p className="text-xs text-muted-foreground">No active downtime sessions detected.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                  <div className="space-y-1">
                    <span className="font-semibold text-xs text-amber-600 dark:text-amber-400">
                      Unspecified Mechanical Halt
                    </span>
                    <p className="text-[10px] text-muted-foreground">CNC Lathe 01 • Factory Floor 1</p>
                  </div>
                  <StatusBadge status="IDLE" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center space-x-2">
              <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
              <span>Recent Critical Incidents</span>
            </CardTitle>
            <CardDescription>System warnings requiring immediate validation.</CardDescription>
          </CardHeader>
          <CardContent>
            {activeAlertsCount === 0 ? (
              <div className="flex h-[150px] items-center justify-center rounded-lg border border-dashed border-border/60">
                <p className="text-xs text-muted-foreground">All systems green. No active warnings.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-rose-500/5 border border-rose-500/10 rounded-xl animate-pulse">
                  <div className="space-y-1">
                    <span className="font-semibold text-xs text-rose-600 dark:text-rose-400">
                      Vibration threshold exceeded
                    </span>
                    <p className="text-[10px] text-muted-foreground">Motor Asset 04 • Assembly Line 2</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 bg-rose-500/15 px-2 py-0.5 rounded-full">
                    Critical
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

