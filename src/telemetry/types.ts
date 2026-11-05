export type Health = 'healthy' | 'degraded' | 'down';
export type LogLevel = 'info' | 'warning' | 'error';
export type Severity = 'critical' | 'warning';
export type MetricKey = 'latencyMs' | 'errorRatePct' | 'requestsPerMin';

export interface MetricPoint {
  /** Unix time in milliseconds. */
  t: number;
  latencyMs: number;
  errorRatePct: number;
  requestsPerMin: number;
}

export interface Service {
  id: string;
  name: string;
  region: string;
  owner: string;
  /** Rolling window of per-minute samples, oldest first. */
  series: MetricPoint[];
}

export interface LogEntry {
  id: string;
  t: number;
  level: LogLevel;
  serviceId: string;
  message: string;
}

export interface Alert {
  id: string;
  serviceId: string;
  severity: Severity;
  title: string;
  t: number;
  acknowledged: boolean;
}

export interface TelemetryState {
  now: number;
  /** Minutes since the simulation started; drives the scripted incidents. */
  step: number;
  services: Service[];
  logs: LogEntry[];
  alerts: Alert[];
  /** PRNG state, so every tick is reproducible from the seed. */
  rngState: number;
  nextId: number;
}
