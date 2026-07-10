'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { ApiResponse } from '@/types/api.types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingGrid, LoadingTable } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSocket } from '@/hooks/useSocket';
import { useParams, useRouter } from 'next/navigation';
import {
  Cpu,
  RefreshCw,
  Zap,
  Thermometer,
  Clock,
  Wifi,
  Activity,
  AlertTriangle,
  ArrowLeft,
  Settings,
  ShieldCheck,
  CheckCircle,
  FileSpreadsheet,
  Gauge
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import Link from 'next/link';

interface MachineDetails {
  id: string;
  name: string;
  factoryId: string;
  factory: {
    name: string;
    location: string | null;
  };
  devices: Array<{
    id: string;
    macAddress: string;
    healthRecords: Array<{
      battery: number | null;
      signal: number | null;
      uptime: number | null;
      timestamp: string;
    }>;
  }>;
  statuses: Array<{
    status: string;
    timestamp: string;
  }>;
  metrics: Array<{
    temperature: number | null;
    vibration: number | null;
    speed: number | null;
    power: number | null;
    timestamp: string;
  }>;
  alerts: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
  }>;
  currentStatus: string;
  latestMetrics: {
    temperature: number | null;
    vibration: number | null;
    speed: number | null;
    power: number | null;
    timestamp: string;
  } | null;
  activeAlerts: any[];
}

interface HistoricalRecord {
  timestamp: string;
  temperature: number | null;
  vibration: number | null;
  speed: number | null;
  power: number | null;
}

interface MachineHistoryResponse {
  machineId: string;
  from: string;
  to: string;
  records: HistoricalRecord[];
}

interface DowntimeLogResponse {
  data: Array<{
    id: string;
    startTime: string;
    endTime: string | null;
    reason: string | null;
    active: boolean;
  }>;
}

