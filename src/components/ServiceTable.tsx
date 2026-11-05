import {
  Button,
  Card,
  Subtitle1,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import { useMemo, useState } from 'react';
import { availabilityPct, compareHealth, latest, serviceHealth } from '../telemetry/health';
import { METRICS } from '../telemetry/format';
import type { Service } from '../telemetry/types';
import { HealthBadge } from './HealthBadge';

type SortKey = 'name' | 'health' | 'latencyMs' | 'errorRatePct' | 'requestsPerMin' | 'availability';
type Direction = 'ascending' | 'descending';

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: 'name', label: 'Service' },
  { key: 'health', label: 'Status' },
  { key: 'latencyMs', label: 'p95 latency', numeric: true },
  { key: 'errorRatePct', label: 'Error rate', numeric: true },
  { key: 'requestsPerMin', label: 'Throughput', numeric: true },
  { key: 'availability', label: 'Availability (30 min)', numeric: true },
];

function sortValue(service: Service, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return service.name;
    case 'health':
      return 0; // handled by compareHealth
    case 'availability':
      return availabilityPct(service);
    default:
      return latest(service)[key];
  }
}

const useStyles = makeStyles({
  card: { padding: tokens.spacingVerticalM, overflow: 'hidden' },
  scroll: { overflowX: 'auto' },
  table: { minWidth: '720px' },
  numeric: { textAlign: 'right', fontVariantNumeric: 'tabular-nums', '& .fui-TableHeaderCell__button': { justifyContent: 'flex-end' } },
  selected: { backgroundColor: tokens.colorBrandBackground2 },
  region: { display: 'block', color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  nameButton: {
    justifyContent: 'flex-start',
    textAlign: 'left',
    paddingLeft: 0,
    minWidth: 0,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
});

interface Props {
  services: Service[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ServiceTable({ services, selectedId, onSelect }: Props) {
  const styles = useStyles();
  const [sort, setSort] = useState<{ key: SortKey; direction: Direction }>({ key: 'health', direction: 'ascending' });

  const sorted = useMemo(() => {
    const factor = sort.direction === 'ascending' ? 1 : -1;
    return [...services].sort((a, b) => {
      if (sort.key === 'health') {
        return factor * compareHealth(serviceHealth(a), serviceHealth(b)) || a.name.localeCompare(b.name);
      }
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      return factor * (typeof av === 'string' ? av.localeCompare(bv as string) : av - (bv as number));
    });
  }, [services, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, direction: s.direction === 'ascending' ? 'descending' : 'ascending' }
        : { key, direction: 'ascending' },
    );

  return (
    <Card className={styles.card}>
      <Subtitle1 as="h2" id="services-heading">
        Service health
      </Subtitle1>
      <div className={styles.scroll}>
        <Table aria-labelledby="services-heading" className={styles.table} size="small">
          <TableHeader>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableHeaderCell
                  key={col.key}
                  sortable
                  sortDirection={sort.key === col.key ? sort.direction : undefined}
                  onClick={() => toggleSort(col.key)}
                  className={col.numeric ? styles.numeric : undefined}
                >
                  {col.label}
                </TableHeaderCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((service) => {
              const point = latest(service);
              const selected = service.id === selectedId;
              return (
                <TableRow key={service.id} className={mergeClasses(selected && styles.selected)}>
                  <TableCell>
                    <Button
                      appearance="transparent"
                      className={styles.nameButton}
                      aria-pressed={selected}
                      onClick={() => onSelect(service.id)}
                    >
                      {service.name}
                    </Button>
                    <span className={styles.region}>{service.region}</span>
                  </TableCell>
                  <TableCell>
                    <HealthBadge health={serviceHealth(service)} />
                  </TableCell>
                  <TableCell className={styles.numeric}>{METRICS.latencyMs.format(point.latencyMs)}</TableCell>
                  <TableCell className={styles.numeric}>{METRICS.errorRatePct.format(point.errorRatePct)}</TableCell>
                  <TableCell className={styles.numeric}>{METRICS.requestsPerMin.format(point.requestsPerMin)}</TableCell>
                  <TableCell className={styles.numeric}>{availabilityPct(service).toFixed(1)}%</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
