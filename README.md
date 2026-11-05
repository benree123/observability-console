# Observability Console

[![CI](https://github.com/benree123/observability-console/actions/workflows/ci.yml/badge.svg)](https://github.com/benree123/observability-console/actions/workflows/ci.yml)

A portfolio project: a front-end dashboard in the style of a cloud observability tool, built with **React**, **TypeScript** and **Fluent UI v9**.

> **All data is fictional.** The six services, their metrics, logs and alerts are generated in the browser by a small simulator (`src/telemetry/simulator.ts`). The app has no backend. It doesn't connect to, monitor or read data from any real system, cloud account or Azure service.

## What it is

A single-page dashboard with the views an on-call engineer would use during an incident:

- **Summary cards:** healthy services, average p95 latency, total throughput and open alerts.
- **Service health table:** status, p95 latency, error rate, throughput and 30-minute availability for each service. Sortable, and it opens on the worst service first.
- **Metrics chart:** latency, error rate or throughput for the selected service over the last 30 simulated minutes, with the alert threshold drawn on the chart and an expandable data table.
- **Alerts:** raised when a simulated service crosses a threshold, not repeated while one is already open, and acknowledgeable.
- **Logs:** a stream with text search, Error, Warning and Info level filters, and a filter for the selected service.
- **Simulation controls:** the data advances one simulated minute every 3 seconds. You can pause it or step one minute at a time. A scripted incident repeats, so there's always something to look at.
- **Light and dark themes,** following the system setting by default, plus a toggle.

## Stack

| Area | Choice |
| --- | --- |
| UI | React 19, Fluent UI React v9 (`@fluentui/react-components`, `@fluentui/react-icons`) |
| Styling | Griffel `makeStyles` / `mergeClasses` with Fluent design tokens |
| Language | TypeScript |
| Build | Vite |
| Charts | Hand-written SVG, no chart library |
| Tests | Vitest, React Testing Library, user-event, jsdom |
| Lint | oxlint |
| CI | GitHub Actions: lint, test and production build on every push to `main` and every pull request |

## How to run it

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

For a production build:

```bash
npm run build     # outputs to dist/
npm run preview   # serves the built files locally
```

## How to test it

```bash
npm test             # run all tests once
npm run test:watch   # re-run on file changes
npm run lint
```

What the tests cover:

- **Simulator and rules** (`src/telemetry/simulator.test.ts`): health thresholds, same seed gives the same data, `tick()` doesn't mutate state, alert deduplication, incident recovery, and log filtering.
- **UI** (`src/App.test.tsx`): rendering, service selection, metric tabs, column sorting, acknowledging alerts, each log level filter (Error, Warning, Info) on its own and combined, the service filter, stepping time, and the dark theme (following the system setting, and the toggle).
- **No console errors:** the test setup fails any test that logs a `console.error`, such as React warnings or Fluent UI's `mergeClasses()` check.

## Project structure

```
src/
  telemetry/
    types.ts          Data model: services, metric samples, logs, alerts
    simulator.ts      Seeded, pure simulation of fictional services
    health.ts         Threshold rules: healthy / degraded / down
    format.ts         Number and time formatting, log filtering
    useTelemetry.ts   React hook: reducer plus a timer for live updates
  components/         SummaryCards, ServiceTable, MetricsPanel, LineChart,
                      AlertsPanel, LogsPanel, HealthBadge
  App.tsx             Layout, theme toggle, simulation controls
```

## Accessibility

- Status is shown with an icon and text, not color alone.
- Charts are `role="img"` SVGs with a text summary, and the values are available in a table.
- Sortable columns expose `aria-sort`, and the selected service uses `aria-pressed`.
- Built from Fluent UI components, so everything works with the keyboard.

## Optional: publish a demo

`.github/workflows/deploy-pages.yml` can publish the built app to GitHub Pages. Turn on Pages in **Settings → Pages → Source: GitHub Actions**, then run the workflow from the **Actions** tab.
