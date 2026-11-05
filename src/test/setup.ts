import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { type MockInstance, afterEach, beforeEach, expect, vi } from 'vitest';

// Fail any test that logs a console error, such as React warnings or Fluent UI's
// mergeClasses() check, so these problems are caught in CI rather than in the browser.
let consoleError: MockInstance<typeof console.error>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error');
});
afterEach(() => {
  cleanup();
  const calls = consoleError.mock.calls.map((args: unknown[]) => args.map(String).join(' '));
  consoleError.mockRestore();
  expect(calls, 'console.error was called').toEqual([]);
});

// jsdom has no matchMedia; Fluent UI and the theme detection read it.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
