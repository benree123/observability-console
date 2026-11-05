import {
  Button,
  FluentProvider,
  Switch,
  Text,
  Title2,
  makeStyles,
  tokens,
  webDarkTheme,
  webLightTheme,
} from '@fluentui/react-components';
import { Next20Regular, Pause20Regular, Play20Regular } from '@fluentui/react-icons';
import { useState } from 'react';
import { AlertsPanel } from './components/AlertsPanel';
import { LogsPanel } from './components/LogsPanel';
import { MetricsPanel } from './components/MetricsPanel';
import { ServiceTable } from './components/ServiceTable';
import { SummaryCards } from './components/SummaryCards';
import { formatClock } from './telemetry/format';
import { compareHealth, serviceHealth } from './telemetry/health';
import { type TelemetryOptions, useTelemetry } from './telemetry/useTelemetry';

const useStyles = makeStyles({
  root: { minHeight: '100vh', backgroundColor: tokens.colorNeutralBackground2 },
  header: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalXL}`,
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    '@media (max-width: 600px)': { padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}` },
  },
  subtitle: { color: tokens.colorNeutralForeground3, display: 'block' },
  controls: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacingHorizontalS },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
  },
  hint: { color: tokens.colorNeutralForeground3 },
  main: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingHorizontalXL,
    maxWidth: '1440px',
    margin: '0 auto',
    '@media (max-width: 600px)': { padding: tokens.spacingHorizontalL },
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
    gap: tokens.spacingVerticalL,
    '@media (max-width: 1100px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
  },
  column: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  footer: { color: tokens.colorNeutralForeground3, textAlign: 'center', paddingBottom: tokens.spacingVerticalXL },
});

function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

export function Dashboard(options: TelemetryOptions) {
  const styles = useStyles();
  const { state, live, setLive, acknowledge, step } = useTelemetry(options);
  // Start on the worst service, the one an on-call engineer would open first.
  const [selectedId, setSelectedId] = useState(
    () => [...state.services].sort((a, b) => compareHealth(serviceHealth(a), serviceHealth(b)))[0].id,
  );
  const selected = state.services.find((s) => s.id === selectedId) ?? state.services[0];

  return (
    <main className={styles.main}>
      <div className={styles.toolbar}>
        <Text>
          {live ? 'Live' : 'Paused'} · simulated time {formatClock(state.now)}
          <span className={styles.hint}> · 1 simulated minute every 3 seconds</span>
        </Text>
        <div className={styles.controls}>
          <Button
            icon={live ? <Pause20Regular /> : <Play20Regular />}
            onClick={() => setLive(!live)}
          >
            {live ? 'Pause live data' : 'Resume live data'}
          </Button>
          <Button icon={<Next20Regular />} onClick={step} disabled={live}>
            Step 1 minute
          </Button>
        </div>
      </div>
      <SummaryCards state={state} />
      <div className={styles.grid}>
        <div className={styles.column}>
          <ServiceTable services={state.services} selectedId={selected.id} onSelect={setSelectedId} />
          <MetricsPanel service={selected} />
        </div>
        <div className={styles.column}>
          <AlertsPanel alerts={state.alerts} onAcknowledge={acknowledge} />
          <LogsPanel logs={state.logs} selected={selected} />
        </div>
      </div>
      <Text as="p" size={200} className={styles.footer}>
        All services, metrics and logs are fictional and generated in the browser.
      </Text>
    </main>
  );
}

export default function App() {
  const styles = useStyles();
  const [dark, setDark] = useState(prefersDark);

  return (
    <FluentProvider
      theme={dark ? webDarkTheme : webLightTheme}
      className={styles.root}
      data-theme={dark ? 'dark' : 'light'}
    >
      <header className={styles.header}>
        <div>
          <Title2 as="h1">Observability Console</Title2>
          <Text className={styles.subtitle}>Service health, metrics, logs and alerts across 6 fictional services</Text>
        </div>
        <Switch label="Dark theme" checked={dark} onChange={(_, data) => setDark(data.checked)} />
      </header>
      <Dashboard />
    </FluentProvider>
  );
}
