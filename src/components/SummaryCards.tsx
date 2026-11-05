import { Card, Text, makeStyles, tokens } from '@fluentui/react-components';
import { latest, serviceHealth } from '../telemetry/health';
import { formatCompact } from '../telemetry/format';
import type { TelemetryState } from '../telemetry/types';

const useStyles = makeStyles({
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: tokens.spacingHorizontalM,
  },
  card: { padding: tokens.spacingVerticalM, gap: tokens.spacingVerticalXS },
  label: { color: tokens.colorNeutralForeground3 },
  value: {
    fontSize: tokens.fontSizeHero700,
    lineHeight: tokens.lineHeightHero700,
    fontWeight: tokens.fontWeightSemibold,
    '@media (max-width: 480px)': { fontSize: tokens.fontSizeBase600, lineHeight: tokens.lineHeightBase600 },
  },
  bad: { color: tokens.colorPaletteRedForeground1 },
});

export function SummaryCards({ state }: { state: TelemetryState }) {
  const styles = useStyles();
  const { services, alerts } = state;
  const healthy = services.filter((s) => serviceHealth(s) === 'healthy').length;
  const points = services.map(latest);
  const avgLatency = points.reduce((sum, p) => sum + p.latencyMs, 0) / points.length;
  const totalRpm = points.reduce((sum, p) => sum + p.requestsPerMin, 0);
  const openAlerts = alerts.filter((a) => !a.acknowledged).length;

  const items = [
    { label: 'Healthy services', value: `${healthy} / ${services.length}`, bad: healthy < services.length },
    { label: 'Avg p95 latency', value: `${Math.round(avgLatency)} ms`, bad: false },
    { label: 'Total throughput', value: `${formatCompact(totalRpm)} req/min`, bad: false },
    { label: 'Open alerts', value: String(openAlerts), bad: openAlerts > 0 },
  ];

  return (
    <section aria-label="Summary" className={styles.grid}>
      {items.map((item) => (
        <Card key={item.label} className={styles.card}>
          <Text className={styles.label}>{item.label}</Text>
          <Text className={`${styles.value} ${item.bad ? styles.bad : ''}`}>{item.value}</Text>
        </Card>
      ))}
    </section>
  );
}
