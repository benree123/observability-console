import { useCallback, useEffect, useReducer, useState } from 'react';
import { acknowledgeAlert, createInitialState, tick } from './simulator';
import type { TelemetryState } from './types';

type Action = { type: 'tick' } | { type: 'ack'; alertId: string };

function reducer(state: TelemetryState, action: Action): TelemetryState {
  return action.type === 'tick' ? tick(state) : acknowledgeAlert(state, action.alertId);
}

export interface TelemetryOptions {
  seed?: number;
  /** Real milliseconds between simulated minutes. */
  intervalMs?: number;
  live?: boolean;
  now?: number;
}

export function useTelemetry({ seed = 42, intervalMs = 3000, live: initialLive = true, now }: TelemetryOptions = {}) {
  const [state, dispatch] = useReducer(reducer, undefined, () => createInitialState(seed, now));
  const [live, setLive] = useState(initialLive);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => dispatch({ type: 'tick' }), intervalMs);
    return () => window.clearInterval(id);
  }, [live, intervalMs]);

  const acknowledge = useCallback((alertId: string) => dispatch({ type: 'ack', alertId }), []);
  const step = useCallback(() => dispatch({ type: 'tick' }), []);

  return { state, live, setLive, acknowledge, step };
}
