import { WebhookDeliveryStatus, type PaymentTransaction, type WebhookEndpoint } from '@prisma/client';
import { prisma } from '../config/prisma';
import { decryptSecret, hmacSha256Hex, randomHex } from '../utils/crypto';
import { logger } from '../utils/logger';
import { assertSafeWebhookUrl } from '../utils/url';

export const OUTBOUND_EVENTS = ['payment.success', 'payment.failed', 'payment.reversed'] as const;
export type OutboundEvent = (typeof OUTBOUND_EVENTS)[number];

function eventForStatus(status: PaymentTransaction['status']): OutboundEvent | null {
  switch (status) {
    case 'SUCCESS':
      return 'payment.success';
    case 'FAILED':
    case 'ABANDONED':
      return 'payment.failed';
    case 'REVERSED':
      return 'payment.reversed';
    default:
      return null;
  }
}

function buildPayload(event: OutboundEvent, transaction: PaymentTransaction) {
  return {
    id: `evt_${randomHex(12)}`,
    event,
    createdAt: new Date().toISOString(),
    data: {
      reference: transaction.reference,
      providerReference: transaction.providerReference,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      customerEmail: transaction.customerEmail,
      channel: transaction.channel,
      paidAt: transaction.paidAt?.toISOString() ?? null,
      createdAt: transaction.createdAt.toISOString(),
    },
  };
}

async function deliver(
  endpoint: WebhookEndpoint,
  event: OutboundEvent,
  payload: ReturnType<typeof buildPayload>,
  webhookEventId?: string,
) {
  const body = JSON.stringify(payload);
  let signature: string;
  try {
    signature = `sha256=${hmacSha256Hex(body, decryptSecret(endpoint.secretEncrypted))}`;
  } catch (error) {
    logger.error('webhook_secret_decrypt_failed', {
      endpointId: endpoint.id,
      error: error instanceof Error ? error.message : 'unknown error',
    });
    return;
  }

  const delivery = await prisma.webhookDelivery.create({
    data: {
      endpointId: endpoint.id,
      eventId: webhookEventId,
      eventType: event,
      reference: payload.data.reference,
      payload,
      signature,
      status: WebhookDeliveryStatus.PENDING,
    },
  });

  const startedAt = Date.now();
  try {
    await assertSafeWebhookUrl(endpoint.url);
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PayFlow-Webhooks/1.0',
        'X-Payflow-Event': event,
        'X-Payflow-Delivery': delivery.id,
        'X-Payflow-Signature': signature,
      },
      body,
      redirect: 'error',
      signal: AbortSignal.timeout(8_000),
    });

    const responseBody = (await response.text().catch(() => '')).slice(0, 1000);
    const success = response.status >= 200 && response.status < 300;

    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: success ? WebhookDeliveryStatus.SUCCESS : WebhookDeliveryStatus.FAILED,
        responseStatus: response.status,
        responseBody,
        error: success ? null : `Endpoint responded with HTTP ${response.status}`,
        durationMs: Date.now() - startedAt,
        deliveredAt: success ? new Date() : null,
      },
    });

    await prisma.webhookEndpoint.update({
      where: { id: endpoint.id },
      data: {
        lastDeliveryAt: new Date(),
        lastDeliveryStatus: success ? WebhookDeliveryStatus.SUCCESS : WebhookDeliveryStatus.FAILED,
        failureCount: success ? 0 : { increment: 1 },
      },
    });
  } catch (error) {
    await prisma.webhookDelivery
      .update({
        where: { id: delivery.id },
        data: {
          status: WebhookDeliveryStatus.FAILED,
          error: (error instanceof Error ? error.message : 'Delivery failed').slice(0, 500),
          durationMs: Date.now() - startedAt,
        },
      })
      .catch(() => undefined);
    await prisma.webhookEndpoint
      .update({
        where: { id: endpoint.id },
        data: {
          lastDeliveryAt: new Date(),
          lastDeliveryStatus: WebhookDeliveryStatus.FAILED,
          failureCount: { increment: 1 },
        },
      })
      .catch(() => undefined);
    logger.warn('webhook_delivery_failed', {
      endpointId: endpoint.id,
      event,
      error: error instanceof Error ? error.message : 'unknown error',
    });
  }
}

/** Fire-and-forget outbound delivery. Failures are persisted, never thrown. */
export function dispatchTransactionEvent(
  transaction: PaymentTransaction,
  webhookEventId?: string,
): void {
  const event = eventForStatus(transaction.status);
  if (!event) return;

  void (async () => {
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { isActive: true, events: { has: event } },
    });
    if (endpoints.length === 0) return;

    const payload = buildPayload(event, transaction);
    await Promise.all(endpoints.map((endpoint) => deliver(endpoint, event, payload, webhookEventId)));
  })().catch((error) => {
    logger.error('webhook_dispatch_failed', {
      reference: transaction.reference,
      error: error instanceof Error ? error.message : 'unknown error',
    });
  });
}

export async function sendTestDelivery(endpoint: WebhookEndpoint) {
  const sampleTransaction = {
    id: 'sample',
    reference: `PF-SAMPLE-${randomHex(4).toUpperCase()}`,
    amount: 250000,
    currency: 'NGN',
    customerEmail: 'customer@example.com',
    customerName: null,
    status: 'SUCCESS',
    provider: 'paystack',
    providerReference: null,
    channel: 'card',
    gatewayResponse: 'Sample delivery',
    failureReason: null,
    metadata: null,
    initializedAt: new Date(),
    verifiedAt: new Date(),
    paidAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as PaymentTransaction;

  const event: OutboundEvent = 'payment.success';
  const payload = buildPayload(event, sampleTransaction);
  await deliver(endpoint, event, payload);
}
