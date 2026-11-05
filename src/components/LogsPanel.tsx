import {
  Card,
  Checkbox,
  Input,
  Subtitle1,
  Text,
  ToggleButton,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import { Search20Regular } from '@fluentui/react-icons';
import { useMemo, useState } from 'react';
import { filterLogs, formatClockSeconds } from '../telemetry/format';
import type { LogEntry, LogLevel, Service } from '../telemetry/types';

const LEVELS: LogLevel[] = ['error', 'warning', 'info'];
const LEVEL_LABEL: Record<LogLevel, string> = { error: 'Error', warning: 'Warning', info: 'Info' };

const useStyles = makeStyles({
  card: {
    padding: tokens.spacingVerticalM,
    gap: tokens.spacingVerticalS,
    // In the two-column layout, fill the rest of the column so it lines up with the left side.
    '@media (min-width: 1101px)': { flexGrow: 1, minHeight: 0 },
  },
  controls: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS, alignItems: 'center' },
  search: { flexGrow: 1, minWidth: '180px' },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    maxHeight: '360px',
    overflowY: 'auto',
    '@media (min-width: 1101px)': { flexGrow: 1, flexBasis: 0, minHeight: '240px', maxHeight: 'none' },
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '64px 64px 1fr',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalXS}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    '@media (max-width: 480px)': { gridTemplateColumns: '64px 1fr', '& > :last-child': { gridColumn: '1 / -1' } },
  },
  time: { color: tokens.colorNeutralForeground3 },
  error: { color: tokens.colorPaletteRedForeground1, fontWeight: tokens.fontWeightSemibold },
  warning: { color: tokens.colorPaletteDarkOrangeForeground1, fontWeight: tokens.fontWeightSemibold },
  info: { color: tokens.colorNeutralForeground2 },
  service: { color: tokens.colorBrandForeground1 },
  count: { color: tokens.colorNeutralForeground3 },
});

interface Props {
  logs: LogEntry[];
  selected: Service;
}

export function LogsPanel({ logs, selected }: Props) {
  const styles = useStyles();
  const [query, setQuery] = useState('');
  const [levels, setLevels] = useState<Set<LogLevel>>(() => new Set(LEVELS));
  const [onlySelected, setOnlySelected] = useState(false);

  const visible = useMemo(
    () => filterLogs(logs, { query, levels, serviceId: onlySelected ? selected.id : null }),
    [logs, query, levels, onlySelected, selected.id],
  );

  const toggleLevel = (level: LogLevel) =>
    setLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });

  return (
    <Card className={styles.card}>
      <Subtitle1 as="h2" id="logs-heading">
        Logs
      </Subtitle1>
      <div className={styles.controls}>
        <Input
          className={styles.search}
          contentBefore={<Search20Regular />}
          placeholder="Search messages"
          aria-label="Search logs"
          value={query}
          onChange={(_, data) => setQuery(data.value)}
        />
        <div role="group" aria-label="Log levels" className={styles.controls}>
          {LEVELS.map((level) => (
            <ToggleButton key={level} size="small" checked={levels.has(level)} onClick={() => toggleLevel(level)}>
              {LEVEL_LABEL[level]}
            </ToggleButton>
          ))}
        </div>
        <Checkbox
          label={`Only ${selected.name}`}
          checked={onlySelected}
          onChange={(_, data) => setOnlySelected(Boolean(data.checked))}
        />
      </div>
      <Text className={styles.count}>
        Showing {Math.min(visible.length, 100)} of {visible.length} matching entries
      </Text>
      <ul className={styles.list} aria-labelledby="logs-heading" tabIndex={0}>
        {visible.slice(0, 100).map((log) => (
          <li key={log.id} className={styles.row}>
            <span className={styles.time}>{formatClockSeconds(log.t)}</span>
            <span className={mergeClasses(styles[log.level])}>{log.level.toUpperCase()}</span>
            <span>
              <span className={styles.service}>[{log.serviceId}]</span> {log.message}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
