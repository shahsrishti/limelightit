# Socket.IO Events Reference

## Connection

The frontend connects to: `http://localhost:5000` (configured via `NEXT_PUBLIC_SOCKET_URL`)

```typescript
import { io } from 'socket.io-client';
const socket = io('http://localhost:5000', {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 2000,
});
```

---

## Server → Client Events

Events emitted by the backend and received by the browser dashboard.

### `machine:status`
Emitted when a machine's operational status changes.

```typescript
interface MachineStatusEvent {
  machineId: string;
  status: 'RUNNING' | 'IDLE' | 'STOPPED' | 'ERROR';
  timestamp: string; // ISO 8601
}
```

**Triggers:** MQTT state message, LWT, heartbeat timeout

---

### `machine:telemetry`
Emitted when new telemetry data is received from a machine.

```typescript
interface TelemetryEvent {
  machineId: string;
  temperature?: number;
  vibration?: number;
  speed?: number;
  power?: number;
  timestamp: string;
}
```

**Triggers:** MQTT telemetry message

---

### `alert:new`
Emitted when a new alert is created.

```typescript
interface AlertEvent {
  id: string;
  machineId: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  resolved: boolean;
  timestamp: string;
}
```

**Triggers:** Telemetry threshold breach, heartbeat timeout, LWT

---

### `alert:resolved`
Emitted when an alert is resolved (either manually or automatically).

```typescript
interface AlertResolvedEvent {
  machineId: string;
  timestamp: string;
}
```

**Triggers:** Device resumes communication, manual resolve via API

---

### `device:health`
Emitted when device health data is received.

```typescript
interface DeviceHealthEvent {
  deviceId: string;
  machineId: string;
  battery?: number;
  signal?: number;
  uptime?: number;
  timestamp: string;
}
```

---

### `oee:update`
Emitted when OEE data is recalculated.

```typescript
interface OEEUpdateEvent {
  machineId: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  timestamp: string;
}
```

---

## Client → Server Events

Events the frontend can emit to the backend (informational only — no commands supported in current version).

> Currently, the frontend only listens to server-sent events. Client→server communication is handled via REST APIs.

---

## Usage in React

```typescript
// Subscribe to a socket event in a component
import { useSocket } from '@/hooks/useSocket';

function MachineCard({ machineId }: { machineId: string }) {
  const [status, setStatus] = useState('UNKNOWN');

  useSocket('machine:status', (event) => {
    if (event.machineId === machineId) {
      setStatus(event.status);
    }
  });

  return <div>Status: {status}</div>;
}
```

```typescript
// Access raw socket instance
import { useSocketContext } from '@/providers/SocketProvider';

function StatusIndicator() {
  const { isConnected } = useSocketContext();
  return <span>{isConnected ? '🟢 Live' : '🔴 Offline'}</span>;
}
```

---

## Redis Pub/Sub Adapter

In production (multi-process or multi-instance deployment), Socket.IO uses the Redis adapter to broadcast events across all server instances.

Configure via `REDIS_HOST` and `REDIS_PORT` in the backend `.env`.  
The system **gracefully degrades** if Redis is unavailable — events are still emitted locally.
