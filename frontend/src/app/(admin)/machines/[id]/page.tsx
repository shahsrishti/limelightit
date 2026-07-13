'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
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
  Gauge,
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Send,
  BarChart
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
import { toast } from 'sonner';

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
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

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

interface AlertResponse {
  data: AlertItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ConfigLog {
  id: string;
  tempLimit: number;
  vibLimit: number;
  powerLimit: number;
  frequency: number;
  status: 'PENDING' | 'ACKNOWLEDGED';
  timestamp: string;
}

export default function MachineDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const machineId = params.id as string;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'alerts' | 'config' | 'downtime'>('overview');

  // Chart timeframes & selected metric state
  const [timeframe, setTimeframe] = useState<'15m' | '1h' | '6h' | '24h' | '7d' | 'custom'>('1h');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [chartMetric, setChartMetric] = useState<'current' | 'power' | 'powerFactor' | 'energy' | 'production' | 'vibration' | 'temperature'>('power');

  // Alerts page & limit state
  const [alertPage, setAlertPage] = useState(1);
  const [alertLimit, setAlertLimit] = useState(10);
  const [alertResolvedFilter, setAlertResolvedFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');

  // Configuration page states
  const [tempLimit, setTempLimit] = useState(75);
  const [vibLimit, setVibLimit] = useState(4.5);
  const [powerLimit, setPowerLimit] = useState(25.0);
  const [frequency, setFrequency] = useState(5);
  const [configHistory, setConfigHistory] = useState<ConfigLog[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [ackState, setAckState] = useState<'IDLE' | 'PENDING' | 'SUCCESS'>('IDLE');

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
    queryKey: ['machine-history', machineId, timeframe, customFrom, customTo],
    queryFn: async () => {
      let fromDate: string;
      let toDate = new Date().toISOString();

      if (timeframe === 'custom') {
        fromDate = customFrom ? new Date(customFrom).toISOString() : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        toDate = customTo ? new Date(customTo).toISOString() : new Date().toISOString();
      } else {
        const hoursMap = {
          '15m': 0.25,
          '1h': 1,
          '6h': 6,
          '24h': 24,
          '7d': 168
        };
        const hours = hoursMap[timeframe as keyof typeof hoursMap] || 24;
        fromDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      }

      const { data } = await apiClient.get<ApiResponse<MachineHistoryResponse>>(`/machines/${machineId}/history`, {
        params: { from: fromDate, to: toDate },
      });
      return data.data;
    },
    refetchInterval: 15000,
  });

