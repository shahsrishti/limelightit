'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { ApiResponse } from '@/types/api.types';
import { LoadingTable } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSocket } from '@/hooks/useSocket';
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Search,
  Filter,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
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

interface AlertResponse {
  data: AlertItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AlertsPage() {
  const queryClient = useQueryClient();
  
  // Filtering & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [viewResolved, setViewResolved] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  // React Query Fetch
  const { data: alertsRes, isLoading, error, refetch } = useQuery<AlertResponse>({
    queryKey: ['alerts-page', viewResolved, severityFilter, page],
    queryFn: async () => {
      const params: Record<string, any> = {
        page,
        limit,
        resolved: String(viewResolved),
      };
      if (severityFilter !== 'ALL') {
        params.type = severityFilter;
      }
      const { data } = await apiClient.get<ApiResponse<AlertResponse>>('/alerts', { params });
      // Wait, let's verify if the response is in data.data
      return data.data as any;
    },
    refetchInterval: 15000,
  });

  // Real-time alert listeners
  useSocket('alert:new', () => {
    queryClient.invalidateQueries({ queryKey: ['alerts-page'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
  });

  useSocket('alert:resolved', () => {
    queryClient.invalidateQueries({ queryKey: ['alerts-page'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
  });

  // Resolve alert mutation
  const resolveMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { data } = await apiClient.patch(`/alerts/${alertId}/resolve`);
      return data;
    },
    onSuccess: () => {
      toast.success('Alert acknowledged and marked resolved');
      queryClient.invalidateQueries({ queryKey: ['alerts-page'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
    onError: () => {
      toast.error('Failed to resolve alert');
    },
  });

  // Client-side search filtering over retrieved items
  const filteredAlerts = useMemo(() => {
    if (!alertsRes?.data) return [];
    return alertsRes.data.filter((alert) =>
      alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.machineId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [alertsRes, searchTerm]);

  const totalPages = alertsRes?.pagination?.totalPages ?? 1;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Industrial Incident Alerts</h2>
          <p className="text-xs text-muted-foreground">Loading active alerts control room...</p>
        </div>
        <LoadingTable rows={5} cols={4} />
      </div>
    );
  }

  if (error || !alertsRes) {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Active Alerts Control Room</h2>
          <p className="text-xs text-muted-foreground">View and acknowledge critical threshold breaches, faults, and hardware status alerts in real-time.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="flex items-center space-x-1">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Tabs and Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/40 backdrop-blur-sm border border-border/40 p-4 rounded-xl shadow-sm">
        {/* Resolved Tabs */}
        <div className="flex bg-accent/40 rounded-lg p-0.5 border border-border/40 text-xs font-bold w-full md:w-auto">
          <button
            onClick={() => {
              setViewResolved(false);
              setPage(1);
            }}
            className={`flex-1 md:flex-none px-4 py-2 rounded-md transition-colors flex items-center justify-center space-x-2 ${!viewResolved ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Active Alerts</span>
          </button>
          <button
            onClick={() => {
              setViewResolved(true);
              setPage(1);
            }}
            className={`flex-1 md:flex-none px-4 py-2 rounded-md transition-colors flex items-center justify-center space-x-2 ${viewResolved ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <CheckCircle className="h-4 w-4" />
            <span>Resolved History</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Search */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search alerts or machines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-accent/30 text-foreground placeholder-muted-foreground text-xs rounded-lg pl-9 py-2 border border-border/40 focus:outline-none focus:border-primary/50 transition-all"
            />
          </div>

          {/* Severity */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-auto bg-accent/30 text-foreground text-xs rounded-lg px-3 py-2 border border-border/40 focus:outline-none focus:border-primary/50"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alert List */}
      {filteredAlerts.length === 0 ? (
        <EmptyState
          title={viewResolved ? "No Resolved Alerts" : "No Active Alerts"}
          description={viewResolved ? "No alerts have been resolved yet." : "All systems are green. No active thresholds breached."}
          icon={CheckCircle}
        />
      ) : (
        <div className="grid gap-4">
          {filteredAlerts.map((alert) => (
            <Card
              key={alert.id}
              className={`border-l-4 bg-card/60 backdrop-blur-sm shadow-sm transition-all duration-200 ${
                alert.type === 'CRITICAL'
                  ? 'border-l-rose-500 border-border/60 hover:border-l-rose-600'
                  : alert.type === 'WARNING'
                  ? 'border-l-amber-500 border-border/60 hover:border-l-amber-600'
                  : 'border-l-blue-500 border-border/60 hover:border-l-blue-600'
              }`}
            >
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        alert.type === 'CRITICAL'
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          : alert.type === 'WARNING'
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      }`}
                    >
                      {alert.type}
                    </span>
                    <span className="text-xs font-bold text-foreground">{alert.machine.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">ID: {alert.machineId}</span>
                  </div>
                  <p className="font-semibold text-sm text-foreground">{alert.message}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Logged: {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>

                {!alert.resolved ? (
                  <Button
                    size="sm"
                    onClick={() => resolveMutation.mutate(alert.id)}
                    disabled={resolveMutation.isPending}
                    className="bg-primary/95 hover:bg-primary font-semibold text-xs h-8 px-4 flex items-center space-x-1.5 rounded-lg shrink-0"
                  >
                    <Check className="h-4 w-4" />
                    <span>Resolve Alert</span>
                  </Button>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase flex items-center space-x-1">
                    <Check className="h-3 w-3" />
                    <span>Acknowledged</span>
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
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
    </div>
  );
}

