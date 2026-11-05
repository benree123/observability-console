import {
  Card,
  Subtitle1,
  Tab,
  TabList,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { useState } from 'react';
import { THRESHOLDS, serviceHealth } from '../telemetry/health';
import { METRICS, formatClock } from '../telemetry/format';
import type { MetricKey, Service } from '../telemetry/types';
import { HealthBadge } from './HealthBadge';
import { LineChart } from './LineChart';

const useStyles = makeStyles({
  card: { padding: tokens.spacingVerticalM, gap: tokens.spacingVerticalS },
  header: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  meta: { color: tokens.colorNeutralForeground3 },
  details: { marginTop: tokens.spacingVerticalS },
  summary: { cursor: 'pointer', color: tokens.colorBrandForeground1, padding: `${tokens.spacingVerticalXS} 0` },
  numeric: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
});

const KEYS = Object.keys(METRICS) as MetricKey[];

export function MetricsPanel({ service }: { service: Service }) {
  const styles = useStyles();
  const [metric, setMetric] = useState<MetricKey>('latencyMs');
  const def = METRICS[metric];
  const points = service.series.map((p) => ({ t: p.t, v: p[metric] }));
  const threshold =
    metric === 'requestsPerMin'
      ? undefined
      : { value: THRESHOLDS[metric].degraded, label: `Degraded at ${def.format(THRESHOLDS[metric].degraded)}` };

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <Subtitle1 as="h2">{service.name}</Subtitle1>
        <HealthBadge health={serviceHealth(service)} />
      </div>
      <Text className={styles.meta}>
        {service.region} · Owned by {service.owner}
      </Text>
      <TabList
        selectedValue={metric}
        onTabSelect={(_, data) => setMetric(data.value as MetricKey)}
        aria-label="Metric"
      >
        {KEYS.map((key) => (
          <Tab key={key} value={key}>
            {METRICS[key].label}
          </Tab>
        ))}
      </TabList>
      <LineChart points={points} title={`${service.name} ${def.label}`} format={def.format} threshold={threshold} />
      <details className={styles.details}>
        <summary className={styles.summary}>Show last 10 minutes as a table</summary>
        <Table size="extra-small" aria-label={`${service.name} ${def.label}, last 10 minutes`}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Time</TableHeaderCell>
              <TableHeaderCell className={styles.numeric}>{def.label}</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {points.slice(-10).reverse().map((p) => (
              <TableRow key={p.t}>
                <TableCell>{formatClock(p.t)}</TableCell>
                <TableCell className={styles.numeric}>{def.format(p.v)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </details>
    </Card>
  );
}
