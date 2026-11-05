import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Dashboard } from './App';

const NOW = Date.UTC(2026, 10, 5, 17, 30);

function renderDashboard() {
  return render(
    <FluentProvider theme={webLightTheme}>
      <Dashboard seed={42} now={NOW} live={false} />
    </FluentProvider>,
  );
}

function openAlertCount() {
  const summary = screen.getByRole('region', { name: 'Summary' });
  return Number(within(summary).getByText('Open alerts').nextSibling?.textContent);
}

describe('Dashboard', () => {
  it('shows the summary, service table, chart, alerts and logs', () => {
    renderDashboard();
    expect(screen.getByRole('region', { name: 'Summary' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Service health' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Alerts' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Logs' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Telemetry Ingest p95 latency/ })).toBeInTheDocument();
  });

  it('opens on the worst service and sorts it first', () => {
    renderDashboard();
    const rows = within(screen.getByRole('table', { name: 'Service health' })).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Telemetry Ingest');
    expect(rows[1]).toHaveTextContent('Down');
    expect(screen.getByRole('button', { name: 'Telemetry Ingest', pressed: true })).toBeInTheDocument();
  });

  it('switches the detail panel when another service is selected', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await user.click(screen.getByRole('button', { name: 'Payments API' }));
    expect(screen.getByRole('heading', { name: 'Payments API' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Payments API p95 latency/ })).toBeInTheDocument();
  });

  it('switches the chart metric with the tabs', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await user.click(screen.getByRole('tab', { name: 'Error rate' }));
    expect(screen.getByRole('img', { name: /Telemetry Ingest Error rate/ })).toBeInTheDocument();
  });

  it('sorts the table when a column header is clicked', async () => {
    const user = userEvent.setup();
    renderDashboard();
    const table = screen.getByRole('table', { name: 'Service health' });
    await user.click(within(table).getByText('Service'));
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('API Gateway');
    expect(within(table).getByRole('columnheader', { name: /^Service/ })).toHaveAttribute('aria-sort', 'ascending');
  });

  it('acknowledging an alert lowers the open alert count', async () => {
    const user = userEvent.setup();
    renderDashboard();
    const before = openAlertCount();
    expect(before).toBeGreaterThan(0);
    await user.click(screen.getAllByRole('button', { name: /^Acknowledge/ })[0]);
    expect(openAlertCount()).toBe(before - 1);
  });

  it('filters logs by level and by the selected service', async () => {
    const user = userEvent.setup();
    renderDashboard();
    const logList = screen.getByRole('list', { name: 'Logs' });
    await user.click(screen.getByRole('button', { name: 'Info' }));
    await user.click(screen.getByRole('button', { name: 'Warning' }));
    for (const item of within(logList).queryAllByRole('listitem')) {
      expect(item).toHaveTextContent('ERROR');
    }
    await user.click(screen.getByRole('button', { name: 'Info' }));
    await user.click(screen.getByRole('checkbox', { name: 'Only Telemetry Ingest' }));
    const items = within(logList).getAllByRole('listitem');
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item).toHaveTextContent('[ingest]');
    }
  });

  it('advances simulated time one minute at a time while paused', async () => {
    const user = userEvent.setup();
    renderDashboard();
    const clock = screen.getByText(/simulated time/);
    const before = clock.textContent;
    await user.click(screen.getByRole('button', { name: 'Step 1 minute' }));
    expect(clock.textContent).not.toBe(before);
  });
});
