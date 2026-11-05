import { makeStyles, tokens } from '@fluentui/react-components';
import { useId } from 'react';
import { formatClock } from '../telemetry/format';

export interface ChartPoint {
  t: number;
  v: number;
}

interface Props {
  points: ChartPoint[];
  title: string;
  format: (v: number) => string;
  threshold?: { value: number; label: string };
}

const W = 640;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 56 };

const useStyles = makeStyles({
  svg: { width: '100%', height: 'auto', display: 'block' },
  grid: { stroke: tokens.colorNeutralStroke2, strokeWidth: 1 },
  axisText: { fill: tokens.colorNeutralForeground3, fontSize: '11px' },
  line: { fill: 'none', stroke: tokens.colorBrandForeground1, strokeWidth: 2.5, strokeLinejoin: 'round' },
  area: { fill: tokens.colorBrandForeground1, opacity: 0.12 },
  dot: { fill: tokens.colorBrandForeground1, stroke: tokens.colorNeutralBackground1, strokeWidth: 2 },
  threshold: { stroke: tokens.colorPaletteRedBorderActive, strokeWidth: 1.5, strokeDasharray: '6 4' },
  thresholdText: { fill: tokens.colorPaletteRedForeground1, fontSize: '11px' },
});

/**
 * Dependency-free SVG line chart. Screen readers get a text summary through
 * role="img" and <desc>; the full values are in the data table next to it.
 */
export function LineChart({ points, title, format, threshold }: Props) {
  const styles = useStyles();
  const id = useId();
  const values = points.map((p) => p.v);
  const max = Math.max(...values, threshold?.value ?? 0) * 1.15 || 1;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / Math.max(1, points.length - 1)) * innerW;
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${PAD.top + innerH} L${x(0)},${PAD.top + innerH} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const xLabels = [0, Math.floor((points.length - 1) / 2), points.length - 1];
  const last = points[points.length - 1];

  const summary =
    `${title}. Latest ${format(last.v)}, minimum ${format(Math.min(...values))}, ` +
    `maximum ${format(Math.max(...values))} over the last ${points.length} minutes.` +
    (threshold ? ` Alert threshold ${format(threshold.value)}.` : '');

  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
    >
      <title id={`${id}-title`}>{title}</title>
      <desc id={`${id}-desc`}>{summary}</desc>
      {ticks.map((v) => (
        <g key={v}>
          <line className={styles.grid} x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} />
          <text className={styles.axisText} x={PAD.left - 8} y={y(v) + 4} textAnchor="end">
            {format(v)}
          </text>
        </g>
      ))}
      {xLabels.map((i) => (
        <text
          key={i}
          className={styles.axisText}
          x={x(i)}
          y={H - 8}
          textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
        >
          {formatClock(points[i].t)}
        </text>
      ))}
      {threshold && (
        <g>
          <line className={styles.threshold} x1={PAD.left} x2={W - PAD.right} y1={y(threshold.value)} y2={y(threshold.value)} />
          <text className={styles.thresholdText} x={W - PAD.right} y={y(threshold.value) - 6} textAnchor="end">
            {threshold.label}
          </text>
        </g>
      )}
      <path className={styles.area} d={area} />
      <path className={styles.line} d={line} />
      <circle className={styles.dot} cx={x(points.length - 1)} cy={y(last.v)} r={4.5} />
    </svg>
  );
}
