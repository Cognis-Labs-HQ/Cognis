export interface HealthStatus {
  status: 'ok';
  timestamp: string;
  startedAt: string;
  uptimeMs: number;
}

export class HealthService {
  private readonly startedAtDate = new Date();

  status(now = new Date()): HealthStatus {
    return {
      status: 'ok',
      timestamp: now.toISOString(),
      startedAt: this.startedAtDate.toISOString(),
      uptimeMs: Math.max(0, now.getTime() - this.startedAtDate.getTime())
    };
  }
}
