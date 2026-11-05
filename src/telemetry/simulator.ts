/**
 * Fictional telemetry generator. Everything here is made up: no real services,
 * customers or endpoints. It is seeded so tests and screenshots are reproducible.
 */
import { healthOf, latest } from './health';
import type { Alert, LogEntry, LogLevel, MetricPoint, Service, TelemetryState } from './types';

export const WINDOW_SIZE = 30;
export const TICK_MS = 60_000;
const MAX_LOGS = 200;

interface Profile {
  id: string;
  name: string;
  region: string;
  owner: string;
  latencyMs: number;
  errorRatePct: number;
  requestsPerMin: number;
  /** How the service misbehaves over time, if at all. */
  incident?: 'error-spike' | 'slow';
}

export const PROFILES: Profile[] = [
  { id: 'api-gateway', name: 'API Gateway', region: 'West US 2', owner: 'Edge team', latencyMs: 120, errorRatePct: 0.3, requestsPerMin: 4200 },
  { id: 'auth', name: 'Auth Service', region: 'East US', owner: 'Identity team', latencyMs: 85, errorRatePct: 0.1, requestsPerMin: 2600 },
  { id: 'payments', name: 'Payments API', region: 'West Europe', owner: 'Commerce team', latencyMs: 210, errorRatePct: 0.5, requestsPerMin: 900 },
  { id: 'search', name: 'Search Indexer', region: 'Canada Central', owner: 'Discovery team', latencyMs: 330, errorRatePct: 0.6, requestsPerMin: 1500, incident: 'slow' },
  { id: 'notifications', name: 'Notifications', region: 'East US 2', owner: 'Messaging team', latencyMs: 95, errorRatePct: 0.2, requestsPerMin: 1800 },
  { id: 'ingest', name: 'Telemetry Ingest', region: 'Canada Central', owner: 'Platform team', latencyMs: 160, errorRatePct: 0.4, requestsPerMin: 6100, incident: 'error-spike' },
];

const MESSAGES: Record<LogLevel, string[]> = {
  info: [
    'Health probe succeeded',
    'Deployment slot swap completed',
    'Autoscale added 1 instance',
    'Cache warmed in 840 ms',
    'Config reloaded from app settings',
  ],
  warning: [
    'Retrying downstream call (attempt 2 of 3)',
    'Queue depth above 1,000 messages',
    'p95 latency above target for 2 minutes',
    'Connection pool at 85% capacity',
  ],
  error: [
    'Downstream dependency returned 503',
    'Request timed out after 30 s',
    'Unhandled exception in request pipeline',
    'Failed to write batch to storage',
  ],
};

