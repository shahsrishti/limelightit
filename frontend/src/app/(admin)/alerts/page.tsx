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
  ShieldAlert,
  BarChart2
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
  Cell
} from 'recharts';
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
  const [limit, setLimit] = useState(10);
  const [jumpPageInput, setJumpPageInput] = useState('');

  // React Query Fetch
  const { data: alertsRes, isLoading, error, refetch } = useQuery<AlertResponse>({
    queryKey: ['alerts-page', viewResolved, severityFilter, page, limit],
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
  const totalRecords = alertsRes?.pagination?.total ?? 0;

  // Calculate incident frequency bar chart from active alerts
  const alertChartData = useMemo(() => {
    if (!alertsRes?.data) return [];
    const counts: Record<string, number> = {};
    alertsRes.data.forEach((alert) => {
      const name = alert.machine?.name || alert.machineId;
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({
      name,
      'Incident Count': count,
    }));
  }, [alertsRes]);

  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpPageInput);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      setPage(target);
      setJumpPageInput('');
    } else {
      toast.error(`Invalid page number. Please enter a page between 1 and ${totalPages}.`);
    }
  };

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
          <p className="text-xs text-muted-foreground">Observe and acknowledge incident alert warnings from plant supervisors.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="flex items-center space-x-1">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Top Section: Charts & Frequency breakdown */}
      {alertChartData.length > 0 && !viewResolved && (
        <Card className="border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center space-x-1.5">
              <BarChart2 className="h-4 w-4 text-rose-500" />
              <span>Incident Frequency by Machine Asset</span>
            </CardTitle>
            <CardDescription>Identifying bad-actor equipment experiencing repetitive threshold limits breaches.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alertChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
                  <XAxis dataKey="name" className="text-[9px] text-muted-foreground" />
                  <YAxis className="text-[9px] text-muted-foreground font-mono" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                  />
                  <Bar dataKey="Incident Count" fill="hsl(var(--status-error))" radius={[4, 4, 0, 0]}>
                    {alertChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="hsl(var(--status-error))" fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

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
              placeholder="Search active alerts..."
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

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap gap-2 text-xs items-center">
        <span className="text-muted-foreground font-semibold">Active Chips:</span>
        <button
          onClick={() => {
            setSeverityFilter('ALL');
            setPage(1);
          }}
          className={`px-2.5 py-1 rounded-full border text-[10px] uppercase font-extrabold ${severityFilter === 'ALL' ? 'bg-primary text-white border-primary' : 'bg-muted text-muted-foreground border-border'}`}
        >
          All
        </button>
        {(['CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => (
          <button
            key={sev}
            onClick={() => {
              setSeverityFilter(sev);
              setPage(1);
            }}
            className={`px-2.5 py-1 rounded-full border text-[10px] uppercase font-extrabold transition-all ${
              severityFilter === sev
                ? sev === 'CRITICAL'
                  ? 'bg-rose-500 text-white border-rose-500'
                  : sev === 'WARNING'
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-blue-500 text-white border-blue-500'
                : 'bg-muted text-muted-foreground border-border hover:bg-accent/40'
            }`}
          >
            {sev}
          </button>
        ))}
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

      {/* Pagination & Limit selectors */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-4 text-xs">
          <div className="flex items-center space-x-3 text-muted-foreground">
            <span>
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalRecords)} of {totalRecords} records
            </span>
            <div className="flex items-center space-x-1">
              <span>Limit:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-accent/40 text-foreground text-xs rounded border border-border/40 px-1 py-0.5 focus:outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Jump to Page Form */}
            <form onSubmit={handleJumpToPage} className="flex items-center space-x-1.5">
              <span className="text-muted-foreground">Jump:</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                className="bg-accent/40 text-foreground w-12 rounded border border-border/40 px-1.5 py-0.5 focus:outline-none text-center font-mono font-bold"
              />
              <Button type="submit" variant="outline" size="sm" className="h-7 text-[10px] px-2 font-semibold">
                Go
              </Button>
            </form>

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
        </div>
      )}
    </div>
  );
}