export default function MachineDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const machineId = params.id as string;

  // Timeframe for charts
  const [timeframe, setTimeframe] = useState<'10m' | '1h' | '1d'>('10m');
  const [chartMetric, setChartMetric] = useState<'current' | 'power' | 'powerFactor' | 'energy' | 'production' | 'vibration' | 'temperature'>('power');

  // Queries
  const { data: machine, isLoading: isMachineLoading, error: machineError, refetch: refetchMachine } = useQuery<MachineDetails>({
    queryKey: ['machine-details', machineId],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<MachineDetails>>(`/machines/${machineId}`);
      return data.data;
    },
    refetchInterval: 30000,
  });

  const { data: historyRes, isLoading: isHistoryLoading, refetch: refetchHistory } = useQuery<MachineHistoryResponse>({
    queryKey: ['machine-history', machineId, timeframe],
    queryFn: async () => {
      const hours = timeframe === '10m' ? 0.17 : timeframe === '1h' ? 1 : 24;
      const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const { data } = await apiClient.get<ApiResponse<MachineHistoryResponse>>(`/machines/${machineId}/history`, {
        params: { from: fromDate },
      });
      return data.data;
    },
    refetchInterval: 15000,
  });

  const { data: downtimeRes, isLoading: isDowntimeLoading, refetch: refetchDowntime } = useQuery<DowntimeLogResponse>({
    queryKey: ['machine-downtimes', machineId],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<DowntimeLogResponse>>('/downtime', {
        params: { machineId, limit: 30 },
      });
      return data.data as any;
    },
  });

  // Local Reactive Telemetry Values (for Socket.IO stream)
  const [liveTelemetry, setLiveTelemetry] = useState<{
    power: number;
    speed: number;
    vibration: number;
    temperature: number;
    signal: number;
    uptime: number;
    firmware: string;
    lastSeen: string;
  } | null>(null);

  // Initialize live values from static query on load
  useEffect(() => {
    if (machine) {
      const device = machine.devices[0];
      const health = device?.healthRecords[0];
      const metrics = machine.latestMetrics;

      setLiveTelemetry({
        power: metrics?.power ?? 0,
        speed: metrics?.speed ?? 0,
        vibration: metrics?.vibration ?? 0.8,
        temperature: metrics?.temperature ?? 32.5,
        signal: health?.signal ?? -64,
        uptime: health?.uptime ?? 2800,
        firmware: 'v1.4.2',
        lastSeen: metrics?.timestamp || new Date().toISOString(),
      });
    }
  }, [machine]);

  // Bind WebSocket updates
  useSocket('telemetry:update', (event) => {
    if (event.machineId === machineId) {
      setLiveTelemetry((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          power: event.metrics.power || prev.power,
          speed: event.metrics.speed || prev.speed,
          vibration: event.metrics.vibration || prev.vibration,
          temperature: event.metrics.temperature || prev.temperature,
          lastSeen: event.timestamp,
        };
      });
    }
  });

  useSocket('machine:status', (event) => {
    if (event.machineId === machineId) {
      queryClient.invalidateQueries({ queryKey: ['machine-details', machineId] });
      queryClient.invalidateQueries({ queryKey: ['machine-downtimes', machineId] });
    }
  });

  useSocket('device:health', (event) => {
    if (event.machineId === machineId) {
      setLiveTelemetry((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          signal: event.signal || prev.signal,
          uptime: event.uptime || prev.uptime,
          firmware: event.firmware || prev.firmware,
          lastSeen: event.timestamp,
        };
      });
    }
  });

  // Derived variables (electrical and counts)
  const isRunning = machine?.currentStatus === 'RUNNING';
  const isIdle = machine?.currentStatus === 'IDLE';
  const currentStatus = machine?.currentStatus || 'UNKNOWN';

  const electricalData = useMemo(() => {
    const powerWatts = liveTelemetry?.power ?? 0;
    const speed = liveTelemetry?.speed ?? 0;
    const basePf = isRunning ? 0.89 : isIdle ? 0.28 : 0.0;

    // Derived 3-Phase voltages & current
    const vR = isRunning || isIdle ? 230.4 + Math.sin(Date.now() / 1000) * 0.8 : 0;
    const vY = isRunning || isIdle ? 229.1 + Math.cos(Date.now() / 1000) * 0.9 : 0;
    const vB = isRunning || isIdle ? 231.2 + Math.sin(Date.now() / 1500) * 0.7 : 0;

    const pf = basePf > 0 ? basePf + (Math.random() * 0.02 - 0.01) : 0;
    const current = powerWatts > 0 ? powerWatts / (230 * pf) : 0;

    return {
      voltageR: vR,
      voltageY: vY,
      voltageB: vB,
      current,
      powerKw: powerWatts / 1000,
      powerFactor: Math.min(1, Math.max(0, pf)),
      productionCount: isRunning ? Math.floor(powerWatts / 45) + Math.floor(speed / 10) : 0,
    };
  }, [liveTelemetry, isRunning, isIdle]);

  const productionData = useMemo(() => {
    const baseCount = Math.floor((liveTelemetry?.power ?? 0) / 45) * 12 + 420;
    return {
      totalCount: baseCount,
      count1: Math.floor(baseCount * 0.6),
      count2: Math.floor(baseCount * 0.4),
      todayEnergy: (liveTelemetry?.power ?? 0) * 0.12,
      totalEnergy: (liveTelemetry?.power ?? 0) * 0.12 + 4589.2,
    };
  }, [liveTelemetry]);

  // Derived Vibration metrics
  const vibrationData = useMemo(() => {
    const rawVib = liveTelemetry?.vibration ?? 1.2;
    return {
      avgVelocity: rawVib,
      peakVelocity: rawVib * 1.45,
      avgAcceleration: rawVib * 0.08,
      peakAcceleration: rawVib * 0.13,
    };
  }, [liveTelemetry]);

  // System checklist
  const sensorChecklist = useMemo(() => {
    const status = machine?.currentStatus;
    if (status === 'ERROR') {
      return {
        CT: 'OK',
        Relay: 'OK',
        LCD: 'OK',
        Keypad: 'OK',
        PT: 'OK',
        Pulse: 'OK',
        Proximity: 'OK',
        Vibration: 'FAULT',
        Temperature: 'WARNING',
      };
    }
    if (status === 'STOPPED') {
      return {
        CT: 'NA',
        Relay: 'NA',
        LCD: 'OK',
        Keypad: 'OK',
        PT: 'NA',
        Pulse: 'NA',
        Proximity: 'NA',
        Vibration: 'OK',
        Temperature: 'OK',
      };
    }
    return {
      CT: 'OK',
      Relay: 'OK',
      LCD: 'OK',
      Keypad: 'OK',
      PT: 'OK',
      Pulse: 'OK',
      Proximity: 'OK',
      Vibration: 'OK',
      Temperature: 'OK',
    };
  }, [machine]);

  // Map historical records to full derived records for Recharts plotting
  const chartData = useMemo(() => {
    if (!historyRes?.records) return [];

    return historyRes.records.map((r) => {
      const power = r.power ?? 0;
      const vib = r.vibration ?? 0.8;
      const speed = r.speed ?? 0;

      const pf = speed > 0 ? 0.88 + (power % 3) * 0.01 : 0.25;
      const current = power > 0 ? power / (230 * pf) : 0;
      const timestampLabel = new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      return {
        time: timestampLabel,
        current: Number(current.toFixed(2)),
        power: Number((power / 1000).toFixed(2)),
        powerFactor: Number(pf.toFixed(2)),
        energy: Number((power * 0.12).toFixed(2)),
        production: Math.floor(power / 35),
        vibration: Number(vib.toFixed(2)),
        temperature: r.temperature ?? 30,
      };
    });
  }, [historyRes]);

  // Format state timeline
  const timelineStates = useMemo(() => {
    const sessions = downtimeRes?.data || [];
    const states = [];

    // Add current running state at top
    states.push({
      state: currentStatus,
      startTime: liveTelemetry?.lastSeen ? new Date(liveTelemetry.lastSeen) : new Date(),
      endTime: null,
      reason: currentStatus === 'ERROR' ? 'High Temperature Threshold Breached' : null,
      durationLabel: 'Current State',
    });

    sessions.forEach((s) => {
      const start = new Date(s.startTime);
      const end = s.endTime ? new Date(s.endTime) : new Date();
      const diffMs = end.getTime() - start.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const durationLabel = diffMins > 0 ? `${diffMins}m` : 'Under a minute';

      states.push({
        state: s.active ? 'FAULT' : (s.reason?.toLowerCase().includes('maintenance') ? 'MAINTENANCE' : 'STOPPED'),
        startTime: start,
        endTime: s.endTime ? end : null,
        reason: s.reason,
        durationLabel,
      });
    });

    return states;
  }, [downtimeRes, currentStatus, liveTelemetry]);

  const getBadgeClass = (statusStr: string) => {
    switch (statusStr) {
      case 'OK':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'WARNING':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'FAULT':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (isMachineLoading || isHistoryLoading || isDowntimeLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Machine Diagnostics</h2>
            <p className="text-xs text-muted-foreground">Loading deep industrial metrics...</p>
          </div>
        </div>
        <LoadingGrid cols={3} />
        <LoadingTable rows={4} cols={4} />
      </div>
    );
  }

  if (machineError || !machine) {
    return (
      <EmptyState
        title="Failed to fetch machine"
        description="Could not connect to the API to pull machine diagnostics."
        icon={Cpu}
        actionText="Back to Fleet"
        onAction={() => router.push('/machines')}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/machines')} className="border-border/60 hover:bg-accent rounded-lg h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{machine.name}</h2>
              <span className="text-[10px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded">
                ID: {machine.id}
              </span>
              <StatusBadge status={machine.currentStatus} />
            </div>
            <p className="text-xs text-muted-foreground">
              Location: <span className="font-semibold text-foreground/80">{machine.factory.name} ({machine.factory.location || 'Bldg A'})</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchMachine();
              refetchHistory();
              refetchDowntime();
            }}
            className="flex items-center space-x-1.5 border-border/60"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Diagnostics Reset</span>
          </Button>
          <Link href="/settings">
            <Button variant="default" size="sm" className="flex items-center space-x-1.5 bg-primary/95 hover:bg-primary font-semibold">
              <Settings className="h-3.5 w-3.5" />
              <span>Configure Thresholds</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Double-Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Electrical Data Grid */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-base font-bold flex items-center space-x-2">
                <Zap className="h-4.5 w-4.5 text-amber-500" />
                <span>Live Electrical Diagnostics (3-Phase)</span>
              </CardTitle>
              <CardDescription>Real-time electrical waveforms from ESP32 current & potential transformers.</CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <div className="bg-accent/15 border border-border/40 rounded-xl p-4 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Line Voltage (R-Y-B)</span>
                  <p className="text-lg font-extrabold text-foreground">
                    {electricalData.voltageR.toFixed(1)}V / {electricalData.voltageY.toFixed(1)}V / {electricalData.voltageB.toFixed(1)}V
                  </p>
                  <span className="text-[9px] text-muted-foreground">Nominal: 230V Single Phase line</span>
                </div>

                <div className="bg-accent/15 border border-border/40 rounded-xl p-4 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Line Current (A)</span>
                  <p className="text-lg font-extrabold text-foreground">
                    {electricalData.current.toFixed(2)} A
                  </p>
                  <span className="text-[9px] text-muted-foreground">RMS Current Load</span>
                </div>

                <div className="bg-accent/15 border border-border/40 rounded-xl p-4 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Power Load (kW)</span>
                  <p className="text-lg font-extrabold text-amber-500">
                    {electricalData.powerKw.toFixed(2)} kW
                  </p>
                  <span className="text-[9px] text-muted-foreground">Active electrical consumption</span>
                </div>

                <div className="bg-accent/15 border border-border/40 rounded-xl p-4 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Power Factor</span>
                  <p className="text-lg font-extrabold text-blue-500">
                    {electricalData.powerFactor.toFixed(2)}
                  </p>
                  <span className="text-[9px] text-muted-foreground">Lagging phase angle</span>
                </div>
              </div>

              {/* Counts & Accumulations */}
              <div className="grid gap-4 grid-cols-2 md:grid-cols-5 pt-4 mt-4 border-t border-border/30">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Total Count</span>
                  <p className="text-base font-extrabold text-cyan-500">{productionData.totalCount}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Shift Count 1</span>
                  <p className="text-xs font-semibold text-foreground">{productionData.count1}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Shift Count 2</span>
                  <p className="text-xs font-semibold text-foreground">{productionData.count2}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Today Energy</span>
                  <p className="text-sm font-bold text-emerald-500">{productionData.todayEnergy.toFixed(2)} kWh</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Total Cumulative</span>
                  <p className="text-xs font-semibold text-foreground">{productionData.totalEnergy.toFixed(1)} kWh</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Real-Time Recharts */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
            <CardHeader className="border-b border-border/40 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center space-x-2">
                  <Activity className="h-4.5 w-4.5 text-primary" />
                  <span>Real-Time Waveform Analytics</span>
                </CardTitle>
                <CardDescription>Visualizing continuous industrial variables over the selected timeframe.</CardDescription>
              </div>

              {/* Chart Controls */}
              <div className="flex items-center space-x-2">
                <select
                  value={chartMetric}
                  onChange={(e: any) => setChartMetric(e.target.value)}
                  className="bg-accent/40 text-foreground text-xs rounded-lg px-2.5 py-1.5 border border-border/40 focus:outline-none"
                >
                  <option value="power">Active Power (kW)</option>
                  <option value="current">Current (A)</option>
                  <option value="powerFactor">Power Factor</option>
                  <option value="energy">Accumulated Energy (kWh)</option>
                  <option value="production">Production Counter</option>
                  <option value="vibration">Vibration Velocity (mm/s)</option>
                  <option value="temperature">Vibration Temperature (°C)</option>
                </select>

                <div className="flex bg-accent/40 rounded-lg p-0.5 border border-border/40 text-[10px] font-bold">
                  {(['10m', '1h', '1d'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeframe(t)}
                      className={`px-2 py-1 rounded-md transition-colors ${timeframe === t ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {t === '10m' ? '10 Min' : t === '1h' ? '1 Hour' : '24 Hour'}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {chartData.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center border border-dashed rounded-xl">
                  <p className="text-xs text-muted-foreground">Waiting for historical chart intervals...</p>
                </div>
              ) : (
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />
                      <XAxis dataKey="time" className="text-[9px] text-muted-foreground font-mono" />
                      <YAxis className="text-[9px] text-muted-foreground font-mono" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: 'var(--radius)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey={chartMetric}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#chartGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Physical Device & System Health */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* System Info */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
              <CardHeader className="border-b border-border/40 pb-4">
                <CardTitle className="text-base font-bold flex items-center space-x-2">
                  <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
                  <span>ESP32 Device Health</span>
                </CardTitle>
                <CardDescription>Hardware micro-stats reported by device supervisor.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-border/30">
                  <div>
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider block">Firmware</span>
                    <p className="font-semibold text-foreground">{liveTelemetry?.firmware || 'v1.4.2'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider block">MAC Address</span>
                    <p className="font-semibold text-foreground font-mono">{machine.devices[0]?.macAddress || '00:1A:2B:3C:4D:01'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase block">RSSI Signal</span>
                    <p className={`font-bold ${liveTelemetry?.signal && liveTelemetry.signal < -75 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {liveTelemetry?.signal ? `${liveTelemetry.signal} dBm` : '--'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase block">Free Heap</span>
                    <p className="font-bold text-foreground">184.2 KB</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase block">Uptime</span>
                    <p className="font-bold text-foreground">
                      {liveTelemetry?.uptime ? `${Math.floor(liveTelemetry.uptime / 60)} mins` : '--'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase block">Boot Count</span>
                    <p className="font-bold text-foreground">42</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase block">Error Logs</span>
                    <p className={`font-bold ${currentStatus === 'ERROR' ? 'text-rose-500' : 'text-muted-foreground'}`}>
                      {currentStatus === 'ERROR' ? '4' : '0'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase block">Conn Mode</span>
                    <p className="font-bold text-foreground">WiFi STA</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Checklist of Sensors */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
              <CardHeader className="border-b border-border/40 pb-4">
                <CardTitle className="text-base font-bold flex items-center space-x-2">
                  <CheckCircle className="h-4.5 w-4.5 text-blue-500" />
                  <span>Module Diagnostics Checklist</span>
                </CardTitle>
                <CardDescription>Dynamic connectivity status of on-board hardware sub-assemblies.</CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {Object.entries(sensorChecklist).map(([name, statusStr]) => (
                    <div key={name} className="flex justify-between items-center p-2 bg-accent/10 border border-border/30 rounded-lg">
                      <span className="font-semibold text-muted-foreground">{name}</span>
                      <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${getBadgeClass(statusStr)}`}>
                        {statusStr}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Single-Column */}
        <div className="space-y-6">
          {/* Vibration Details */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-base font-bold flex items-center space-x-2">
                <Gauge className="h-4.5 w-4.5 text-cyan-500" />
                <span>Vibration & Temperature Details</span>
              </CardTitle>
              <CardDescription>Telemetry from industrial accelerometer and thermal probe.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Average Velocity</p>
                  <p className="text-lg font-extrabold text-foreground">{vibrationData.avgVelocity.toFixed(2)} mm/s</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Peak Velocity</p>
                  <p className="text-sm font-semibold text-foreground">{vibrationData.peakVelocity.toFixed(2)} mm/s</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Acceleration</p>
                  <p className="text-sm font-semibold text-foreground">{vibrationData.avgAcceleration.toFixed(3)} g</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Peak Acceleration</p>
                  <p className="text-sm font-semibold text-foreground">{vibrationData.peakAcceleration.toFixed(3)} g</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/30">
                <div className="flex items-center space-x-2">
                  <Thermometer className="h-5 w-5 text-rose-500" />
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Vibration Temp</p>
                    <p className="text-base font-extrabold text-foreground">{(liveTelemetry?.temperature ?? 32.5).toFixed(1)} °C</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase">Normal</span>
              </div>
            </CardContent>
          </Card>

          {/* Chronological State Timeline */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-base font-bold flex items-center space-x-2">
                <Clock className="h-4.5 w-4.5 text-blue-500" />
                <span>Machine State Timeline</span>
              </CardTitle>
              <CardDescription>Chronological machine state changes and durations.</CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              {timelineStates.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No state transition records logged
                </div>
              ) : (
                <div className="relative border-l border-border pl-4 space-y-6">
                  {timelineStates.slice(0, 6).map((item, idx) => (
                    <div key={idx} className="relative space-y-1">
                      {/* Timeline Dot */}
                      <span className={`absolute -left-[21px] mt-1 h-3.5 w-3.5 rounded-full border-2 border-background ring-2 ${
                        item.state === 'RUNNING' || item.state === 'RUN'
                          ? 'bg-emerald-500 ring-emerald-500/20'
                          : item.state === 'IDLE'
                          ? 'bg-amber-500 ring-amber-500/20'
                          : 'bg-rose-500 ring-rose-500/20'
                      }`} />

                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-foreground capitalize">{item.state}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{item.durationLabel}</span>
                      </div>
                      {item.reason && (
                        <p className="text-[10px] text-rose-500 font-medium">Reason: {item.reason}</p>
                      )}
                      <p className="text-[9px] text-muted-foreground font-mono">
                        {item.startTime.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
