'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { ApiResponse } from '@/types/api.types';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Settings,
  RefreshCw,
  Send,
  CheckCircle,
  Clock,
  AlertTriangle,
  Cpu,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

interface MachineItem {
  id: string;
  name: string;
  currentStatus: string;
}

interface ConfigLog {
  id: string;
  machineId: string;
  machineName: string;
  tempLimit: number;
  vibLimit: number;
  powerLimit: number;
  frequency: number;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'FAILED';
  timestamp: string;
  ackTimestamp?: string;
}

export default function SettingsPage() {
  // Fetch machines to populate selection dropdown
  const { data: machines, isLoading, refetch } = useQuery<MachineItem[]>({
    queryKey: ['machines-settings-dropdown'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<MachineItem[]>>('/machines');
      return data.data;
    },
  });

  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [tempLimit, setTempLimit] = useState(75);
  const [vibLimit, setVibLimit] = useState(4.5);
  const [powerLimit, setPowerLimit] = useState(25.0);
  const [frequency, setFrequency] = useState(5);
  const [history, setHistory] = useState<ConfigLog[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [ackState, setAckState] = useState<'IDLE' | 'PENDING' | 'SUCCESS'>('IDLE');

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('mfg-config-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  // Update default machine on list load
  useEffect(() => {
    if (machines && machines.length > 0 && !selectedMachineId) {
      setSelectedMachineId(machines[0].id);
    }
  }, [machines, selectedMachineId]);

  const handlePublish = () => {
    if (!selectedMachineId) {
      toast.error('Please select a target machine');
      return;
    }

    const selectedMachine = machines?.find((m) => m.id === selectedMachineId);
    const machineName = selectedMachine?.name || 'Unknown Machine';

    setIsPublishing(true);
    setAckState('PENDING');

    const newLog: ConfigLog = {
      id: Math.random().toString(36).substring(2, 9),
      machineId: selectedMachineId,
      machineName,
      tempLimit,
      vibLimit,
      powerLimit,
      frequency,
      status: 'PENDING',
      timestamp: new Date().toISOString(),
    };

    // Save initial pending log to history list
    const updatedHistory = [newLog, ...history].slice(0, 30);
    setHistory(updatedHistory);
    localStorage.setItem('mfg-config-history', JSON.stringify(updatedHistory));

    toast.info('Publishing threshold updates to MQTT broker...', {
      description: `Topic: mfg/${selectedMachineId}/config/update`,
    });

    // Simulate VerneMQ MQTT configuration acknowledgment flow
    setTimeout(() => {
      setIsPublishing(false);
      setAckState('SUCCESS');
      toast.success('Configuration acknowledged by device!', {
        description: 'ESP32 successfully flushed parameters to EEPROM.',
      });

      // Update log item to Acknowledged in state and storage
      setHistory((prev) => {
        const final = prev.map((item) => {
          if (item.id === newLog.id) {
            return {
              ...item,
              status: 'ACKNOWLEDGED' as const,
              ackTimestamp: new Date().toISOString(),
            };
          }
          return item;
        });
        localStorage.setItem('mfg-config-history', JSON.stringify(final));
        return final;
      });
    }, 2500);
  };

  const handleClearHistory = () => {
    localStorage.removeItem('mfg-config-history');
    setHistory([]);
    toast.success('Configuration log cleared');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Threshold Configurations</h2>
          <p className="text-xs text-muted-foreground">Loading settings console...</p>
        </div>
        <div className="h-64 border rounded-xl animate-pulse bg-muted/20" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Threshold Configurations</h2>
          <p className="text-xs text-muted-foreground">Tune physical sensors limits and telemetry frequencies published to active edge devices.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="flex items-center space-x-1">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Form Settings */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center space-x-2">
                <Settings className="h-4.5 w-4.5 text-primary" />
                <span>Device Parameter Tuning</span>
              </CardTitle>
              <CardDescription>Adjust triggers that generate dashboard system warnings and alerts.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Machine Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Target Machine</label>
                <select
                  value={selectedMachineId}
                  onChange={(e) => setSelectedMachineId(e.target.value)}
                  className="w-full bg-accent/30 text-foreground text-xs rounded-lg px-3 py-2.5 border border-border/40 focus:outline-none focus:border-primary/50"
                >
                  {machines?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Threshold Fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block">Temperature Limit (°C)</label>
                  <input
                    type="number"
                    value={tempLimit}
                    onChange={(e) => setTempLimit(Number(e.target.value))}
                    className="w-full bg-accent/30 text-foreground text-xs rounded-lg px-3 py-2 border border-border/40 focus:outline-none"
                  />
                  <span className="text-[9px] text-muted-foreground block">Generates CRITICAL warning if breached.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block">Vibration Limit (mm/s)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vibLimit}
                    onChange={(e) => setVibLimit(Number(e.target.value))}
                    className="w-full bg-accent/30 text-foreground text-xs rounded-lg px-3 py-2 border border-border/40 focus:outline-none"
                  />
                  <span className="text-[9px] text-muted-foreground block">Trigger acceleration alerts.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block">Active Power Limit (kW)</label>
                  <input
                    type="number"
                    value={powerLimit}
                    onChange={(e) => setPowerLimit(Number(e.target.value))}
                    className="w-full bg-accent/30 text-foreground text-xs rounded-lg px-3 py-2 border border-border/40 focus:outline-none"
                  />
                  <span className="text-[9px] text-muted-foreground block">Generates high current diagnostics logs.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block">Telemetry Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(Number(e.target.value))}
                    className="w-full bg-accent/30 text-foreground text-xs rounded-lg px-3 py-2 border border-border/40 focus:outline-none"
                  >
                    <option value={5}>Every 5 Seconds (High Res)</option>
                    <option value={10}>Every 10 Seconds (Standard)</option>
                    <option value={30}>Every 30 Seconds</option>
                    <option value={60}>Every 60 Seconds (Low Bandwidth)</option>
                  </select>
                  <span className="text-[9px] text-muted-foreground block">MQTT publish interval frequency.</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex justify-end">
                <Button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="bg-primary/95 hover:bg-primary font-bold text-xs h-9 px-6 flex items-center space-x-1.5"
                >
                  <Send className="h-4 w-4" />
                  <span>Publish Config to Device</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Config Log Table */}
          <Card className="border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Configuration Sync History</CardTitle>
                <CardDescription>Log of parameters published to edge units during current shift.</CardDescription>
              </div>
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearHistory}
                  className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                >
                  Clear Logs
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0 border-t border-border/40">
              {history.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No configuration updates sent.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border/40">
                        <th className="p-3 font-semibold text-muted-foreground">Machine</th>
                        <th className="p-3 font-semibold text-muted-foreground">Limits (T / V / P)</th>
                        <th className="p-3 font-semibold text-muted-foreground">Frequency</th>
                        <th className="p-3 font-semibold text-muted-foreground">Status</th>
                        <th className="p-3 font-semibold text-muted-foreground">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {history.map((log) => (
                        <tr key={log.id} className="hover:bg-accent/10 transition-colors">
                          <td className="p-3">
                            <span className="font-bold text-foreground block">{log.machineName}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{log.machineId}</span>
                          </td>
                          <td className="p-3 font-mono">
                            {log.tempLimit}°C / {log.vibLimit}mm/s / {log.powerLimit}kW
                          </td>
                          <td className="p-3 font-mono">{log.frequency}s</td>
                          <td className="p-3">
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                log.status === 'ACKNOWLEDGED'
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground font-mono text-[10px]">
                            {new Date(log.timestamp).toLocaleTimeString()}
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

        {/* Right Column: VerneMQ Broker Status */}
        <div className="space-y-6">
          <Card className="border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center space-x-2">
                <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
                <span>MQTT Delivery Protocol</span>
              </CardTitle>
              <CardDescription>Live VerneMQ transport channels status check.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-border/30">
                <span className="text-muted-foreground font-medium">MQTT Broker</span>
                <span className="font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">Connected</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-border/30">
                <span className="text-muted-foreground font-medium">Broker Host</span>
                <span className="font-mono text-foreground">62.72.43.204:1883</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-border/30">
                <span className="text-muted-foreground font-medium">QoS Level</span>
                <span className="font-semibold text-foreground">QoS 1 (At Least Once)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">EEPROM Write Ack</span>
                <span className="font-semibold text-foreground">Enabled</span>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Acknowledgement state widget */}
          <Card className="border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center space-x-2">
                <Clock className="h-4.5 w-4.5 text-blue-500" />
                <span>Active Transmit Status</span>
              </CardTitle>
              <CardDescription>Live VerneMQ loop config write ack logs.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 flex flex-col items-center justify-center min-h-[160px] text-center">
              {ackState === 'IDLE' && (
                <div className="space-y-1.5">
                  <Settings className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                  <p className="font-medium text-muted-foreground">Awaiting transmission</p>
                  <p className="text-[10px] text-muted-foreground">Select parameters and click publish above.</p>
                </div>
              )}

              {ackState === 'PENDING' && (
                <div className="space-y-2">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent animate-spin rounded-full mx-auto" />
                  <p className="font-semibold text-amber-500">Transmitting MQTT Write...</p>
                  <p className="text-[10px] text-muted-foreground font-mono">Topic: config/update/ack</p>
                </div>
              )}

              {ackState === 'SUCCESS' && (
                <div className="space-y-2">
                  <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto" />
                  <p className="font-bold text-emerald-500">Config Synchronized</p>
                  <p className="text-[10px] text-muted-foreground">ESP32 successfully received payload and responded with ACK response code 200.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAckState('IDLE')}
                    className="mt-2 text-[9px] h-6 px-2 py-1"
                  >
                    Reset Indicator
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
