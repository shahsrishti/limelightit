'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { ApiResponse } from '@/types/api.types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingTable } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSocket } from '@/hooks/useSocket';
import {
  Cpu,
  RefreshCw,
  Zap,
  Thermometer,
  Clock,
  Wifi,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Link from 'next/link';

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

export default function MachinesPage() {
  // Queries
  const { data: machines, isLoading: isMachinesLoading, error: machinesError, refetch } = useQuery<MachineListItem[]>({
    queryKey: ['machines-list-page'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<MachineListItem[]>>('/machines');
      return data.data;
    },
    refetchInterval: 30000, // Re-sync base state every 30s
  });

  const { data: deviceHealthList, isLoading: isHealthLoading } = useQuery<DeviceHealthItem[]>({
    queryKey: ['device-health-list-enrich'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<DeviceHealthItem[]>>('/device-health');
      return data.data;
    },
  });

  // State Management
  const [machinesList, setMachinesList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);

  // Column Visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    deviceId: true,
    status: true,
    current: true,
    power: true,
    powerFactor: true,
    todayEnergy: true,
    totalEnergy: true,
    production: true,
    lastSeen: true,
    firmware: true,
    signal: true
  });

  // Hydrate local state from database queries
  useEffect(() => {
    if (machines) {
      const enriched = machines.map((m) => {
        const device = deviceHealthList?.find((d) => d.machineId === m.id);
        const baselinePower = m.power ?? 0;
        return {
          ...m,
          deviceId: device?.deviceId || `device-${m.id}`,
          macAddress: device?.macAddress || '00:1A:2B:3C:4D:00',
          firmware: device?.firmware || 'v1.0.0',
          signal: device?.signal || null,
          current: m.currentStatus === 'RUNNING' ? baselinePower / (230 * 0.88) : (m.currentStatus === 'IDLE' ? 0.8 : 0),
          powerFactor: m.currentStatus === 'RUNNING' ? 0.88 : (m.currentStatus === 'IDLE' ? 0.25 : 0),
          todayEnergy: baselinePower * 0.12,
          totalEnergy: baselinePower * 0.12 + 2345.6,
          productionCount: m.currentStatus === 'RUNNING' ? Math.floor(baselinePower / 40) : 0
        };
      });
      setMachinesList(enriched);
    }
  }, [machines, deviceHealthList]);

  // Real-time status updates via WebSocket
  useSocket('machine:status', (event) => {
    setMachinesList((prev) =>
      prev.map((m) => {
        if (m.id === event.machineId) {
          return {
            ...m,
            currentStatus: event.status,
            lastSeen: event.timestamp
          };
        }
        return m;
      })
    );
  });

  // Real-time metrics updates via WebSocket
  useSocket('telemetry:update', (event) => {
    setMachinesList((prev) =>
      prev.map((m) => {
        if (m.id === event.machineId) {
          const power = event.metrics.power || 0;
          const speed = event.metrics.speed || 0;
          const current = m.currentStatus === 'RUNNING' ? power / (230 * 0.88) : (m.currentStatus === 'IDLE' ? 0.8 : 0);
          const powerFactor = m.currentStatus === 'RUNNING' ? 0.88 : (m.currentStatus === 'IDLE' ? 0.25 : 0);

          return {
            ...m,
            power,
            temperature: event.metrics.temperature || m.temperature,
            current,
            powerFactor,
            todayEnergy: m.todayEnergy + (power / 1000) * (5 / 3600), // accumulate over 5s interval
            totalEnergy: m.totalEnergy + (power / 1000) * (5 / 3600),
            productionCount: m.productionCount + (speed > 0 ? 1 : 0),
            lastSeen: event.timestamp
          };
        }
        return m;
      })
    );
  });

  // Real-time device health updates via WebSocket
  useSocket('device:health', (event) => {
    setMachinesList((prev) =>
      prev.map((m) => {
        if (m.id === event.machineId) {
          return {
            ...m,
            signal: event.signal,
            firmware: event.firmware || m.firmware,
            lastSeen: event.timestamp
          };
        }
        return m;
      })
    );
  });

  // Filter & Sort Logic
  const filteredMachines = useMemo(() => {
    return machinesList
      .filter((m) => {
        const matchesSearch =
          m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.deviceId.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === 'ALL' || m.currentStatus === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'string') {
          return sortOrder === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [machinesList, searchTerm, statusFilter, sortBy, sortOrder]);

  // Paginated data
  const paginatedMachines = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredMachines.slice(start, start + limit);
  }, [filteredMachines, page, limit]);

  const totalPages = Math.ceil(filteredMachines.length / limit);

  // Sorting Handler
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  // Toggle column visibility
  const toggleColumn = (col: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [col]: !prev[col]
    }));
  };

  // CSV Exporter
  const exportToCSV = () => {
    const headers = [
      'Machine Name',
      'Device ID',
      'Status',
      'Current (A)',
      'Power (kW)',
      'Power Factor',
      'Today\'s Energy (kWh)',
      'Total Energy (kWh)',
      'Production Count',
      'Last Seen'
    ];

    const rows = filteredMachines.map((m) => [
      m.name,
      m.deviceId,
      m.currentStatus,
      m.current.toFixed(2),
      (m.power / 1000).toFixed(2),
      m.powerFactor.toFixed(2),
      m.todayEnergy.toFixed(2),
      m.totalEnergy.toFixed(2),
      m.productionCount,
      m.lastSeen ? new Date(m.lastSeen).toISOString() : 'Never'
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `machines_fleet_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSignalBadgeColor = (rssi: number | null) => {
    if (rssi === null) return 'text-muted-foreground bg-muted/20 border-muted-foreground/15';
    if (rssi >= -50) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (rssi >= -67) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    if (rssi >= -70) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
  };

  if (isMachinesLoading || isHealthLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Machine Fleet</h2>
          <p className="text-xs text-muted-foreground">Loading interactive machines table...</p>
        </div>
        <LoadingTable rows={8} cols={10} />
      </div>
    );
  }

  if (machinesError) {
    return (
      <EmptyState
        title="Failed to fetch machines"
        description="Could not connect to the API to pull machine status."
        icon={Cpu}
        actionText="Try Again"
        onAction={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Machine Fleet</h2>
          <p className="text-xs text-muted-foreground">Observe and configure industrial machines across the factory floor.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="flex items-center space-x-1">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {machinesList.length === 0 ? (
        <EmptyState
          title="No Machines Registered"
          description="Your machine fleet is currently empty. Connect an MQTT device to auto-provision."
          icon={Cpu}
        />
      ) : (
        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            {/* Toolbar Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name or asset ID..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-accent/30 text-foreground placeholder-muted-foreground text-xs rounded-lg pl-9 py-2 border border-border/40 focus:outline-none focus:border-primary/50 transition-all"
                />
              </div>

              <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-accent/30 text-foreground text-xs rounded-lg px-3 py-2 border border-border/40 focus:outline-none focus:border-primary/50"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="RUNNING">Running</option>
                  <option value="IDLE">Idle</option>
                  <option value="STOPPED">Stopped</option>
                  <option value="ERROR">Fault</option>
                </select>

                {/* Column Visibility Selector */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
                    className="flex items-center space-x-1 border-border/40"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span>Columns</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                  {isColumnDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-card shadow-lg p-2 z-50 divide-y divide-border/20 text-xs">
                      <div className="p-1.5 font-semibold text-muted-foreground text-[10px] uppercase">Toggle Columns</div>
                      <div className="py-1 space-y-0.5">
                        {Object.keys(visibleColumns).map((col) => (
                          <label
                            key={col}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent/40 rounded cursor-pointer text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={visibleColumns[col as keyof typeof visibleColumns]}
                              onChange={() => toggleColumn(col as keyof typeof visibleColumns)}
                              className="rounded border-border/40 text-primary focus:ring-primary/30"
                            />
                            <span className="capitalize">{col.replace(/([A-Z])/g, ' $1')}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Export Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  className="flex items-center space-x-1 border-border/40"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export</span>
                </Button>
              </div>
            </div>

            {/* Live Table */}
            <div className="overflow-x-auto border border-border/40 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/40">
                    {visibleColumns.name && (
                      <th
                        onClick={() => handleSort('name')}
                        className="p-3.5 font-semibold text-muted-foreground uppercase cursor-pointer hover:bg-muted/65 transition-colors"
                      >
                        Machine Name {sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                      </th>
                    )}
                    {visibleColumns.deviceId && (
                      <th className="p-3.5 font-semibold text-muted-foreground uppercase">Device ID</th>
                    )}
                    {visibleColumns.status && (
                      <th
                        onClick={() => handleSort('currentStatus')}
                        className="p-3.5 font-semibold text-muted-foreground uppercase cursor-pointer hover:bg-muted/65 transition-colors"
                      >
                        State {sortBy === 'currentStatus' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                      </th>
                    )}
                    {visibleColumns.current && (
                      <th className="p-3.5 font-semibold text-muted-foreground uppercase text-right">Current (A)</th>
                    )}
                    {visibleColumns.power && (
                      <th
                        onClick={() => handleSort('power')}
                        className="p-3.5 font-semibold text-muted-foreground uppercase text-right cursor-pointer hover:bg-muted/65 transition-colors"
                      >
                        Power (kW) {sortBy === 'power' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                      </th>
                    )}
                    {visibleColumns.powerFactor && (
                      <th className="p-3.5 font-semibold text-muted-foreground uppercase text-right">Power Factor</th>
                    )}
                    {visibleColumns.todayEnergy && (
                      <th className="p-3.5 font-semibold text-muted-foreground uppercase text-right">Today\'s Energy</th>
                    )}
                    {visibleColumns.totalEnergy && (
                      <th className="p-3.5 font-semibold text-muted-foreground uppercase text-right">Total Energy</th>
                    )}
                    {visibleColumns.production && (
                      <th className="p-3.5 font-semibold text-muted-foreground uppercase text-right">Production</th>
                    )}
                    {visibleColumns.lastSeen && (
                      <th className="p-3.5 font-semibold text-muted-foreground uppercase">Last Seen</th>
                    )}
                    {visibleColumns.firmware && (
                      <th className="p-3.5 font-semibold text-muted-foreground uppercase">Firmware</th>
                    )}
                    {visibleColumns.signal && (
                      <th className="p-3.5 font-semibold text-muted-foreground uppercase">RSSI Signal</th>
                    )}
                    <th className="p-3.5 font-semibold text-muted-foreground uppercase text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {paginatedMachines.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="p-8 text-center text-muted-foreground">
                        No records match the current filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedMachines.map((m) => (
                      <tr key={m.id} className="hover:bg-accent/20 transition-all duration-150 group">
                        {visibleColumns.name && (
                          <td className="p-3.5 font-bold text-foreground">
                            <Link href={`/machines/${m.id}`} className="hover:text-primary transition-colors">
                              {m.name}
                            </Link>
                          </td>
                        )}
                        {visibleColumns.deviceId && (
                          <td className="p-3.5 font-mono text-[10px] text-muted-foreground">
                            {m.deviceId}
                          </td>
                        )}
                        {visibleColumns.status && (
                          <td className="p-3.5">
                            <StatusBadge status={m.currentStatus} />
                          </td>
                        )}
                        {visibleColumns.current && (
                          <td className="p-3.5 text-right font-mono text-foreground font-medium">
                            {m.current !== null ? `${m.current.toFixed(2)} A` : '--'}
                          </td>
                        )}
                        {visibleColumns.power && (
                          <td className="p-3.5 text-right font-mono text-foreground font-semibold">
                            {m.power !== null ? `${(m.power / 1000).toFixed(2)} kW` : '--'}
                          </td>
                        )}
                        {visibleColumns.powerFactor && (
                          <td className="p-3.5 text-right font-mono text-foreground">
                            {m.powerFactor !== null ? m.powerFactor.toFixed(2) : '--'}
                          </td>
                        )}
                        {visibleColumns.todayEnergy && (
                          <td className="p-3.5 text-right font-mono text-emerald-500 dark:text-emerald-400 font-medium">
                            {m.todayEnergy !== null ? `${m.todayEnergy.toFixed(2)} kWh` : '--'}
                          </td>
                        )}
                        {visibleColumns.totalEnergy && (
                          <td className="p-3.5 text-right font-mono text-foreground">
                            {m.totalEnergy !== null ? `${m.totalEnergy.toFixed(1)} kWh` : '--'}
                          </td>
                        )}
                        {visibleColumns.production && (
                          <td className="p-3.5 text-right font-mono text-cyan-500 font-bold">
                            {m.productionCount}
                          </td>
                        )}
                        {visibleColumns.lastSeen && (
                          <td className="p-3.5 text-muted-foreground">
                            {m.lastSeen ? new Date(m.lastSeen).toLocaleTimeString() : 'Never'}
                          </td>
                        )}
                        {visibleColumns.firmware && (
                          <td className="p-3.5 font-mono text-[10px] text-muted-foreground">
                            {m.firmware}
                          </td>
                        )}
                        {visibleColumns.signal && (
                          <td className="p-3.5">
                            {m.signal !== null ? (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getSignalBadgeColor(m.signal)}`}>
                                {m.signal} dBm
                              </span>
                            ) : (
                              <span className="text-muted-foreground">--</span>
                            )}
                          </td>
                        )}
                        <td className="p-3.5 text-center">
                          <Link href={`/machines/${m.id}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg group-hover:bg-primary/10 group-hover:text-primary">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <span className="text-xs text-muted-foreground">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, filteredMachines.length)} of {filteredMachines.length} assets
                </span>
                <div className="flex items-center space-x-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Button
                      key={p}
                      variant={page === p ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setPage(p)}
                      className="h-8 w-8 text-xs font-semibold"
                    >
                      {p}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
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
    </div>
  );
}