/** mulberry32: tiny, fast, deterministic PRNG. Returns [value in 0..1, next state]. */
export function nextRandom(state: number): [number, number] {
  const s = (state + 0x6d2b79f5) | 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

class Rng {
  state: number;
  constructor(state: number) {
    this.state = state;
  }
  next(): number {
    const [v, s] = nextRandom(this.state);
    this.state = s;
    return v;
  }
  /** Multiplicative jitter around 1, e.g. spread 0.1 gives 0.9..1.1. */
  jitter(spread: number): number {
    return 1 + (this.next() * 2 - 1) * spread;
  }
  pick<T>(items: T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
}

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/**
 * Sample one minute for a service. `step` counts minutes since the start of the
 * simulation and drives the scripted incidents so the demo always has something to show.
 */
function sample(profile: Profile, t: number, step: number, rng: Rng): MetricPoint {
  let latencyMs = profile.latencyMs * rng.jitter(0.15);
  let errorRatePct = profile.errorRatePct * rng.jitter(0.4);
  let requestsPerMin = profile.requestsPerMin * rng.jitter(0.08);

  // Incidents repeat every 40 minutes so a long-running demo keeps cycling.
  const phase = step % 40;
  if (profile.incident === 'error-spike' && phase >= 22 && phase < 34) {
    const ramp = Math.min(1, (phase - 21) / 4);
    errorRatePct += 7.5 * ramp * rng.jitter(0.2);
    latencyMs *= 1 + 0.6 * ramp;
  }
  if (profile.incident === 'slow' && phase >= 10 && phase < 30) {
    latencyMs *= 1.35 * rng.jitter(0.1);
  }

  return {
    t,
    latencyMs: Math.round(latencyMs),
    errorRatePct: round(Math.max(0, errorRatePct), 2),
    requestsPerMin: Math.round(requestsPerMin),
  };
}

function makeLog(state: TelemetryState, rng: Rng, service: Service): LogEntry {
  const health = healthOf(latest(service));
  const roll = rng.next();
  const level: LogLevel =
    health === 'down' ? (roll < 0.6 ? 'error' : 'warning')
    : health === 'degraded' ? (roll < 0.5 ? 'warning' : 'info')
    : roll < 0.04 ? 'error' : roll < 0.15 ? 'warning' : 'info';
  return {
    id: `log-${state.nextId++}`,
    t: state.now - Math.floor(rng.next() * TICK_MS),
    level,
    serviceId: service.id,
    message: rng.pick(MESSAGES[level]),
  };
}

/** Raise an alert when a service crosses a threshold, unless one is already open. */
function evaluateAlerts(state: TelemetryState): Alert[] {
  const raised: Alert[] = [];
  for (const service of state.services) {
    const health = healthOf(latest(service));
    if (health === 'healthy') continue;
    const severity = health === 'down' ? 'critical' : 'warning';
    const open = state.alerts.some(
      (a) => a.serviceId === service.id && !a.acknowledged && a.severity === severity,
    );
    if (open) continue;
    const point = latest(service);
    raised.push({
      id: `alert-${state.nextId++}`,
      serviceId: service.id,
      severity,
      title:
        severity === 'critical'
          ? `${service.name}: error rate ${point.errorRatePct.toFixed(1)}%`
          : `${service.name}: p95 latency ${point.latencyMs} ms`,
      t: state.now,
      acknowledged: false,
    });
  }
  return raised;
}

export function createInitialState(seed = 42, now = Date.now()): TelemetryState {
  const rng = new Rng(seed);
  const end = Math.floor(now / TICK_MS) * TICK_MS;
  const services: Service[] = PROFILES.map((p) => ({
    id: p.id,
    name: p.name,
    region: p.region,
    owner: p.owner,
    series: Array.from({ length: WINDOW_SIZE }, (_, i) =>
      sample(p, end - (WINDOW_SIZE - 1 - i) * TICK_MS, i, rng),
    ),
  }));
  const state: TelemetryState = {
    now: end,
    step: WINDOW_SIZE - 1,
    services,
    logs: [],
    alerts: [],
    rngState: 0,
    nextId: 1,
  };
  state.logs = Array.from({ length: 24 }, () => makeLog(state, rng, rng.pick(services))).sort(
    (a, b) => b.t - a.t,
  );
  state.alerts = evaluateAlerts(state);
  state.rngState = rng.state;
  return state;
}

/** Advance the simulation by one minute. Pure: returns a new state object. */
export function tick(prev: TelemetryState): TelemetryState {
  const rng = new Rng(prev.rngState);
  const now = prev.now + TICK_MS;
  const step = prev.step + 1;
  const services = prev.services.map((s, i) => ({
    ...s,
    series: [...s.series.slice(1), sample(PROFILES[i], now, step, rng)],
  }));
  const state: TelemetryState = { ...prev, now, step, services };
  const count = 1 + Math.floor(rng.next() * 3);
  const fresh = Array.from({ length: count }, () => makeLog(state, rng, rng.pick(services)));
  state.logs = [...fresh.sort((a, b) => b.t - a.t), ...prev.logs].slice(0, MAX_LOGS);
  state.alerts = [...evaluateAlerts(state), ...prev.alerts];
  state.rngState = rng.state;
  return state;
}

export function acknowledgeAlert(state: TelemetryState, alertId: string): TelemetryState {
  return {
    ...state,
    alerts: state.alerts.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)),
  };
}
