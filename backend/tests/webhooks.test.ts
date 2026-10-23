import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { env } from '../src/config/env';
import { hmacSha512Hex } from '../src/utils/crypto';
import { PaystackProviderError } from '../src/services/paystack.types';
import { FakePaystackGateway, createTransaction, resetDatabase } from './helpers';

function signedRequest(app: ReturnType<typeof createApp>, raw: string, signature: string) {
  return request(app)
    .post('/api/webhooks/paystack')
    .set('Content-Type', 'application/json')
    .set('x-paystack-signature', signature)
    .send(raw);
}

describe('paystack webhooks', () => {
  let gateway: FakePaystackGateway;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    await resetDatabase();
    gateway = new FakePaystackGateway();
    app = createApp({ paystackGateway: gateway });
  });

  it('rejects invalid signatures without recording an event', async () => {
    const raw = JSON.stringify({
      event: 'charge.success',
      data: { reference: 'PF-INVALID-SIGNATURE', amount: 100000, currency: 'NGN', status: 'success' },
    });

    const response = await signedRequest(app, raw, 'a'.repeat(128));
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_SIGNATURE');
    expect(await prisma.webhookEvent.count()).toBe(0);
  });

  it('verifies with Paystack before marking success, and deduplicates deliveries', async () => {
    const transaction = await createTransaction();
    gateway.verifyResult = {
      status: 'success',
      reference: transaction.reference,
      amountKobo: transaction.amount,
      currency: transaction.currency,
      providerTransactionId: '999',
      paidAt: new Date(),
      gatewayResponse: 'Successful',
    };

    const raw = JSON.stringify({
      event: 'charge.success',
      data: {
        id: 999,
        reference: transaction.reference,
        amount: transaction.amount,
        currency: transaction.currency,
        status: 'success',
      },
    });
    const signature = hmacSha512Hex(raw, env.PAYSTACK_SECRET_KEY);

    const first = await signedRequest(app, raw, signature);
    expect(first.status).toBe(200);
    expect(first.body.status).toBe('processed');

    const stored = await prisma.paymentTransaction.findUnique({ where: { id: transaction.id } });
    expect(stored?.status).toBe('SUCCESS');
    expect(gateway.verifyCalls.length).toBe(1);

    const duplicate = await signedRequest(app, raw, signature);
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.status).toBe('ignored');
    expect(await prisma.webhookEvent.count()).toBe(1);
    expect(gateway.verifyCalls.length).toBe(1);
  });

  it('does not mark success when Paystack verification reports a mismatch', async () => {
    const transaction = await createTransaction({ amount: 100000 });
    gateway.verifyResult = {
      status: 'success',
      reference: transaction.reference,
      amountKobo: 1000,
      currency: transaction.currency,
    };

    const raw = JSON.stringify({
      event: 'charge.success',
      data: { reference: transaction.reference, amount: 100000, currency: 'NGN', status: 'success' },
    });
    const signature = hmacSha512Hex(raw, env.PAYSTACK_SECRET_KEY);

    const response = await signedRequest(app, raw, signature);
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('failed');

    const stored = await prisma.paymentTransaction.findUnique({ where: { id: transaction.id } });
    expect(stored?.status).not.toBe('SUCCESS');
    expect(stored?.status).toBe('FAILED');

    const event = await prisma.webhookEvent.findFirst();
    expect(event?.status).toBe('FAILED');
  });

  it('retries transient provider failures idempotently on redelivery', async () => {
    const transaction = await createTransaction();
    gateway.verifyError = new PaystackProviderError('Provider timeout', { retryable: true });

    const raw = JSON.stringify({
      event: 'charge.success',
      data: {
        reference: transaction.reference,
        amount: transaction.amount,
        currency: transaction.currency,
        status: 'success',
      },
    });
    const signature = hmacSha512Hex(raw, env.PAYSTACK_SECRET_KEY);

    const first = await signedRequest(app, raw, signature);
    expect(first.status).toBe(503);
    expect(await prisma.webhookEvent.count()).toBe(1);
    expect((await prisma.webhookEvent.findFirst())?.status).toBe('FAILED');

    gateway.verifyError = null;
    gateway.verifyResult = {
      status: 'success',
      reference: transaction.reference,
      amountKobo: transaction.amount,
      currency: transaction.currency,
      paidAt: new Date(),
    };

    const retry = await signedRequest(app, raw, signature);
    expect(retry.status).toBe(200);
    expect(retry.body.status).toBe('processed');

    const event = await prisma.webhookEvent.findFirst();
    expect(event?.status).toBe('PROCESSED');
    expect(event?.attempts).toBe(2);

    const stored = await prisma.paymentTransaction.findUnique({ where: { id: transaction.id } });
    expect(stored?.status).toBe('SUCCESS');
  });

  it('ignores unsupported events and unknown references safely', async () => {
    const unsupportedRaw = JSON.stringify({
      event: 'transfer.success',
      data: { reference: 'PF-UNKNOWN', amount: 1000, currency: 'NGN' },
    });
    const unsupported = await signedRequest(
      app,
      unsupportedRaw,
      hmacSha512Hex(unsupportedRaw, env.PAYSTACK_SECRET_KEY),
    );
    expect(unsupported.status).toBe(200);
    expect(unsupported.body.status).toBe('ignored');

    const transaction = await createTransaction();
    const unknownRaw = JSON.stringify({
      event: 'charge.success',
      data: { reference: 'PF-NOT-IN-DB', amount: transaction.amount, currency: 'NGN' },
    });
    const unknown = await signedRequest(
      app,
      unknownRaw,
      hmacSha512Hex(unknownRaw, env.PAYSTACK_SECRET_KEY),
    );
    expect(unknown.status).toBe(200);
    expect(unknown.body.status).toBe('ignored');
  });

  it('handles a signed refund event as a reversal', async () => {
    const transaction = await createTransaction({ status: 'SUCCESS' });
    gateway.verifyResult = {
      status: 'success',
      reference: transaction.reference,
      amountKobo: transaction.amount,
      currency: transaction.currency,
    };

    const raw = JSON.stringify({
      event: 'refund.processed',
      data: {
        reference: transaction.reference,
        amount: transaction.amount,
        currency: transaction.currency,
        status: 'success',
      },
    });
    const response = await signedRequest(
      app,
      raw,
      hmacSha512Hex(raw, env.PAYSTACK_SECRET_KEY),
    );
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('processed');

    const stored = await prisma.paymentTransaction.findUnique({ where: { id: transaction.id } });
    expect(stored?.status).toBe('REVERSED');
  });
});
