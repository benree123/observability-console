# Interview walkthrough

Notes for explaining this project in an interview. Read the code alongside them. You should be able to open any file and say what it does and why.

## The 30-second pitch

> "It's an observability dashboard of the kind an on-call engineer opens during an incident. Six services report latency, error rate and throughput every minute. The app works out health from thresholds, raises and deduplicates alerts, and streams logs you can filter. I built it with React, TypeScript and Fluent UI, because that's the stack your team uses. The data is simulated, and the simulator is pure and seeded, so the tests are deterministic."

## A 2-minute demo

1. **The top of the page:** "4 of 6 healthy, 2 open alerts. The table is sorted worst first, and Telemetry Ingest is down."
2. **The chart:** switch to **Error rate**. "It crossed the 1% degraded line and then the 5% down line. The dashed line is the alert threshold."
3. **Logs:** tick **Only Telemetry Ingest** and turn off **Info**. "Now I see only the errors for the broken service: 503s and timeouts from a dependency."
4. **Alerts:** click **Ack**. "The open count goes down. While an alert is open, the same condition doesn't raise another one."
5. **Pause and step:** "I can freeze time and step one minute at a time to watch the incident recover."
6. **Dark theme switch, and a narrow window:** "Fluent design tokens handle the theming, and the layout works down to phone width."

## How the code fits together

```
useTelemetry (state + timer)
   │  state = createInitialState(seed)  ──every 3 s──►  tick(state)
   ▼
App / Dashboard ──► SummaryCards, ServiceTable, MetricsPanel ─► LineChart
                └─► AlertsPanel (acknowledge ─► dispatch)
                └─► LogsPanel (filterLogs)
```

- **`simulator.ts`**: `createInitialState` builds 30 minutes of history. `tick` adds one minute: it drops the oldest sample, adds a new one, generates a few logs and checks alerts. It's a **pure function**, so it returns new objects and never edits the old ones. That's what React's `useReducer` expects, and it makes testing easy.
- **Seeded random numbers (`mulberry32`)**: `Math.random()` would make every test run different. The generator's state is stored in the app state, so the same seed always gives the same sequence.
- **`health.ts`**: one place for the thresholds. Down means 5% or more errors, or 1,200 ms or more latency. Degraded means 1% or 400 ms. Everything else uses these rules, so the badge, the table and the alerts can't disagree.
- **`useTelemetry.ts`**: `useReducer` holds the state. A `useEffect` starts a `setInterval` while live and clears it in the cleanup function when paused or unmounted.
- **`LineChart.tsx`**: plain SVG. It maps data to pixels with two small scale functions, `x(i)` and `y(v)`, then builds a path string. No chart library, so it stays small and accessible.

## Questions you may get, and good answers

**Why Fluent UI?**
It's Microsoft's design system, and it's used in Azure Portal, Teams and Office. It ships accessible components (keyboard support, ARIA and focus handling) and design tokens for theming.

**How does theming work?**
`FluentProvider` takes `webLightTheme` or `webDarkTheme`. Styles use `makeStyles` with `tokens.*`, which are CSS variables, so switching theme changes the variables instead of re-rendering styles.

**How would you connect real data?**
Replace `useTelemetry` with a hook that polls or streams from a backend, such as Azure Monitor's query API, Application Insights, or Prometheus behind an API. The components only depend on the types in `types.ts`, so they wouldn't change. I'd add loading and error states, and probably React Query for caching and retries.

**How would it scale to 500 services?**
Virtualize the table and the log list, so only visible rows render. Add search and grouping by team or region. Move aggregation to the server. Reduce the number of points per chart for long time ranges.

**What about accessibility?**
Status is never color alone, since every badge has text and an icon. Charts have a text summary and a data table. Sortable headers expose `aria-sort`. The selected service uses `aria-pressed`. I chose not to make the log count a live region, because it would announce every 3 seconds.

**How did you test it?**
Unit tests cover the pure logic: thresholds, determinism, immutability, alert deduplication and log filtering. Component tests use React Testing Library and query by role and accessible name, the way a user or screen reader would find things. That also checks the accessibility labels. CI runs lint, tests and the build on every push before deploying.

**What would you add next?**
Time-range selection, a per-alert detail view with related logs, SLO and error-budget tracking, and end-to-end tests with Playwright, including an automated accessibility scan with axe.

## Be ready to be honest about

- **The data is simulated.** There's no backend. Say this up front, since it's in the README anyway.
- **How you built it.** If you used AI help, be ready to say so and to explain every part yourself. Interviewers often ask you to change something live, for example "add a 'critical' filter to the alerts" or "make the window 60 minutes". Practice making one or two changes like that before the interview.
