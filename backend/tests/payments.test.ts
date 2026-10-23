import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { reconcileTransaction } from '../src/services/payment.service';
import {
  FakePaystackGateway,
  createTransaction,
  resetDatabase,
} from './helpers';

describe('payments', () => {
  let gateway: FakePaystackGateway;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    await resetDatabase();
    gateway = new FakePaystackGateway();
    app = createApp({ paystackGateway: gateway });
  });

  it('initializes a payment and creates a pending transaction', async () => {
    const response = await request(app).post('/api/payments/initialize').send({
      email: 'Customer@Example.com',
      amount: '1500.50',
    });

    expect(response.status).toBe(201);
    expect(response.body.data.reference).toMatch(/^PF-/);
    expect(response.body.data.amountKobo).toBe(150050);
    expect(response.body.data.amountNgn).toBe(1500.5);
    expect(response.body.data.authorizationUrl).toContain('checkout.paystack.test');

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { reference: response.body.data.reference },
    });
    expect(transaction).not.toBeNull();
    expect(transaction?.status).toBe('INITIALIZED');
    expect(transaction?.customerEmail).toBe('customer@example.com');
    expect(transaction?.amount).toBe(150050);
    expect(gateway.initializeCalls).toHaveLength(1);
    expect(gateway.initializeCalls[0].amountKobo).toBe(150050);
    expect(gateway.initializeCalls[0].callbackUrl).toBe('http://localhost:5173/payment/verify');
  });

  it('rejects invalid emails and amounts', async () => {
    const invalidEmail = await request(app)
      .post('/api/payments/initialize')
      .send({ email: 'not-an-email', amount: 1000 });
    expect(invalidEmail.status).toBe(422);

    const tooSmall = await request(app)
      .post('/api/payments/initialize')
      .send({ email: 'test@example.com', amount: 50 });
    expect(tooSmall.status).toBe(422);

    const badDecimal = await request(app)
      .post('/api/payments/initialize')
      .send({ email: 'test@example.com', amount: '100.999' });
    expect(badDecimal.status).toBe(422);

    const unsupportedCurrency = await request(app)
      .post('/api/payments/initialize')
      .send({ email: 'test@example.com', amount: 1000, currency: 'USD' });
    expect(unsupportedCurrency.status).toBe(422);

    expect(await prisma.paymentTransaction.count()).toBe(0);
  });

  it('generates unique transaction references', async () => {
    const first = await request(app)
      .post('/api/payments/initialize')
      .send({ email: 'one@example.com', amount: 1000 });
    const second = await request(app)
      .post('/api/payments/initialize')
      .send({ email: 'two@example.com', amount: 1000 });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.data.reference).not.toBe(second.body.data.reference);
    expect(await prisma.paymentTransaction.count()).toBe(2);
  });

  it('verifies a successful payment idempotently', async () => {
    const transaction = await createTransaction();
    gateway.verifyResult = {
      status: 'success',
      reference: transaction.reference,
      amountKobo: transaction.amount,
      currency: transaction.currency,
      providerTransactionId: '12345',
      channel: 'card',
      paidAt: new Date(),
      gatewayResponse: 'Successful',
    };

    const first = await request(app).get(`/api/payments/verify/${transaction.reference}`);
    expect(first.status).toBe(200);
    expect(first.body.data.status).toBe('SUCCESS');
    expect(first.body.data.customerEmail).toContain('*');

    const updated = await prisma.paymentTransaction.findUnique({
      where: { id: transaction.id },
    });
    expect(updated?.status).toBe('SUCCESS');
    expect(updated?.providerReference).toBe('12345');
    expect(updated?.paidAt).not.toBeNull();

    const second = await request(app).get(`/api/payments/verify/${transaction.reference}`);
    expect(second.status).toBe(200);
    expect(second.body.data.status).toBe('SUCCESS');
    expect(gateway.verifyCalls).toHaveLength(1);
  });

  it('applies concurrent success reconciliations only once', async () => {
    const transaction = await createTransaction();
    const providerResult = {
      status: 'success' as const,
      reference: transaction.reference,
      amountKobo: transaction.amount,
      currency: transaction.currency,
      providerTransactionId: 'concurrent-1',
      gatewayResponse: 'Successful',
    };

    const results = await Promise.all([
      reconcileTransaction(transaction, providerResult),
      reconcileTransaction(transaction, providerResult),
    ]);

    expect(results.filter((result) => result.changed)).toHaveLength(1);
    expect(results.every((result) => result.transaction.status === 'SUCCESS')).toBe(true);
    expect(await prisma.paymentTransaction.count({ where: { status: 'SUCCESS' } })).toBe(1);
  });

  it('marks failed and pending payments correctly', async () => {
    const failedTx = await createTransaction();
    gateway.verifyResult = {
      status: 'failed',
      reference: failedTx.reference,
      amountKobo: failedTx.amount,
      currency: failedTx.currency,
      gatewayResponse: 'Card declined',
    };
    const failed = await request(app).get(`/api/payments/verify/${failedTx.reference}`);
    expect(failed.status).toBe(200);
    expect(failed.body.data.status).toBe('FAILED');

    const pendingTx = await createTransaction();
    gateway.verifyResult = {
      status: 'pending',
      reference: pendingTx.reference,
      amountKobo: pendingTx.amount,
      currency: pendingTx.currency,
    };
    const pending = await request(app).get(`/api/payments/verify/${pendingTx.reference}`);
    expect(pending.status).toBe(200);
    expect(pending.body.data.status).toBe('PENDING');

    const stored = await prisma.paymentTransaction.findUnique({ where: { id: pendingTx.id } });
    expect(stored?.status).toBe('PENDING');
  });

  it('never marks a payment successful when the provider amount mismatches', async () => {
    const transaction = await createTransaction({ amount: 100000 });
    gateway.verifyResult = {
      status: 'success',
      reference: transaction.reference,
      amountKobo: 5000,
      currency: transaction.currency,
      gatewayResponse: 'Successful',
    };

    const response = await request(app).get(`/api/payments/verify/${transaction.reference}`);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('PAYMENT_MISMATCH');

    const stored = await prisma.paymentTransaction.findUnique({ where: { id: transaction.id } });
    expect(stored?.status).toBe('FAILED');
    expect(stored?.status).not.toBe('SUCCESS');
  });

  it('never marks a payment successful when currency mismatches', async () => {
    const transaction = await createTransaction({ currency: 'NGN' });
    gateway.verifyResult = {
      status: 'success',
      reference: transaction.reference,
      amountKobo: transaction.amount,
      currency: 'GHS',
    };

    const response = await request(app).get(`/api/payments/verify/${transaction.reference}`);
    expect(response.status).toBe(409);
    const stored = await prisma.paymentTransaction.findUnique({ where: { id: transaction.id } });
    expect(stored?.status).toBe('FAILED');
  });

  it('returns 404 for unknown transaction references', async () => {
    const response = await request(app).get('/api/payments/verify/PF-DOES-NOT-EXIST');
    expect(response.status).toBe(404);
  });

  it('does not expose internal metadata on the public transaction endpoint', async () => {
    const transaction = await createTransaction();
    const response = await request(app).get(`/api/payments/${transaction.reference}`);
    expect(response.status).toBe(200);
    expect(response.body.data).not.toHaveProperty('metadata');
    expect(response.body.data).not.toHaveProperty('providerReference');
    expect(response.body.data).not.toHaveProperty('id');
  });
});
