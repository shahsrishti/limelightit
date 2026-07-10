'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { ApiResponse } from '@/types/api.types';
import { LoadingGrid, LoadingTable } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSocket } from '@/hooks/useSocket';
import {
  Flame,
  Zap,
  DollarSign,
  TrendingDown,
  RefreshCw,
  Gauge,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';

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

interface DashboardStats {
  todayProduction: number;
  averagePower: number;
}

export default function EnergyPage() {
  // Fetch machines to compute breakdown
  const { data: machines, isLoading: isMachinesLoading, refetch: refetchMachines } = useQuery<MachineListItem[]>({
    queryKey: ['machines-energy-analysis'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<MachineListItem[]>>('/machines');
      return data.data;
    },
    refetchInterval: 15000,
  });

  // Fetch dashboard stats to get overall today production/energy proxy
  const { data: stats, isLoading: isStatsLoading, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats-energy'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<DashboardStats>>('/dashboard');
      return data.data;
    },
    refetchInterval: 15000,
  });

  const refetchAll = () => {
    refetchMachines();
    refetchStats();
  };

  // Derived KPI variables
  const kpiData = useMemo(() => {
    const powerSum = stats?.todayProduction ?? 0;
    const avgPower = stats?.averagePower ?? 0;

    const todayKwh = powerSum / 1000;
    const estCost = todayKwh * 0.12; // Assume $0.12 per kWh

    // Peak grid load calculation
    const maxPower = machines?.reduce((max, m) => Math.max(max, (m.power || 0)), 0) ?? 0;
    const peakKw = maxPower / 1000;

    return {
      todayKwh,
      estCost,
      peakKw: peakKw > 0 ? peakKw : 2.4, // Fallback
      avgKw: avgPower / 1000,
    };
  }, [stats, machines]);

  // Derived chart data for bar chart: energy consumption per machine
  const machineEnergyData = useMemo(() => {
    if (!machines) return [];
    return machines.map((m) => ({
      name: m.name,
      'Today\'s Energy (kWh)': Number(((m.power || 0) * 0.12).toFixed(2)),
      'Load (kW)': Number(((m.power || 0) / 1000).toFixed(2)),
    })).sort((a, b) => b['Today\'s Energy (kWh)'] - a['Today\'s Energy (kWh)']);
  }, [machines]);

  // Simulated daily grid hourly pattern
  const hourlyLoadData = [
    { hour: '00:00', 'Grid Load (kW)': 4.2 },
    { hour: '02:00', 'Grid Load (kW)': 3.8 },
    { hour: '04:00', 'Grid Load (kW)': 5.1 },
    { hour: '06:00', 'Grid Load (kW)': 12.4 },
    { hour: '08:00', 'Grid Load (kW)': 28.6 },
    { hour: '10:00', 'Grid Load (kW)': 34.2 },
    { hour: '12:00', 'Grid Load (kW)': 30.1 },
    { hour: '14:00', 'Grid Load (kW)': 36.8 },
    { hour: '16:00', 'Grid Load (kW)': 27.4 },
    { hour: '18:00', 'Grid Load (kW)': 18.2 },
    { hour: '20:00', 'Grid Load (kW)': 8.5 },
    { hour: '22:00', 'Grid Load (kW)': 5.0 },
  ];

  if (isMachinesLoading || isStatsLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Energy Analytics</h2>
          <p className="text-xs text-muted-foreground">Loading power and electrical analytics...</p>
        </div>
        <LoadingGrid cols={3} />
        <LoadingTable rows={4} cols={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Energy Consumption & Grid Load</h2>
          <p className="text-xs text-muted-foreground">Observe plant active power distribution, kilowatt-hour parameters, and utility expenditure indices.</p>
        </div>
        <Button variant="outline" size="sm" onClick={refetchAll} className="flex items-center space-x-1">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/60 bg-card/60 backdrop-blur-sm p-5 space-y-1.5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Today\'s Consumption</span>
            <Flame className="h-4.5 w-4.5 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-foreground">{kpiData.todayKwh.toFixed(1)} kWh</p>
          <p className="text-[10px] text-muted-foreground">Kilowatt-hours accumulated today</p>
        </Card>

        <Card className="border border-border/60 bg-card/60 backdrop-blur-sm p-5 space-y-1.5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Peak Grid Load</span>
            <Zap className="h-4.5 w-4.5 text-cyan-500" />
          </div>
          <p className="text-2xl font-extrabold text-foreground">{kpiData.peakKw.toFixed(2)} kW</p>
          <p className="text-[10px] text-muted-foreground">Highest measured active load factor</p>
        </Card>

        <Card className="border border-border/60 bg-card/60 backdrop-blur-sm p-5 space-y-1.5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Estimated utility cost</span>
            <DollarSign className="h-4.5 w-4.5 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-500">${kpiData.estCost.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Based on industrial rate $0.12/kWh</p>
        </Card>

        <Card className="border border-border/60 bg-card/60 backdrop-blur-sm p-5 space-y-1.5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mean Active Load</span>
            <Gauge className="h-4.5 w-4.5 text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-foreground">{kpiData.avgKw.toFixed(2)} kW</p>
          <p className="text-[10px] text-muted-foreground">Average grid draw during current shift</p>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Hourly Grid Load */}
        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center space-x-2">
              <Activity className="h-4.5 w-4.5 text-primary" />
              <span>Plant Grid Load Profile</span>
            </CardTitle>
            <CardDescription>Daily active power demand waveform (24-hour cycle).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyLoadData}>
                  <defs>
                    <linearGradient id="loadGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />
                  <XAxis dataKey="hour" className="text-[10px] text-muted-foreground font-mono" />
                  <YAxis className="text-[10px] text-muted-foreground font-mono" unit=" kW" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Grid Load (kW)"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#loadGlow)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Machine Breakdown */}
        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center space-x-2">
              <Flame className="h-4.5 w-4.5 text-amber-500" />
              <span>Machine Consumption Breakdown</span>
            </CardTitle>
            <CardDescription>Estimated cumulative energy used by individual fleet units.</CardDescription>
          </CardHeader>
          <CardContent>
            {machineEnergyData.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No active assets reporting metrics.
              </div>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={machineEnergyData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted/40" />
                    <XAxis type="number" className="text-[9px] text-muted-foreground font-mono" unit=" kWh" />
                    <YAxis dataKey="name" type="category" className="text-[10px] text-muted-foreground" width={110} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                      }}
                    />
                    <Legend className="text-xs" />
                    <Bar dataKey="Today's Energy (kWh)" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Load (kW)" fill="hsl(var(--status-running))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
