import test from 'node:test';
import assert from 'node:assert/strict';
import { HealthService } from '../services/health-service.js';

test('health service returns uptime and lifecycle timestamps', () => {
  const service = new HealthService();
  const now = new Date(Date.now() + 25);
  const status = service.status(now);

  assert.equal(status.status, 'ok');
  assert.ok(typeof status.startedAt === 'string');
  assert.ok(typeof status.timestamp === 'string');
  assert.ok(status.uptimeMs >= 0);
});
