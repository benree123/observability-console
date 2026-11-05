# Observability Console

A cloud observability dashboard built with **React**, **TypeScript** and **Fluent UI v9**. It shows the health, metrics, logs and alerts of six services. All of them are fictional, and their telemetry is simulated in the browser.

**Live demo:** https://GITHUB_USERNAME.github.io/observability-console/

## What it does

- **Service health table:** status, p95 latency, error rate, throughput and 30-minute availability for each service. Sortable, and it opens on the worst service first.
- **Metrics chart:** latency, error rate or throughput over the last 30 minutes, with the alert threshold drawn on the chart.
- **Alerts:** raised automatically when a service crosses a threshold, deduplicated while open, and acknowledgeable.
- **Logs:** a live stream with text search, level filters and a filter for the selected service.
- **Live simulation:** one simulated minute every 3 seconds, with pause and single-step controls. A scripted incident on *Telemetry Ingest* (an error spike) and a slowdown on *Search Indexer* repeat, so there is always something to investigate.
- **Light and dark themes,** following the system setting by default.

## Accessibility

- Status is shown with an icon and text, not color alone.
- Each chart is an `role="img"` SVG with a text summary (latest, min, max, threshold) and a data table you can expand.
- Semantic headings, labelled tables and lists, `aria-sort` on sortable columns, and `aria-pressed` on the selected service.
- Fully keyboard operable through Fluent UI components.
- Responsive from phone width up. Wide tables scroll inside their card instead of the page.

## Tech

| Area | Choice |
| --- | --- |
| UI | React 19, Fluent UI React v9 (`@fluentui/react-components`), Griffel `makeStyles` with Fluent design tokens |
| Language | TypeScript (strict, `erasableSyntaxOnly`) |
| Build | Vite |
| Charts | Hand-written SVG, no chart library |
| Tests | Vitest, React Testing Library, user-event, jsdom |
| CI/CD | GitHub Actions: lint, test and build on every push and PR, then deploy to GitHub Pages |

## Project structure

```
src/
  telemetry/
    types.ts          Data model: services, metric samples, logs, alerts
    simulator.ts      Seeded, pure simulation: createInitialState() and tick()
    health.ts         Threshold rules: healthy / degraded / down, availability
    format.ts         Number and time formatting, log filtering
    useTelemetry.ts   React hook: reducer plus a timer for live updates
  components/
    SummaryCards.tsx  KPI cards
    ServiceTable.tsx  Sortable health table
    MetricsPanel.tsx  Metric tabs, chart and data table for one service
    LineChart.tsx     Accessible SVG line chart
    AlertsPanel.tsx   Alert list with acknowledge
    LogsPanel.tsx     Searchable, filterable log stream
    HealthBadge.tsx   Status badge
  App.tsx             Layout, theme switch, live controls
```

## Run it locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 19 unit and component tests
npm run build    # production build in dist/
```

## Design notes

- **The simulator is pure and seeded.** `tick(state)` returns a new state and never mutates the old one, and the random generator's state is part of the app state. The same seed always gives the same data, which keeps the tests deterministic.
- **Health rules live in one place** (`health.ts`). The table, badges, summary cards and alerting all use the same thresholds.
- **Alerts deduplicate.** A service with an open, unacknowledged alert at the same severity doesn't raise another one. That's the same behavior that stops real paging systems from flooding on-call.
- **Swapping in real data** means replacing `useTelemetry` with a hook that polls a metrics API, such as Azure Monitor or Prometheus. The components only depend on the types in `types.ts`.

---

All service names, metrics and log messages are made up for this demo.
