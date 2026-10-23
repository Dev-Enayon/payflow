import { Prisma, WebhookEventStatus, type PaymentTransaction } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { sha256, verifyPaystackSignature } from '../utils/crypto';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/errors';
import type { PaystackGateway } from './paystack.types';
import { PaystackProviderError } from './paystack.types';
import { reconcileTransaction } from './payment.service';
import { dispatchTransactionEvent } from './outboundWebhook.service';

export type WebhookHandlingResult = {
  status: 'processed' | 'ignored' | 'failed' | 'retry';
  reason?: string;
};

type PaystackWebhookPayload = {
  event?: string;
  data?: {
    id?: number;
    reference?: string;
    status?: string;
    amount?: number;
    currency?: string;
  };
};

const SUPPORTED_EVENTS = new Set(['charge.success', 'charge.failed', 'refund.processed', 'charge.reversed']);
const REVERSAL_EVENTS = new Set(['refund.processed', 'charge.reversed']);

async function markEvent(
  id: string,
  status: WebhookEventStatus,
  data: { error?: string | null; processedAt?: Date | null; incrementAttempts?: boolean } = {},
) {
  await prisma.webhookEvent
    .update({
      where: { id },
      data: {
        status,
        error: data.error ?? null,
        processedAt: data.processedAt ?? null,
        ...(data.incrementAttempts ? { attempts: { increment: 1 } } : {}),
      },
    })
    .catch(() => undefined);
}

export class WebhookService {
  constructor(private readonly paystack: PaystackGateway) {}

  async handlePaystack(
    rawBody: Buffer,
    signature: string | undefined,
    payload: PaystackWebhookPayload,
  ): Promise<WebhookHandlingResult> {
    if (env.PAYSTACK_MOCK) {
      logger.warn('webhook_received_in_mock_mode', { event: payload.event });
    } else {
      if (!verifyPaystackSignature(rawBody, signature, env.PAYSTACK_SECRET_KEY)) {
        logger.warn('webhook_signature_invalid', { event: payload.event });
        throw new ApiError(401, 'INVALID_SIGNATURE', 'Invalid Paystack webhook signature');
      }
    }

    if (!payload || typeof payload !== 'object' || typeof payload.event !== 'string') {
      throw new ApiError(400, 'INVALID_PAYLOAD', 'Webhook payload is invalid');
    }

    const payloadHash = sha256(rawBody.toString('utf8'));
    const reference = typeof payload.data?.reference === 'string' ? payload.data.reference : null;
    const existing = await prisma.webhookEvent.findUnique({ where: { payloadHash } });

    if (existing) {
      return this.resumeEvent(existing.id, existing.status, payload, reference);
    }

    let eventId: string;
    try {
      const event = await prisma.webhookEvent.create({
        data: {
          payloadHash,
          eventType: payload.event,
          reference,
          signature: signature?.slice(0, 200),
          payload: payload as Prisma.InputJsonValue,
          status: WebhookEventStatus.RECEIVED,
        },
      });
      eventId = event.id;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const duplicate = await prisma.webhookEvent.findUnique({ where: { payloadHash } });
        if (duplicate) {
          return this.resumeEvent(duplicate.id, duplicate.status, payload, reference);
        }
      }
      throw error;
    }

    return this.processEvent(eventId, payload, reference);
  }

  private async resumeEvent(
    eventId: string,
    status: WebhookEventStatus,
    payload: PaystackWebhookPayload,
    reference: string | null,
  ): Promise<WebhookHandlingResult> {
    if (status === WebhookEventStatus.PROCESSED || status === WebhookEventStatus.IGNORED) {
      return { status: 'ignored', reason: 'duplicate' };
    }
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: { status: WebhookEventStatus.RECEIVED, error: null, attempts: { increment: 1 } },
    });
    return this.processEvent(eventId, payload, reference);
  }

  private async processEvent(
    eventId: string,
    payload: PaystackWebhookPayload,
    reference: string | null,
  ): Promise<WebhookHandlingResult> {
    const eventType = payload.event ?? 'unknown';

    if (!reference) {
      await markEvent(eventId, WebhookEventStatus.IGNORED, {
        error: 'Missing transaction reference',
        processedAt: new Date(),
      });
      return { status: 'ignored', reason: 'missing_reference' };
    }

    if (!SUPPORTED_EVENTS.has(eventType)) {
      await markEvent(eventId, WebhookEventStatus.IGNORED, {
        error: `Unsupported event: ${eventType}`,
        processedAt: new Date(),
      });
      return { status: 'ignored', reason: 'unsupported_event' };
    }

    const transaction = await prisma.paymentTransaction.findUnique({ where: { reference } });
    if (!transaction) {
      await markEvent(eventId, WebhookEventStatus.IGNORED, {
        error: 'Transaction not found',
        processedAt: new Date(),
      });
      return { status: 'ignored', reason: 'transaction_not_found' };
    }

    if (
      (transaction.status === 'SUCCESS' || transaction.status === 'REVERSED') &&
      !REVERSAL_EVENTS.has(eventType)
    ) {
      await markEvent(eventId, WebhookEventStatus.IGNORED, {
        error: 'Transaction already in a terminal state',
        processedAt: new Date(),
      });
      return { status: 'ignored', reason: 'terminal' };
    }

    // Independently verify with Paystack. A webhook alone is never proof of
    // payment; the provider verify response is the source of truth.
    let providerResult;
    try {
      providerResult = await this.paystack.verify(reference);
    } catch (error) {
      const retryable = error instanceof PaystackProviderError ? error.retryable : true;
      await markEvent(eventId, WebhookEventStatus.FAILED, {
        error: error instanceof Error ? error.message.slice(0, 500) : 'Verification failed',
      });
      logger.warn('webhook_verify_failed', {
        eventId,
        reference,
        retryable,
        error: error instanceof Error ? error.message : 'unknown error',
      });
      return { status: retryable ? 'retry' : 'failed', reason: 'verification_failed' };
    }

    if (REVERSAL_EVENTS.has(eventType)) {
      const reversal = await this.reconcile(eventId, transaction, {
        ...providerResult,
        status: 'reversed',
      });
      return reversal;
    }

    if (eventType === 'charge.success' && providerResult.status !== 'success') {
      const retryable = providerResult.status === 'pending';
      await markEvent(eventId, WebhookEventStatus.FAILED, {
        error: `Provider reported ${providerResult.status} after charge.success webhook`,
      });
      return { status: retryable ? 'retry' : 'failed', reason: 'provider_not_successful' };
    }

    if (eventType === 'charge.failed' && providerResult.status === 'pending') {
      await markEvent(eventId, WebhookEventStatus.FAILED, {
        error: 'Provider status is still pending',
      });
      return { status: 'retry', reason: 'provider_pending' };
    }

    return this.reconcile(eventId, transaction, providerResult);
  }

  private async reconcile(
    eventId: string,
    transaction: PaymentTransaction,
    providerResult: Parameters<typeof reconcileTransaction>[1],
  ): Promise<WebhookHandlingResult> {
    const result = await reconcileTransaction(transaction, providerResult);

    if (result.mismatch) {
      await markEvent(eventId, WebhookEventStatus.FAILED, {
        error: 'Provider verification details did not match the transaction',
        processedAt: new Date(),
      });
      return { status: 'failed', reason: 'verification_mismatch' };
    }

    if (result.changed) {
      dispatchTransactionEvent(result.transaction, eventId);
    }

    await markEvent(eventId, WebhookEventStatus.PROCESSED, {
      processedAt: new Date(),
    });
    return { status: 'processed' };
  }
}
