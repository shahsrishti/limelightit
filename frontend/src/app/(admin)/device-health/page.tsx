'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { ApiResponse } from '@/types/api.types';
import { LoadingTable } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSocket } from '@/hooks/useSocket';
import { HeartPulse, RefreshCw, Wifi, Battery, Server } from 'lucide-react';
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
}

export default function DeviceHealthPage() {
  const { data: devices, isLoading, error, refetch } = useQuery<DeviceHealthItem[]>({
    queryKey: ['device-health-list'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<DeviceHealthItem[]>>('/device-health');
      return data.data;
    },
    refetchInterval: 10000,
  });

  // Real-time device health trigger
  useSocket('device:health', () => {
    refetch();
  });

  const getSignalStrength = (rssi: number | null) => {
    if (rssi === null) return { text: 'Unknown', color: 'text-muted-foreground' };
    if (rssi >= -50) return { text: 'Excellent', color: 'text-emerald-500' };
    if (rssi >= -67) return { text: 'Good', color: 'text-emerald-400' };
    if (rssi >= -70) return { text: 'Fair', color: 'text-amber-500' };
    return { text: 'Weak', color: 'text-rose-500' };
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
          <p className="text-xs text-muted-foreground">Monitor ESP32 physical health metrics and MQTT transport packets.</p>
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
        <div className="grid gap-4 md:grid-cols-2">
          {devices.map((device) => {
            const signal = getSignalStrength(device.signal);
            return (
              <Card key={device.deviceId} className="border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:border-primary/20 transition-all duration-200">
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Server className="h-4 w-4 text-primary" />
                        <h3 className="font-bold text-sm text-foreground">{device.deviceId}</h3>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono">MAC: {device.macAddress}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      Linked: {device.machineName}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/30">
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
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Battery</span>
                      <div className="flex items-center space-x-1.5">
                        <Battery className={`h-4 w-4 ${device.battery !== null && device.battery < 20 ? 'text-rose-500' : 'text-emerald-500'}`} />
                        <span className="text-xs font-bold text-foreground">
                          {device.battery !== null ? `${device.battery}%` : 'AC Power'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Uptime</span>
                      <p className="text-xs font-bold text-foreground">
                        {formatUptime(device.uptime)}
                      </p>
                    </div>
                  </div>

                  <div className="text-[10px] text-muted-foreground text-right pt-1.5">
                    Last check-in: <span className="font-semibold">{device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : 'Never'}</span>
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
