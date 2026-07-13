# MQTT Topic Schema Reference

## Broker Configuration

| Setting | Value |
|---|---|
| Broker | VerneMQ |
| Host | Configured via `MQTT_HOST` env var |
| Port | 1883 (TCP), 8083 (WebSocket) |
| QoS | 1 (at least once) |
| Client ID | `admin-backend_{random}` |

---

## Topic Hierarchy

```
mfg/{machineId}/{messageType}        ← Legacy simulator format
Limelight/Factory/{machineId}/{type} ← Real hardware (ESP32)
```

The backend subscribes to both `mfg/#` and `Limelight/#` wildcards.

---

## Topic Types

### 1. Telemetry — `mfg/{machineId}/telemetry`

Real-time sensor data from the machine.

**Payload:**
```json
{
  "deviceId": "device-DM-001",
  "machineId": "DM-001",
  "timestamp": "2026-07-10T07:00:00.000Z",
  "temperature": 72.4,
  "vibration": 1.5,
  "speed": 1450.0,
  "power": 5200
}
```

| Field | Type | Unit | Description |
|---|---|---|---|
| `deviceId` | string | — | IoT device identifier |
| `machineId` | string | — | Machine identifier |
| `timestamp` | ISO 8601 | — | Optional, defaults to `now()` |
| `temperature` | float | °C | Ambient / motor temperature |
| `vibration` | float | mm/s | Vibration velocity |
| `speed` | float | RPM | Spindle/shaft speed |
| `power` | float | W | Active power consumption |

---

### 2. State — `mfg/{machineId}/state`

Machine operational state change events.

**Payload:**
```json
{
  "deviceId": "device-DM-001",
  "machineId": "DM-001",
  "status": "RUNNING",
  "timestamp": "2026-07-10T07:00:00.000Z"
}
```

| `status` | Meaning |
|---|---|
| `RUNNING` | Machine actively producing |
| `IDLE` | Powered but no production |
| `STOPPED` | Production halted |
| `ERROR` | Fault condition |

---

### 3. Health — `mfg/{machineId}/health`

IoT device hardware telemetry (battery, signal, firmware).

**Payload:**
```json
{
  "deviceId": "device-DM-001",
  "machineId": "DM-001",
  "battery": 85,
  "signal": -68,
  "uptime": 86400,
  "firmware": "v2.1.3",
  "timestamp": "2026-07-10T07:00:00.000Z"
}
```

---

### 4. LWT — `mfg/{machineId}/lwt`

Last Will and Testament — automatically published by broker on unexpected disconnect.

**Payload:**
```json
{
  "deviceId": "device-DM-001",
  "machineId": "DM-001",
  "status": "OFFLINE",
  "timestamp": "2026-07-10T07:00:00.000Z"
}
```

---

### 5. Downtime — `mfg/{machineId}/downtime`

Explicit downtime signal from device or operator.

**Payload:**
```json
{
  "deviceId": "device-DM-001",
  "machineId": "DM-001",
  "event": "START",
  "reason": "Scheduled maintenance",
  "timestamp": "2026-07-10T07:00:00.000Z"
}
```

| `event` | Meaning |
|---|---|
| `START` | Downtime period begins |
| `END` | Downtime period ends |

---

### 6. Lifecycle — `mfg/{machineId}/lifecycle`

Device power lifecycle events.

**Payload:**
```json
{
  "deviceId": "device-DM-001",
  "machineId": "DM-001",
  "event": "BOOT",
  "timestamp": "2026-07-10T07:00:00.000Z"
}
```

| `event` | Meaning |
|---|---|
| `BOOT` | Device powered on / restarted |
| `SHUTDOWN` | Graceful shutdown |
| `REBOOT` | Device rebooting |

---

## Real Hardware Topic Mapping (ESP32)

The backend normalizes real hardware topics from:
```
Limelight/Factory/{machineId}/livedata
```
into the internal telemetry format. Field mappings:

| Hardware Field | Internal Field |
|---|---|
| `temp` | `temperature` |
| `vib_vel_` | `vibration` |
| `encoder_rpm` | `speed` |
| `kw` × 1000 | `power` (W) |
| `mac_id` | `macAddress` |

---

## Auto-Provisioning

When a message arrives for an unknown `machineId`, the backend automatically:
1. Creates the factory (`factory-01`) if it doesn't exist
2. Creates the machine record
3. Creates the device record with the provided MAC address

This allows plug-and-play hardware onboarding without manual DB setup.
