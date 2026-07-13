/**
 * Thread-safe lightweight in-memory system telemetry statistics counter.
 */
class TelemetryStats {
  private messagesReceived = 0;
  private messagesPerMinute = 0;
  private startTime = Date.now();

  constructor() {
    // Reset and calculate every minute
    setInterval(() => {
      this.messagesPerMinute = this.messagesReceived;
      this.messagesReceived = 0;
    }, 60000);
  }

  public incrementMessageCounter() {
    this.messagesReceived++;
  }

  public getMessagesPerMinute() {
    return this.messagesPerMinute;
  }

  public getUptimeSeconds() {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
}

export const telemetryStats = new TelemetryStats();
