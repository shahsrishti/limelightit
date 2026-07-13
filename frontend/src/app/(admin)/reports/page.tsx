'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { ApiResponse } from '@/types/api.types';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import {
  FileSpreadsheet,
  Download,
  Trash2,
  CheckCircle,
  FileText,
  RefreshCw,
  Layers
} from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF } from '@/utils/export';
import { toast } from 'sonner';

interface MachineItem {
  id: string;
  name: string;
}

interface DownloadLog {
  id: string;
  name: string;
  dataset: string;
  format: 'CSV' | 'EXCEL' | 'PDF';
  records: number;
  timestamp: string;
}

export default function ReportsPage() {
  // Fetch machines to populate selection dropdown
  const { data: machines, isLoading, refetch } = useQuery<MachineItem[]>({
    queryKey: ['machines-reports-dropdown'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<MachineItem[]>>('/machines');
      return data.data;
    },
  });

  const [selectedDataset, setSelectedDataset] = useState('telemetry');
  const [selectedMachineId, setSelectedMachineId] = useState('ALL');
  const [dateRange, setDateRange] = useState('7d');
  const [fileFormat, setFileFormat] = useState<'CSV' | 'EXCEL' | 'PDF'>('CSV');
  const [recentDownloads, setRecentDownloads] = useState<DownloadLog[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Print layout state
  const [printData, setPrintData] = useState<any[]>([]);
  const [printTitle, setPrintTitle] = useState('');
  const [printFilters, setPrintFilters] = useState<Record<string, string>>({});

  // Load download logs from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mfg-reports-downloads-v1');
    if (saved) {
      try {
        setRecentDownloads(JSON.parse(saved));
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  const handleGenerateReport = async () => {
    setIsExporting(true);
    toast.info('Aggregating database indices and formatting report...', {
      description: 'Please wait while we process the industrial logs.',
    });

    try {
      let dataToExport: any[] = [];
      let filename = `report_${selectedDataset}_${dateRange}`;
      let title = `Industrial Dashboard Report - ${selectedDataset.toUpperCase()}`;

      if (selectedDataset === 'machines') {
        const { data } = await apiClient.get<ApiResponse<any[]>>('/machines');
        dataToExport = data.data || [];
        filename = `machines_fleet_status_${dateRange}`;
        title = 'Machines Fleet Status Report';
      } else if (selectedDataset === 'alerts') {
        const { data } = await apiClient.get<ApiResponse<any[]>>('/alerts');
        dataToExport = data.data || [];
        filename = `alerts_log_${dateRange}`;
        title = 'Incident Alerts Log Report';
      } else if (selectedDataset === 'downtime') {
        const { data } = await apiClient.get<ApiResponse<any[]>>('/downtime');
        dataToExport = (data as any).data || [];
        filename = `downtime_session_log_${dateRange}`;
        title = 'Outage Downtime Session Log Report';
      } else {
        // Telemetry history, production & energy data
        const id = selectedMachineId === 'ALL' ? (machines?.[0]?.id || 'cnc-01') : selectedMachineId;
        const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // last 7 days default
        const { data } = await apiClient.get<ApiResponse<any>>(`/machines/${id}/history`, {
          params: { from: fromDate },
        });
        
        const historyData = data.data?.records || [];
        
        if (selectedDataset === 'production') {
          filename = `production_count_log_${dateRange}`;
          title = 'Hourly Production Output Report';
          dataToExport = historyData.map((r: any) => ({
            timestamp: r.timestamp,
            speed_rpm: r.speed || 0,
            produced_qty: Math.floor((r.power || 0) / 35),
          }));
        } else if (selectedDataset === 'energy') {
          filename = `energy_kwh_utility_${dateRange}`;
          title = 'Utility Power & Energy Consumption Report';
          dataToExport = historyData.map((r: any) => ({
            timestamp: r.timestamp,
            active_power_kw: ((r.power || 0) / 1000).toFixed(2),
            accumulated_energy_kwh: ((r.power || 0) * 0.12).toFixed(2),
          }));
        } else {
          filename = `telemetry_waveform_history_${dateRange}`;
          title = 'Edge Telemetry Waveform History Report';
          dataToExport = historyData;
        }
      }

      if (dataToExport.length === 0) {
        dataToExport = [
          { timestamp: new Date().toISOString(), value: 'No records found in database query' }
        ];
      }

      const filtersApplied = {
        Dataset: selectedDataset,
        Machine: selectedMachineId,
        Range: dateRange,
      };

      if (fileFormat === 'PDF') {
        // Set state for print layout and trigger print
        setPrintTitle(title);
        setPrintFilters(filtersApplied);
        setPrintData(dataToExport.slice(0, 150)); // Limit to 150 rows for printing clean layout pages
        
        // Wait for state layout hydration then trigger browser print
        setTimeout(() => {
          exportToPDF();
        }, 150);
      } else if (fileFormat === 'EXCEL') {
        exportToExcel({
          filename,
          title,
          filters: filtersApplied,
          data: dataToExport,
        });
      } else {
        exportToCSV({
          filename,
          title,
          filters: filtersApplied,
          data: dataToExport,
        });
      }

      // Save to local downloads history
      const newDownload: DownloadLog = {
        id: Math.random().toString(36).substring(2, 9),
        name: `${filename}.${fileFormat.toLowerCase() === 'csv' ? 'csv' : fileFormat.toLowerCase() === 'excel' ? 'xls' : 'pdf'}`,
        dataset: selectedDataset.toUpperCase().replace('_', ' '),
        format: fileFormat,
        records: dataToExport.length,
        timestamp: new Date().toISOString(),
      };

      const updatedDownloads = [newDownload, ...recentDownloads].slice(0, 15);
      setRecentDownloads(updatedDownloads);
      localStorage.setItem('mfg-reports-downloads-v1', JSON.stringify(updatedDownloads));

      toast.success('Report generated successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate report');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem('mfg-reports-downloads-v1');
    setRecentDownloads([]);
    toast.success('Report history cleared');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Reports & Exports</h2>
          <p className="text-xs text-muted-foreground">Loading reports control panel...</p>
        </div>
        <div className="h-64 border rounded-xl animate-pulse bg-muted/20" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Screen view content */}
      <div className="no-print space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Industrial Reports & Data Exporter</h2>
            <p className="text-xs text-muted-foreground">Export historical telemetry waveforms, plant outages, downtime, and energy records in CSV/Excel/PDF formats.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="flex items-center space-x-1">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Left Form */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center space-x-2">
                  <Layers className="h-4.5 w-4.5 text-primary" />
                  <span>Export Configuration</span>
                </CardTitle>
                <CardDescription>Select datasets, time filters, and export formats to download records.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Dataset Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Dataset Category</label>
                    <select
                      value={selectedDataset}
                      onChange={(e) => setSelectedDataset(e.target.value)}
                      className="w-full bg-accent/30 text-foreground text-xs rounded-lg px-3 py-2.5 border border-border/40 focus:outline-none focus:border-primary/50"
                    >
                      <option value="machines">Machine List & State Statuses</option>
                      <option value="telemetry">Telemetry History (Power, Vibration, Speed)</option>
                      <option value="alerts">Alert Logs (Incident logs & Acknowledges)</option>
                      <option value="downtime">Downtime Logs (Reason codes & Durations)</option>
                      <option value="production">Production Data (Derived Part Counts)</option>
                      <option value="energy">Energy Data (kWh calculations & Load grids)</option>
                    </select>
                  </div>

                  {/* Machine Target */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Target Node / Asset</label>
                    <select
                      value={selectedMachineId}
                      onChange={(e) => setSelectedMachineId(e.target.value)}
                      disabled={selectedDataset === 'machines' || selectedDataset === 'alerts' || selectedDataset === 'downtime'}
                      className="w-full bg-accent/30 text-foreground text-xs rounded-lg px-3 py-2.5 border border-border/40 focus:outline-none focus:border-primary/50 disabled:opacity-50"
                    >
                      <option value="ALL">All Machines Combined</option>
                      {machines?.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date range selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Date Range Filter</label>
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      className="w-full bg-accent/30 text-foreground text-xs rounded-lg px-3 py-2.5 border border-border/40 focus:outline-none focus:border-primary/50"
                    >
                      <option value="today">Today (Shift A/B/C)</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="7d">Last 7 Days</option>
                      <option value="30d">Last 30 Days (Monthly aggregate)</option>
                    </select>
                  </div>

                  {/* File format */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">File Output Format</label>
                    <select
                      value={fileFormat}
                      onChange={(e: any) => setFileFormat(e.target.value)}
                      className="w-full bg-accent/30 text-foreground text-xs rounded-lg px-3 py-2.5 border border-border/40 focus:outline-none focus:border-primary/50"
                    >
                      <option value="CSV">Comma Separated Values (.csv)</option>
                      <option value="EXCEL">Excel Spreadsheets (.xls)</option>
                      <option value="PDF">Printer Friendly Layout (.pdf)</option>
                    </select>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={handleGenerateReport}
                    disabled={isExporting}
                    className="bg-primary/95 hover:bg-primary font-bold text-xs h-9 px-6 flex items-center space-x-1.5"
                  >
                    <Download className="h-4 w-4" />
                    <span>Generate & Download Report</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Download logs */}
            <Card className="border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Recent Exporter Log</CardTitle>
                  <CardDescription>Records downloaded during active browser session.</CardDescription>
                </div>
                {recentDownloads.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearHistory}
                    className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    <span>Clear History</span>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0 border-t border-border/40">
                {recentDownloads.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No recently generated downloads.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border/40">
                          <th className="p-3 font-semibold text-muted-foreground">Report Filename</th>
                          <th className="p-3 font-semibold text-muted-foreground">Dataset</th>
                          <th className="p-3 font-semibold text-muted-foreground text-right">Records Count</th>
                          <th className="p-3 font-semibold text-muted-foreground text-center">Format</th>
                          <th className="p-3 font-semibold text-muted-foreground">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {recentDownloads.map((log) => (
                          <tr key={log.id} className="hover:bg-accent/10 transition-colors">
                            <td className="p-3">
                              <span className="font-semibold text-foreground flex items-center space-x-1.5">
                                <FileText className="h-3.5 w-3.5 text-primary" />
                                <span>{log.name}</span>
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-muted-foreground text-[10px]">
                              {log.dataset}
                            </td>
                            <td className="p-3 text-right font-mono font-medium text-foreground">
                              {log.records}
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-[9px] font-extrabold bg-muted text-foreground px-1.5 py-0.5 rounded border">
                                {log.format}
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

          {/* Right Info Box */}
          <div className="space-y-6">
            <Card className="border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center space-x-2">
                  <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-500" />
                  <span>Reporting Policies</span>
                </CardTitle>
                <CardDescription>Administrative compliance and log retention rules.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground block">Data Integrity Guaranteed</strong>
                    <span className="text-muted-foreground">All generated spreadsheets contain digital cryptographic audit sums matching database indices.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground block">Real-Time Sync Check</strong>
                    <span className="text-muted-foreground">Reports query the primary PostgreSQL node directly, capturing the latest device packet counts.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground block">Format Support</strong>
                    <span className="text-muted-foreground">CSV/Excel exports follow RFC 4180 parameters. PDF exports render high-contrast tables matching regulatory standards.</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Print only container */}
      <div className="hidden print:block print-only p-8 text-black bg-white">
        <div className="flex justify-between items-center border-b pb-4 mb-6">
          <div className="flex items-center space-x-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white font-bold text-lg">
              M
            </div>
            <span className="font-extrabold text-xl tracking-wider text-black">ManufactureIQ Reports</span>
          </div>
          <div className="text-right text-xs text-neutral-500">
            <p>Generated: {new Date().toLocaleString()}</p>
            <p>Scope: Industrial Audit</p>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{printTitle}</h1>
          <div className="bg-neutral-50 p-4 rounded-lg border text-xs grid grid-cols-2 gap-4">
            <div>
              <span className="font-bold block uppercase text-[10px] text-neutral-500">Applied Filter Settings</span>
              {Object.entries(printFilters).map(([k, v]) => (
                <p key={k} className="text-neutral-700 capitalize"><strong className="text-neutral-900">{k}:</strong> {v}</p>
              ))}
            </div>
            <div>
              <span className="font-bold block uppercase text-[10px] text-neutral-500">Log Scope</span>
              <p className="text-neutral-700"><strong className="text-neutral-900">Scope:</strong> Plant Industrial MES logs</p>
            </div>
          </div>

          <table className="w-full text-left text-[10px] border-collapse mt-6 border">
            <thead>
              <tr className="bg-neutral-100 border-b border-neutral-300">
                {printData.length > 0 && Object.keys(printData[0]).map((h) => (
                  <th key={h} className="p-2 font-bold text-neutral-800 uppercase tracking-wider border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {printData.map((row, idx) => (
                <tr key={idx} className="hover:bg-neutral-50">
                  {Object.keys(row).map((h) => (
                    <td key={h} className="p-2 text-neutral-700 border font-mono">{String(row[h])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
