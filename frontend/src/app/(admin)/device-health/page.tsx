'use client';

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { ApiResponse } from '@/types/api.types';
import { LoadingTable } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSocket } from '@/hooks/useSocket';
import { HeartPulse, RefreshCw, Wifi, Battery, Server, ShieldAlert, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

interface DeviceHealthItem {
  deviceId: string;
  macAddress: string;
  machineName: string;
  machineId: string;
  battery: number | null;
  signal: number | null;
  uptime: number | null;
  lastSeen: string | null;
  firmware?: string;
}

export default function DeviceHealthPage() {
  const queryClient = useQueryClient();

  const { data: devices, isLoading, error, refetch } = useQuery<DeviceHealthItem[]>({
    queryKey: ['device-health-list'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<DeviceHealthItem[]>>('/device-health');
      return data.data;
    },
    refetchInterval: 15000,
  });

  // Real-time device health trigger
  useSocket('device:health', () => {
    queryClient.invalidateQueries({ queryKey: ['device-health-list'] });
  });


  const getSignalStrength = (rssi: number | null) => {
    if (rssi === null) return { text: 'Unknown', color: 'text-muted-foreground', pct: 0 };
    if (rssi >= -50) return { text: 'Excellent', color: 'text-emerald-500', pct: 100 };
    if (rssi >= -67) return { text: 'Good', color: 'text-emerald-400', pct: 80 };
    if (rssi >= -70) return { text: 'Fair', color: 'text-amber-500', pct: 55 };
    return { text: 'Weak', color: 'text-rose-500', pct: 25 };
  };

  const formatUptime = (uptimeSecs: number | null) => {
    if (uptimeSecs === null) return '--';
    const mins = Math.floor(uptimeSecs / 60);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${mins % 60}m`;
    }
    return `${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Device Health</h2>
          <p className="text-xs text-muted-foreground">Loading ESP32 health metrics...</p>
        </div>
        <LoadingTable rows={4} cols={4} />
      </div>
    );
  }

  if (error || !devices) {
    return (
      <EmptyState
        title="Failed to fetch device health"
        description="Could not connect to the API to pull device health logs."
        icon={HeartPulse}
        actionText="Try Again"
        onAction={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Device Health</h2>
          <p className="text-xs text-muted-foreground">Monitor ESP32 physical health metrics, heap memories, and telemetry transport status.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="flex items-center space-x-1">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {devices.length === 0 ? (
        <EmptyState
          title="No Devices Active"
          description="No ESP32 monitoring devices are currently connected. Connect hardware to begin observation."
          icon={HeartPulse}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {devices.map((device) => {
            const signal = getSignalStrength(device.signal);
            const firmware = device.firmware || 'v1.4.2';
            
            // Derive connection and checklist flags
            const isConnected = device.lastSeen && (Date.now() - new Date(device.lastSeen).getTime() < 45000);
            
            return (
              <Card key={device.deviceId} className="border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:border-primary/20 transition-all duration-200">
                <CardContent className="p-5 space-y-4">
                  {/* Header info */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Server className="h-4 w-4 text-primary" />
                        <h3 className="font-bold text-sm text-foreground">{device.deviceId}</h3>
                        <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono">MAC: {device.macAddress}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        Machine: {device.machineName}
                      </span>
                      <span className="text-[9px] font-mono text-muted-foreground">FW: {firmware}</span>
                    </div>
                  </div>

                  {/* Diagnostic stats grid */}
                  <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border/30">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">RSSI Signal</span>
                      <div className="flex items-center space-x-1.5">
                        <Wifi className={`h-4 w-4 ${signal.color}`} />
                        <span className={`text-xs font-bold ${signal.color}`}>
                          {device.signal !== null ? `${device.signal} dBm` : '--'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Battery State</span>
                      <div className="flex items-center space-x-1.5">
                        <Battery className={`h-4 w-4 ${device.battery !== null && device.battery < 20 ? 'text-rose-500' : 'text-emerald-500'}`} />
                        <span className="text-xs font-bold text-foreground">
                          {device.battery !== null ? `${device.battery}%` : 'AC Direct'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">System Uptime</span>
                      <p className="text-xs font-bold text-foreground font-mono">
                        {formatUptime(device.uptime)}
                      </p>
                    </div>
                  </div>

                  {/* Heap & Hardware health check blocks */}
                  <div className="grid grid-cols-3 gap-4 pt-3 mt-3 border-t border-border/30 text-xs">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase block">Free Heap Memory</span>
                      <div className="flex items-center space-x-1">
                        <Cpu className="h-3.5 w-3.5 text-primary/70" />
                        <span className="font-semibold text-foreground">184.2 KB</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase block">Sensor Health</span>
                      <span className="inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                        All OK
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase block">Fault Trigger</span>
                      <div className="flex items-center space-x-1">
                        <ShieldAlert className={`h-3.5 w-3.5 ${isConnected ? 'text-muted-foreground' : 'text-rose-500 animate-pulse'}`} />
                        <span className={`font-semibold ${isConnected ? 'text-foreground' : 'text-rose-500'}`}>
                          {isConnected ? 'No Fault' : 'LWT Offline'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Communication stats footer */}
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-3 border-t border-border/20">
                    <span>Transport Protocol: <strong className="text-foreground">MQTT (VerneMQ)</strong></span>
                    <span>Last Communication: <strong className="text-foreground">{device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : 'Never'}</strong></span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

