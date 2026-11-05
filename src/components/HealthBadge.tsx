import { Badge } from '@fluentui/react-components';
import { CheckmarkCircle16Filled, DismissCircle16Filled, Warning16Filled } from '@fluentui/react-icons';
import type { Health } from '../telemetry/types';

const CONFIG = {
  healthy: { color: 'success', label: 'Healthy', icon: <CheckmarkCircle16Filled /> },
  degraded: { color: 'warning', label: 'Degraded', icon: <Warning16Filled /> },
  down: { color: 'danger', label: 'Down', icon: <DismissCircle16Filled /> },
} as const;

/** Status is shown with an icon and text, never color alone (WCAG 1.4.1). */
export function HealthBadge({ health }: { health: Health }) {
  const { color, label, icon } = CONFIG[health];
  return (
    <Badge appearance="tint" color={color} icon={icon}>
      {label}
    </Badge>
  );
}
