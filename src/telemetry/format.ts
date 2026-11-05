import type { LogEntry, LogLevel, MetricKey } from './types';

const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export const METRICS: Record<MetricKey, { label: string; unit: string; format: (v: number) => string }> = {
  latencyMs: { label: 'p95 latency', unit: 'ms', format: (v) => `${integer.format(v)} ms` },
  errorRatePct: { label: 'Error rate', unit: '%', format: (v) => `${v.toFixed(2)}%` },
  requestsPerMin: { label: 'Throughput', unit: 'req/min', format: (v) => `${integer.format(v)} req/min` },
};

export function formatClock(t: number): string {
  return new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatClockSeconds(t: number): string {
  return new Date(t).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatCompact(v: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
}

export interface LogFilter {
  query: string;
  levels: ReadonlySet<LogLevel>;
  /** Only show logs for this service; null means all services. */
  serviceId: string | null;
}

export function filterLogs(logs: LogEntry[], filter: LogFilter): LogEntry[] {
  const q = filter.query.trim().toLowerCase();
  return logs.filter(
    (log) =>
      filter.levels.has(log.level) &&
      (filter.serviceId === null || log.serviceId === filter.serviceId) &&
      (q === '' || log.message.toLowerCase().includes(q) || log.serviceId.includes(q)),
  );
}
