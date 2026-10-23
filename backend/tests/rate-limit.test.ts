import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import {
  FakePaystackGateway,
  createUser,
  resetDatabase,
} from './helpers';

describe('rate limiting', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('limits repeated login attempts', async () => {
    await createUser('MERCHANT', { email: 'merchant@example.com' });
    const app = createApp({
      paystackGateway: new FakePaystackGateway(),
      rateLimitOverrides: {
        login: { enabled: true, limit: 2, windowMs: 60_000 },
      },
    });

    const first = await request(app)
      .post('/api/auth/login')
      .send({ email: 'merchant@example.com', password: 'wrong' });
    expect(first.status).toBe(401);

    const second = await request(app)
      .post('/api/auth/login')
      .send({ email: 'merchant@example.com', password: 'wrong' });
    expect(second.status).toBe(401);

    const third = await request(app)
      .post('/api/auth/login')
      .send({ email: 'merchant@example.com', password: 'wrong' });
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe('RATE_LIMITED');
  });

  it('limits payment initialization attempts', async () => {
    const app = createApp({
      paystackGateway: new FakePaystackGateway(),
      rateLimitOverrides: {
        initialize: { enabled: true, limit: 2, windowMs: 60_000 },
      },
    });

    for (let index = 0; index < 2; index += 1) {
      const response = await request(app)
        .post('/api/payments/initialize')
        .send({ email: 'rate@example.com', amount: 1000 });
      expect(response.status).toBe(201);
    }

    const limited = await request(app)
      .post('/api/payments/initialize')
      .send({ email: 'rate@example.com', amount: 1000 });
    expect(limited.status).toBe(429);
  });
});
