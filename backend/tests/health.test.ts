import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('health', () => {
  it('returns health status', async () => {
    const res = await request(app).get('/api/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
    expect(res.body.service).toBe('payflow-backend');
  });
});
