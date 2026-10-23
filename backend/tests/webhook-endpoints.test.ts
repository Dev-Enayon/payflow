import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import {
  FakePaystackGateway,
  authed,
  createUser,
  login,
  resetDatabase,
} from './helpers';

describe('merchant webhook endpoints and audit logs', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    await resetDatabase();
    app = createApp({ paystackGateway: new FakePaystackGateway() });
    await createUser('MERCHANT', { email: 'merchant@example.com' });
    await createUser('ADMIN', { email: 'admin@example.com' });
  });

  it('creates an endpoint, encrypts the signing secret and never returns it again', async () => {
    const merchant = await login(app, 'merchant@example.com');
    const api = authed(merchant.agent, merchant.csrfToken);

    const created = await api.post('/api/webhooks').send({
      url: 'http://localhost:5999/hook',
      description: 'Local test hook',
      events: ['payment.success', 'payment.failed'],
    });

    expect(created.status).toBe(201);
    const secret = created.body.data.signingSecret as string;
    expect(secret).toMatch(/^whsec_/);

    const stored = await prisma.webhookEndpoint.findFirst();
    expect(stored?.secretEncrypted).not.toBe(secret);
    expect(stored?.secretEncrypted).not.toContain(secret);
    expect(stored?.secretLastFour).toBe(secret.slice(-4));

    const listed = await api.get('/api/webhooks');
    expect(listed.status).toBe(200);
    expect(JSON.stringify(listed.body)).not.toContain(secret);
    expect(listed.body.data[0].events).toEqual(['payment.success', 'payment.failed']);

    const updated = await api.patch(`/api/webhooks/${stored?.id}`).send({ isActive: false });
    expect(updated.status).toBe(200);
    expect(updated.body.data.isActive).toBe(false);

    const deliveries = await api.get(`/api/webhooks/${stored?.id}/deliveries`);
    expect(deliveries.status).toBe(200);

    const removed = await api.delete(`/api/webhooks/${stored?.id}`);
    expect(removed.status).toBe(204);
    expect(await prisma.webhookEndpoint.count()).toBe(0);
  });

  it('records a failed test delivery and exposes it to admin logs', async () => {
    const merchant = await login(app, 'merchant@example.com');
    const api = authed(merchant.agent, merchant.csrfToken);
    const created = await api.post('/api/webhooks').send({
      url: 'http://localhost:5999/hook',
      events: ['payment.success'],
    });
    const endpointId = created.body.data.id as string;

    const tested = await api.post(`/api/webhooks/${endpointId}/test`);
    expect(tested.status).toBe(200);
    expect(tested.body.data.status).toBe('FAILED');
    expect(tested.body.data.error).toBeTruthy();

    const admin = await login(app, 'admin@example.com');
    const adminApi = authed(admin.agent, admin.csrfToken);

    const deliveries = await adminApi.get('/api/admin/webhook-deliveries?page=1&pageSize=10');
    expect(deliveries.status).toBe(200);
    expect(deliveries.body.data.length).toBe(1);

    const audit = await adminApi.get('/api/admin/audit-logs?page=1&pageSize=50');
    expect(audit.status).toBe(200);
    const actions = audit.body.data.map((entry: { action: string }) => entry.action);
    expect(actions).toContain('webhook.endpoint.created');
    expect(actions).toContain('webhook.endpoint.tested');
    expect(actions).toContain('auth.login.success');
  });

  it('blocks private-network webhook destinations (SSRF protection)', async () => {
    const merchant = await login(app, 'merchant@example.com');
    const api = authed(merchant.agent, merchant.csrfToken);

    const response = await api.post('/api/webhooks').send({
      url: 'http://169.254.169.254/latest/meta-data',
      events: ['payment.success'],
    });
    expect(response.status).toBe(422);
    expect(response.body.error.message).toContain('private');
  });

  it('requires authentication for webhook settings', async () => {
    const anonymous = await import('supertest').then((module) =>
      module.default(app).get('/api/webhooks'),
    );
    expect(anonymous.status).toBe(401);
  });
});
