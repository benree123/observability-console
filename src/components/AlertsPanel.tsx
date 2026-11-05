import { Badge, Button, Card, Subtitle1, Text, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { Checkmark16Regular } from '@fluentui/react-icons';
import { formatClock } from '../telemetry/format';
import type { Alert } from '../telemetry/types';

const useStyles = makeStyles({
  card: { padding: tokens.spacingVerticalM, gap: tokens.spacingVerticalS },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS, maxHeight: '320px', overflowY: 'auto' },
  item: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center',
    padding: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderLeftWidth: '4px',
  },
  critical: { borderLeftColor: tokens.colorPaletteRedBorderActive },
  warning: { borderLeftColor: tokens.colorPaletteDarkOrangeBorderActive },
  acked: { opacity: 0.65 },
  title: { display: 'block', fontWeight: tokens.fontWeightSemibold },
  meta: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  empty: { color: tokens.colorNeutralForeground3 },
});

interface Props {
  alerts: Alert[];
  onAcknowledge: (id: string) => void;
}

export function AlertsPanel({ alerts, onAcknowledge }: Props) {
  const styles = useStyles();
  const open = alerts.filter((a) => !a.acknowledged).length;
  // Open alerts first, newest first within each group.
  const ordered = [...alerts].sort((a, b) => Number(a.acknowledged) - Number(b.acknowledged) || b.t - a.t).slice(0, 12);

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <Subtitle1 as="h2" id="alerts-heading">
          Alerts
        </Subtitle1>
        <Badge appearance="filled" color={open > 0 ? 'danger' : 'informative'} aria-label={`${open} open alerts`}>
          {open}
        </Badge>
      </div>
      {ordered.length === 0 ? (
        <Text className={styles.empty}>No alerts. All services are within thresholds.</Text>
      ) : (
        <ul className={styles.list} aria-labelledby="alerts-heading">
          {ordered.map((alert) => (
            <li
              key={alert.id}
              className={mergeClasses(styles.item, styles[alert.severity], alert.acknowledged && styles.acked)}
            >
              <div>
                <Text className={styles.title}>{alert.title}</Text>
                <Text className={styles.meta}>
                  {alert.severity === 'critical' ? 'Critical' : 'Warning'} · {formatClock(alert.t)}
                  {alert.acknowledged ? ' · Acknowledged' : ''}
                </Text>
              </div>
              {!alert.acknowledged && (
                <Button
                  size="small"
                  icon={<Checkmark16Regular />}
                  onClick={() => onAcknowledge(alert.id)}
                  aria-label={`Acknowledge ${alert.title}`}
                >
                  Ack
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
