export interface DashboardStats {
  totalMachines: number;
  onlineMachines: number;
  offlineMachines: number;
  activeAlerts: number;
  activeDowntimes: number;
  todayProduction: number;
  averagePower: number;
  overallOEE: number | null;
}

export type MachineStatus = 'RUNNING' | 'IDLE' | 'STOPPED' | 'ERROR' | 'UNKNOWN';

export interface Machine {
  id: string;
  name: string;
  factory: string;
  currentStatus: MachineStatus;
  lastSeen: string | null;
  power: number | null;
  temperature: number | null;
  deviceCount: number;
}

export interface Alert {
  id: string;
  machineId: string;
  machine: { name: string };
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  resolved: boolean;
  timestamp: string;
}

export interface DowntimeSession {
  id: string;
  machineId: string;
  machine: { name: string };
  startTime: string;
  endTime: string | null;
  reason: string | null;
  durationMs: number;
  active: boolean;
}

export interface OEESummary {
  averageAvailability: number | null;
  averagePerformance: number | null;
  averageQuality: number | null;
  overallOEE: number | null;
}

// Socket.IO event payloads
export interface TelemetryEvent {
  machineId: string;
  deviceId: string;
  metrics: {
    temperature?: number;
    vibration?: number;
    speed?: number;
    power?: number;
  };
  timestamp: string;
}

export interface StatusEvent {
  machineId: string;
  status: MachineStatus;
  timestamp: string;
}

export interface AlertEvent {
  alertId: string;
  machineId: string;
  type: string;
  message: string;
  timestamp: string;
}
