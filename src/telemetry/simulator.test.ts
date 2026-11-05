import { describe, expect, it } from 'vitest';
import { availabilityPct, healthOf, latest, serviceHealth } from './health';
import { filterLogs } from './format';
import { PROFILES, TICK_MS, WINDOW_SIZE, acknowledgeAlert, createInitialState, tick } from './simulator';
import type { LogLevel } from './types';

const NOW = Date.UTC(2026, 10, 5, 17, 30);

describe('healthOf', () => {
  const point = { t: 0, latencyMs: 100, errorRatePct: 0.2, requestsPerMin: 1000 };

  it('is healthy below every threshold', () => {
    expect(healthOf(point)).toBe('healthy');
  });

  it('is degraded at the latency or error-rate warning threshold', () => {
    expect(healthOf({ ...point, latencyMs: 400 })).toBe('degraded');
    expect(healthOf({ ...point, errorRatePct: 1 })).toBe('degraded');
  });

  it('is down at the critical threshold, which wins over degraded', () => {
    expect(healthOf({ ...point, errorRatePct: 5 })).toBe('down');
    expect(healthOf({ ...point, latencyMs: 1200, errorRatePct: 2 })).toBe('down');
  });
});

describe('simulator', () => {
  it('is deterministic for a given seed', () => {
    expect(createInitialState(7, NOW)).toEqual(createInitialState(7, NOW));
    expect(tick(createInitialState(7, NOW))).toEqual(tick(createInitialState(7, NOW)));
  });

  it('creates a full window per service, one sample per minute', () => {
    const state = createInitialState(42, NOW);
    expect(state.services).toHaveLength(PROFILES.length);
    for (const service of state.services) {
      expect(service.series).toHaveLength(WINDOW_SIZE);
      expect(service.series[1].t - service.series[0].t).toBe(TICK_MS);
    }
  });

  it('starts mid-incident so the demo has something to investigate', () => {
    const state = createInitialState(42, NOW);
    const ingest = state.services.find((s) => s.id === 'ingest')!;
    expect(serviceHealth(ingest)).toBe('down');
    expect(availabilityPct(ingest)).toBeLessThan(100);
    expect(state.alerts.some((a) => a.serviceId === 'ingest' && a.severity === 'critical')).toBe(true);
  });

  it('tick slides the window forward without mutating the previous state', () => {
    const before = createInitialState(42, NOW);
    const snapshot = structuredClone(before);
    const after = tick(before);
    expect(before).toEqual(snapshot);
    expect(after.now).toBe(before.now + TICK_MS);
    expect(latest(after.services[0]).t).toBe(after.now);
    expect(after.services[0].series).toHaveLength(WINDOW_SIZE);
    expect(after.logs.length).toBeGreaterThan(before.logs.length);
  });

  it('does not raise a duplicate alert while one is open, but does after it is acknowledged', () => {
    let state = createInitialState(42, NOW);
    const isIngestCritical = (a: { serviceId: string; severity: string }) =>
      a.serviceId === 'ingest' && a.severity === 'critical';
    const open = state.alerts.filter(isIngestCritical);
    expect(open).toHaveLength(1);

    state = tick(state);
    expect(state.alerts.filter(isIngestCritical)).toHaveLength(1);

    state = tick(acknowledgeAlert(state, open[0].id));
    const all = state.alerts.filter(isIngestCritical);
    expect(all).toHaveLength(2);
    expect(all.filter((a) => !a.acknowledged)).toHaveLength(1);
  });

  it('recovers after the scripted incident ends', () => {
    let state = createInitialState(42, NOW);
    for (let i = 0; i < 8; i++) state = tick(state);
    expect(serviceHealth(state.services.find((s) => s.id === 'ingest')!)).not.toBe('down');
  });
});

describe('filterLogs', () => {
  const logs = createInitialState(42, NOW).logs;
  const all = new Set<LogLevel>(['info', 'warning', 'error']);

  it('returns everything with no filters', () => {
    expect(filterLogs(logs, { query: '', levels: all, serviceId: null })).toHaveLength(logs.length);
  });

  it('filters by level, service and case-insensitive text', () => {
    const errors = filterLogs(logs, { query: '', levels: new Set(['error']), serviceId: null });
    expect(errors.every((l) => l.level === 'error')).toBe(true);

    const ingest = filterLogs(logs, { query: '', levels: all, serviceId: 'ingest' });
    expect(ingest.every((l) => l.serviceId === 'ingest')).toBe(true);

    const word = logs[0].message.split(' ')[0].toUpperCase();
    const byText = filterLogs(logs, { query: word, levels: all, serviceId: null });
    expect(byText.length).toBeGreaterThan(0);
    expect(byText.every((l) => l.message.toUpperCase().includes(word))).toBe(true);
  });
});
