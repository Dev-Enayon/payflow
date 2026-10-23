import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import {
  FakePaystackGateway,
  TEST_PASSWORD,
  authed,
  createUser,
  login,
  resetDatabase,
} from './helpers';

describe('authentication, authorization and API keys', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    await resetDatabase();
    app = createApp({ paystackGateway: new FakePaystackGateway() });
  });

  it('rejects unauthenticated dashboard, admin and key routes', async () => {
    expect((await request(app).get('/api/dashboard/overview')).status).toBe(401);
    expect((await request(app).get('/api/admin/overview')).status).toBe(401);
    expect((await request(app).get('/api/keys')).status).toBe(401);
  });

  it('rejects invalid credentials and protects login with generic errors', async () => {
    await createUser('MERCHANT', { email: 'merchant@example.com' });
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'merchant@example.com', password: 'wrong-password' });
    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Invalid email or password');
  });

  it('allows admins into admin routes but blocks merchants (server-side RBAC)', async () => {
    await createUser('ADMIN', { email: 'admin@example.com' });
    await createUser('MERCHANT', { email: 'merchant@example.com' });

    const admin = await login(app, 'admin@example.com');
    const merchant = await login(app, 'merchant@example.com');

    expect((await authed(admin.agent, admin.csrfToken).get('/api/admin/overview')).status).toBe(200);
    expect((await authed(merchant.agent, merchant.csrfToken).get('/api/admin/overview')).status).toBe(403);
    expect((await authed(merchant.agent, merchant.csrfToken).get('/api/dashboard/overview')).status).toBe(200);
  });

  it('requires a CSRF token for cookie-authenticated writes', async () => {
    await createUser('MERCHANT', { email: 'merchant@example.com' });
    const merchant = await login(app, 'merchant@example.com');

    const missingCsrf = await merchant.agent
      .post('/api/keys')
      .set('Origin', 'http://localhost:5173')
      .send({ name: 'No csrf' });
    expect(missingCsrf.status).toBe(403);
    expect(missingCsrf.body.error.code).toBe('CSRF_FAILED');

    const created = await authed(merchant.agent, merchant.csrfToken)
      .post('/api/keys')
      .send({ name: 'With csrf' });
    expect(created.status).toBe(201);
  });

  it('stores only a hash of API keys and shows the secret once', async () => {
    await createUser('MERCHANT', { email: 'merchant@example.com' });
    const merchant = await login(app, 'merchant@example.com');

    const created = await authed(merchant.agent, merchant.csrfToken)
      .post('/api/keys')
      .send({ name: 'Server key', environment: 'TEST' });
    expect(created.status).toBe(201);

    const secret = created.body.data.key as string;
    expect(secret).toMatch(/^pf_test_/);
    expect(created.body.data.keyHash).toBeUndefined();

    const stored = await prisma.apiCredential.findFirst();
    expect(stored).not.toBeNull();
    expect(stored?.keyHash).not.toBe(secret);
    expect(stored?.keyHash).toHaveLength(64);

    const listed = await authed(merchant.agent, merchant.csrfToken).get('/api/keys');
    expect(listed.status).toBe(200);
    expect(JSON.stringify(listed.body)).not.toContain(secret);

    // API keys are server-to-server credentials, not dashboard sessions.
    const keysWithApiKey = await request(app)
      .get('/api/keys')
      .set('Authorization', `Bearer ${secret}`);
    expect(keysWithApiKey.status).toBe(403);
  });

  it('authenticates API keys for payments and invalidates revoked keys', async () => {
    await createUser('MERCHANT', { email: 'merchant@example.com' });
    const merchant = await login(app, 'merchant@example.com');
    const created = await authed(merchant.agent, merchant.csrfToken)
      .post('/api/keys')
      .send({ name: 'Integration key', environment: 'TEST' });
    const secret = created.body.data.key as string;
    const keyId = created.body.data.id as string;

    const api = request(app);
    const unauthorized = await api
      .post('/api/payments/initialize')
      .set('Authorization', 'Bearer pf_test_totally_invalid')
      .send({ email: 'customer@example.com', amount: 1000 });
    expect(unauthorized.status).toBe(401);

    const initialized = await api
      .post('/api/payments/initialize')
      .set('Authorization', `Bearer ${secret}`)
      .send({ email: 'customer@example.com', amount: 1000 });
    expect(initialized.status).toBe(201);

    const revoke = await authed(merchant.agent, merchant.csrfToken).delete(`/api/keys/${keyId}`);
    expect(revoke.status).toBe(204);

    const afterRevoke = await request(app)
      .post('/api/payments/initialize')
      .set('Authorization', `Bearer ${secret}`)
      .send({ email: 'customer@example.com', amount: 1000 });
    expect(afterRevoke.status).toBe(401);
  });

  it('supports profile updates, password changes, session listing and revocation', async () => {
    await createUser('MERCHANT', { email: 'merchant@example.com' });
    const merchant = await login(app, 'merchant@example.com');

    const profile = await authed(merchant.agent, merchant.csrfToken)
      .patch('/api/auth/profile')
      .send({ name: 'Updated Merchant' });
    expect(profile.status).toBe(200);
    expect(profile.body.data.user.name).toBe('Updated Merchant');

    const sessions = await authed(merchant.agent, merchant.csrfToken).get('/api/auth/sessions');
    expect(sessions.status).toBe(200);
    expect(sessions.body.data.length).toBeGreaterThan(0);
    expect(sessions.body.data[0].isCurrent).toBe(true);
    expect(JSON.stringify(sessions.body)).not.toContain('tokenHash');

    const changed = await authed(merchant.agent, merchant.csrfToken)
      .post('/api/auth/change-password')
      .send({ currentPassword: TEST_PASSWORD, newPassword: 'NewSecurePass123' });
    expect(changed.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'merchant@example.com', password: TEST_PASSWORD });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'merchant@example.com', password: 'NewSecurePass123' });
    expect(newLogin.status).toBe(200);
  });

  it('logs out and invalidates the session cookie', async () => {
    await createUser('MERCHANT', { email: 'merchant@example.com' });
    const merchant = await login(app, 'merchant@example.com');

    const logout = await authed(merchant.agent, merchant.csrfToken).post('/api/auth/logout');
    expect(logout.status).toBe(204);

    const me = await merchant.agent.get('/api/auth/me');
    expect(me.status).toBe(401);
  });
});
