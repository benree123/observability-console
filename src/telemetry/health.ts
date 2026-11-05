import type { Health, MetricPoint, Service } from './types';

/** Alerting thresholds, the same rules an on-call engineer would page on. */
export const THRESHOLDS = {
  latencyMs: { degraded: 400, down: 1200 },
  errorRatePct: { degraded: 1, down: 5 },
} as const;

export function healthOf(point: MetricPoint): Health {
  if (
    point.errorRatePct >= THRESHOLDS.errorRatePct.down ||
    point.latencyMs >= THRESHOLDS.latencyMs.down
  ) {
    return 'down';
  }
  if (
    point.errorRatePct >= THRESHOLDS.errorRatePct.degraded ||
    point.latencyMs >= THRESHOLDS.latencyMs.degraded
  ) {
    return 'degraded';
  }
  return 'healthy';
}

export function latest(service: Service): MetricPoint {
  return service.series[service.series.length - 1];
}

export function serviceHealth(service: Service): Health {
  return healthOf(latest(service));
}

/** Share of samples in the window where the service was not down, as a percentage. */
export function availabilityPct(service: Service): number {
  const up = service.series.filter((p) => healthOf(p) !== 'down').length;
  return (up / service.series.length) * 100;
}

const HEALTH_RANK: Record<Health, number> = { down: 0, degraded: 1, healthy: 2 };

export function compareHealth(a: Health, b: Health): number {
  return HEALTH_RANK[a] - HEALTH_RANK[b];
}