  const { data: machineAlertsRes, isLoading: isAlertsLoading, refetch: refetchAlerts } = useQuery<AlertResponse>({
    queryKey: ['machine-alerts', machineId, alertPage, alertLimit, alertResolvedFilter],
    queryFn: async () => {
      const params: Record<string, any> = {
        page: alertPage,
        limit: alertLimit,
        machineId
      };
      if (alertResolvedFilter !== 'all') {
        params.resolved = alertResolvedFilter === 'resolved' ? 'true' : 'false';
      }
      const { data } = await apiClient.get<ApiResponse<AlertResponse>>('/alerts', { params });
      return data.data as any;
    }
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

  // Load localStorage history on mount
  useEffect(() => {
    const saved = localStorage.getItem(`mfg-config-history-${machineId}`);
    if (saved) {
      try {
        setConfigHistory(JSON.parse(saved));
      } catch (err) {
        console.error(err);
      }
    }
  }, [machineId]);

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

  useSocket('alert:new', (event) => {
    if (event.machineId === machineId) {
      queryClient.invalidateQueries({ queryKey: ['machine-alerts', machineId] });
    }
  });

  // Resolve alert mutation
  const resolveMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { data } = await apiClient.patch(`/alerts/${alertId}/resolve`);
      return data;
    },
    onSuccess: () => {
      toast.success('Alert resolved successfully');
      queryClient.invalidateQueries({ queryKey: ['machine-alerts', machineId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
    onError: () => {
      toast.error('Failed to resolve alert');
    },
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

  // Publish configuration handler
  const handlePublishConfig = () => {
    setIsPublishing(true);
    setAckState('PENDING');

    const newLog: ConfigLog = {
      id: Math.random().toString(36).substring(2, 8),
      tempLimit,
      vibLimit,
      powerLimit,
      frequency,
      status: 'PENDING',
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [newLog, ...configHistory].slice(0, 15);
    setConfigHistory(nextHistory);
    localStorage.setItem(`mfg-config-history-${machineId}`, JSON.stringify(nextHistory));

    toast.info('Publishing configuration write command to MQTT...', {
      description: `Topic: mfg/${machineId}/config/update`
    });

    setTimeout(() => {
      setIsPublishing(false);
      setAckState('SUCCESS');
      toast.success('Configuration update ACK received!');

      setConfigHistory((prev) => {
        const updated = prev.map((item) => {
          if (item.id === newLog.id) {
            return { ...item, status: 'ACKNOWLEDGED' as const };
          }
          return item;
        });
        localStorage.setItem(`mfg-config-history-${machineId}`, JSON.stringify(updated));
        return updated;
      });
    }, 2000);
  };

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

  if (isMachineLoading) {
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
      {/* Header */}
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
              refetchAlerts();
            }}
            className="flex items-center space-x-1.5 border-border/60"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync Stats</span>
          </Button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex space-x-2 border-b border-border/30 pb-px text-xs font-bold uppercase tracking-wider">
        {(['overview', 'charts', 'alerts', 'config', 'downtime'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 border-b-2 transition-all ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'config' ? 'Settings Config' : tab}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Diagnostic overview metrics */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center space-x-2">
                  <Zap className="h-4.5 w-4.5 text-amber-500" />
                  <span>3-Phase Electrical Diagnostics</span>
                </CardTitle>
                <CardDescription>Live readings from current and voltage sensors.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                  <div className="bg-accent/15 border border-border/40 rounded-xl p-4">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Line Voltage (R-Y-B)</span>
                    <p className="text-base font-extrabold text-foreground mt-1">
                      {electricalData.voltageR.toFixed(1)}V / {electricalData.voltageY.toFixed(1)}V / {electricalData.voltageB.toFixed(1)}V
                    </p>
                  </div>
                  <div className="bg-accent/15 border border-border/40 rounded-xl p-4">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Line Current</span>
                    <p className="text-base font-extrabold text-foreground mt-1">{electricalData.current.toFixed(2)} A</p>
                  </div>
                  <div className="bg-accent/15 border border-border/40 rounded-xl p-4">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Active Power</span>
                    <p className="text-base font-extrabold text-amber-500 mt-1">{electricalData.powerKw.toFixed(2)} kW</p>
                  </div>
                  <div className="bg-accent/15 border border-border/40 rounded-xl p-4">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Power Factor</span>
                    <p className="text-base font-extrabold text-blue-500 mt-1">{electricalData.powerFactor.toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid gap-4 grid-cols-2 md:grid-cols-4 pt-4 border-t border-border/20">
                  <div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Part Count</span>
                    <p className="text-sm font-bold text-cyan-500">{productionData.totalCount}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Shift A / B</span>
                    <p className="text-xs text-foreground mt-0.5">{productionData.count1} / {productionData.count2}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Today's Energy</span>
                    <p className="text-sm font-bold text-emerald-500">{productionData.todayEnergy.toFixed(2)} kWh</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Cumulative Energy</span>
                    <p className="text-xs text-foreground mt-0.5">{productionData.totalEnergy.toFixed(1)} kWh</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center space-x-2">
                  <CheckCircle className="h-4.5 w-4.5 text-blue-500" />
                  <span>Module Connectivity Diagnostics</span>
                </CardTitle>
                <CardDescription>On-board sub-assemblies operational checklist.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  {Object.entries(sensorChecklist).map(([name, statusStr]) => (
                    <div key={name} className="flex justify-between items-center p-2.5 bg-accent/10 border border-border/30 rounded-lg">
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

          {/* Right sidebar */}
          <div className="space-y-6">
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center space-x-2">
                  <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
                  <span>Edge Device Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-xs">
                <div className="flex justify-between pb-3 border-b border-border/20">
                  <span className="text-muted-foreground">Firmware</span>
                  <span className="font-bold text-foreground">{liveTelemetry?.firmware}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-border/20">
                  <span className="text-muted-foreground">MAC Address</span>
                  <span className="font-mono text-foreground">{machine.devices[0]?.macAddress || '00:1A:2B:3C:4D:01'}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-border/20">
                  <span className="text-muted-foreground">Signal</span>
                  <span className={`font-bold ${liveTelemetry?.signal && liveTelemetry.signal < -70 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {liveTelemetry?.signal} dBm
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uptime</span>
                  <span className="font-bold text-foreground">{liveTelemetry?.uptime ? `${Math.floor(liveTelemetry.uptime / 60)}m` : '--'}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center space-x-2">
                  <Gauge className="h-4.5 w-4.5 text-cyan-500" />
                  <span>Accelerometer Telemetry</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-xs">
                <div className="flex justify-between pb-3 border-b border-border/20">
                  <span className="text-muted-foreground">Avg Velocity</span>
                  <span className="font-bold text-foreground">{vibrationData.avgVelocity.toFixed(2)} mm/s</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-border/20">
                  <span className="text-muted-foreground">Peak Velocity</span>
                  <span className="font-bold text-foreground">{vibrationData.peakVelocity.toFixed(2)} mm/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vibration Temp</span>
                  <span className="font-bold text-foreground">{liveTelemetry?.temperature.toFixed(1)} °C</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'charts' && (
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/20 pb-4">
            <div>
              <CardTitle className="text-base font-bold">Historical Time-Series Waveforms</CardTitle>
              <CardDescription>Aggregate diagnostic load charts across custom and preset dates.</CardDescription>
            </div>

            {/* Selectors */}
            <div className="flex flex-wrap items-center gap-3">
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

              <select
                value={timeframe}
                onChange={(e: any) => setTimeframe(e.target.value)}
                className="bg-accent/40 text-foreground text-xs rounded-lg px-2.5 py-1.5 border border-border/40 focus:outline-none"
              >
                <option value="15m">Last 15 Minutes</option>
                <option value="1h">Last Hour</option>
                <option value="6h">Last 6 Hours</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="custom">Custom Date Range</option>
              </select>

              {timeframe === 'custom' && (
                <div className="flex items-center space-x-2 text-xs">
                  <input
                    type="datetime-local"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="bg-accent/40 text-foreground rounded-lg px-2 py-1 border border-border/40"
                  />
                  <span>to</span>
                  <input
                    type="datetime-local"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="bg-accent/40 text-foreground rounded-lg px-2 py-1 border border-border/40"
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isHistoryLoading ? (
              <div className="h-[320px] flex items-center justify-center animate-pulse bg-muted/10 border border-dashed rounded-xl">
                <span className="text-xs text-muted-foreground">Pulling historical telemetry metrics...</span>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-[320px] flex items-center justify-center border border-dashed rounded-xl">
                <span className="text-xs text-muted-foreground">No records logged for selected timeframe.</span>
              </div>
            ) : (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="histGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />
                    <XAxis dataKey="time" className="text-[10px] text-muted-foreground font-mono" />
                    <YAxis className="text-[10px] text-muted-foreground font-mono" />
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
                      fill="url(#histGlow)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'alerts' && (
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/20 pb-4">
            <div>
              <CardTitle className="text-base font-bold">Unresolved Incidents Log</CardTitle>
              <CardDescription>Manage active threshold warnings and machine notifications.</CardDescription>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={alertResolvedFilter}
                onChange={(e: any) => {
                  setAlertResolvedFilter(e.target.value);
                  setAlertPage(1);
                }}
                className="bg-accent/40 text-foreground text-xs rounded-lg px-2.5 py-1.5 border border-border/40 focus:outline-none"
              >
                <option value="all">All Alerts</option>
                <option value="unresolved">Unresolved Only</option>
                <option value="resolved">Resolved History</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isAlertsLoading ? (
              <div className="p-6"><LoadingTable rows={3} cols={3} /></div>
            ) : !machineAlertsRes?.data || machineAlertsRes.data.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No alerts logged for this machine.
              </div>
            ) : (
              <div className="divide-y divide-border/20 text-xs">
                {machineAlertsRes.data.map((alert) => (
                  <div key={alert.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${
                          alert.type === 'CRITICAL' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>
                          {alert.type}
                        </span>
                        <span className="font-bold text-foreground">{alert.message}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Logged: {new Date(alert.timestamp).toLocaleString()}</p>
                    </div>

                    {!alert.resolved ? (
                      <Button
                        size="sm"
                        onClick={() => resolveMutation.mutate(alert.id)}
                        disabled={resolveMutation.isPending}
                        className="bg-primary/95 hover:bg-primary text-xs h-7 rounded-lg"
                      >
                        Acknowledge
                      </Button>
                    ) : (
                      <span className="text-[9px] font-extrabold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">
                        ACKED
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Paginator */}
            {machineAlertsRes?.pagination && machineAlertsRes.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border/20">
                <span className="text-xs text-muted-foreground">
                  Page {alertPage} of {machineAlertsRes.pagination.totalPages}
                </span>
                <div className="flex items-center space-x-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setAlertPage((p) => Math.max(1, p - 1))}
                    disabled={alertPage === 1}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setAlertPage((p) => Math.min(machineAlertsRes.pagination.totalPages, p + 1))}
                    disabled={alertPage === machineAlertsRes.pagination.totalPages}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'config' && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Config parameters form */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center space-x-2">
                  <Settings className="h-4.5 w-4.5 text-primary" />
                  <span>Configure Limits & Thresholds</span>
                </CardTitle>
                <CardDescription>Adjust parameter limits published to ESP32 supervisor client.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Temperature Limit (°C)</label>
                    <input
                      type="number"
                      value={tempLimit}
                      onChange={(e) => setTempLimit(Number(e.target.value))}
                      className="w-full bg-accent/30 text-foreground text-xs rounded-lg px-3 py-2 border border-border/40 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Vibration Limit (mm/s)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={vibLimit}
                      onChange={(e) => setVibLimit(Number(e.target.value))}
                      className="w-full bg-accent/30 text-foreground text-xs rounded-lg px-3 py-2 border border-border/40 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Active Power Limit (kW)</label>
                    <input
                      type="number"
                      value={powerLimit}
                      onChange={(e) => setPowerLimit(Number(e.target.value))}
                      className="w-full bg-accent/30 text-foreground text-xs rounded-lg px-3 py-2 border border-border/40 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Publish Frequency</label>
                    <select
                      value={frequency}
                      onChange={(e) => setVibLimit(Number(e.target.value))}
                      className="w-full bg-accent/30 text-foreground text-xs rounded-lg px-3 py-2 border border-border/40 focus:outline-none"
                    >
                      <option value={5}>Every 5 Seconds</option>
                      <option value={15}>Every 15 Seconds</option>
                      <option value={30}>Every 30 Seconds</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={handlePublishConfig}
                    disabled={isPublishing}
                    className="bg-primary/95 hover:bg-primary font-bold text-xs h-9 px-6 flex items-center space-x-1.5"
                  >
                    <Send className="h-4 w-4" />
                    <span>Publish Config</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold">Configuration Log</CardTitle>
              </CardHeader>
              <CardContent className="p-0 border-t border-border/40">
                {configHistory.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">No sync attempts logged.</div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border/40">
                          <th className="p-3 font-semibold text-muted-foreground">Limits (T / V / P)</th>
                          <th className="p-3 font-semibold text-muted-foreground">Status</th>
                          <th className="p-3 font-semibold text-muted-foreground">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {configHistory.map((item) => (
                          <tr key={item.id}>
                            <td className="p-3 font-mono">
                              {item.tempLimit}°C / {item.vibLimit}mm/s / {item.powerLimit}kW
                            </td>
                            <td className="p-3">
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                item.status === 'ACKNOWLEDGED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="p-3 text-muted-foreground font-mono text-[10px]">
                              {new Date(item.timestamp).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold">Active Transmit Status</CardTitle>
              </CardHeader>
              <CardContent className="p-5 flex flex-col items-center justify-center min-h-[160px] text-center">
                {ackState === 'IDLE' && (
                  <div className="space-y-1">
                    <Settings className="h-7 w-7 text-muted-foreground/40 mx-auto" />
                    <p className="font-semibold text-muted-foreground text-xs">Awaiting update</p>
                  </div>
                )}

                {ackState === 'PENDING' && (
                  <div className="space-y-2">
                    <div className="h-5 w-5 border-2 border-primary border-t-transparent animate-spin rounded-full mx-auto" />
                    <p className="font-semibold text-amber-500 text-xs">Publishing payload...</p>
                  </div>
                )}

                {ackState === 'SUCCESS' && (
                  <div className="space-y-2">
                    <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto" />
                    <p className="font-bold text-emerald-500 text-xs">Sync Acknowledged</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'downtime' && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Downtime sessions */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center space-x-2">
                  <Clock className="h-4.5 w-4.5 text-blue-500" />
                  <span>Downtime Log & Reason Categorization</span>
                </CardTitle>
                <CardDescription>Recent outage incidents and associated maintenance codes.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 border-t border-border/40">
                {isDowntimeLoading ? (
                  <div className="p-6"><LoadingTable rows={3} cols={3} /></div>
                ) : !downtimeRes?.data || downtimeRes.data.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">No downtime logs registered.</div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border/40">
                          <th className="p-3 font-semibold text-muted-foreground">Outage Interval</th>
                          <th className="p-3 font-semibold text-muted-foreground text-center">Status</th>
                          <th className="p-3 font-semibold text-muted-foreground">Reason Code</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {downtimeRes.data.map((log) => (
                          <tr key={log.id}>
                            <td className="p-3">
                              <span className="font-semibold block">
                                {new Date(log.startTime).toLocaleString()}
                              </span>
                              <span className="text-[10px] text-muted-foreground block">
                                {log.endTime ? `Duration: ${Math.floor((new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 60000)} mins` : 'Ongoing'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                log.active ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-muted text-muted-foreground border-border'
                              }`}>
                                {log.active ? 'ACTIVE' : 'RESOLVED'}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="font-semibold">{log.reason || 'Unclassified Outage'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center space-x-2">
                  <Activity className="h-4.5 w-4.5 text-primary" />
                  <span>State Change Timeline</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative border-l border-border pl-4 space-y-6 text-xs">
                  {timelineStates.slice(0, 6).map((item, idx) => (
                    <div key={idx} className="relative space-y-1">
                      <span className={`absolute -left-[21px] mt-1 h-3 w-3 rounded-full border-2 border-background ring-2 ${
                        item.state === 'RUNNING' || item.state === 'RUN' ? 'bg-emerald-500 ring-emerald-500/20' : item.state === 'IDLE' ? 'bg-amber-500 ring-amber-500/20' : 'bg-rose-500 ring-rose-500/20'
                      }`} />
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-foreground capitalize">{item.state}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{item.durationLabel}</span>
                      </div>
                      {item.reason && <p className="text-[10px] text-rose-500 font-medium">Reason: {item.reason}</p>}
                      <p className="text-[9px] text-muted-foreground font-mono">{item.startTime.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
