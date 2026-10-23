import { Prisma, TransactionStatus, type PaymentTransaction } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { ApiError } from '../utils/errors';
import { generateTransactionReference } from '../utils/crypto';
import { assertSupportedCurrency, ngnToKobo } from '../utils/amount';
import type { PaystackGateway, VerifyPaymentResult } from './paystack.types';
import { PaystackProviderError } from './paystack.types';
import { logger } from '../utils/logger';
import { dispatchTransactionEvent } from './outboundWebhook.service';

type InitializeInput = {
  email: string;
  amount: string | number;
  currency?: string;
  metadata?: Record<string, unknown>;
};

type InitializeResult = {
  reference: string;
  authorizationUrl: string;
  amountKobo: number;
  amountNgn: number;
  currency: string;
};

export type ReconcileResult = {
  transaction: PaymentTransaction;
  changed: boolean;
  mismatch: boolean;
  providerStatus: VerifyPaymentResult['status'];
};

function toNgn(amountKobo: number): number {
  return Number((amountKobo / 100).toFixed(2));
}

function mapProviderStatus(status: VerifyPaymentResult['status']): TransactionStatus {
  switch (status) {
    case 'success':
      return TransactionStatus.SUCCESS;
    case 'failed':
      return TransactionStatus.FAILED;
    case 'abandoned':
      return TransactionStatus.ABANDONED;
    case 'reversed':
      return TransactionStatus.REVERSED;
    default:
      return TransactionStatus.PENDING;
  }
}

async function transition(
  transactionId: string,
  guard: Prisma.PaymentTransactionWhereInput,
  data: Prisma.PaymentTransactionUpdateManyMutationInput,
): Promise<{ transaction: PaymentTransaction; changed: boolean }> {
  const [updated] = await prisma.paymentTransaction.updateManyAndReturn({
    where: { id: transactionId, ...guard },
    data,
  });

  if (updated) {
    return { transaction: updated, changed: true };
  }

  const transaction = await prisma.paymentTransaction.findUniqueOrThrow({
    where: { id: transactionId },
  });
  return { transaction, changed: false };
}

async function markMismatch(
  transaction: PaymentTransaction,
  reason: string,
): Promise<{ transaction: PaymentTransaction; changed: boolean }> {
  return transition(
    transaction.id,
    {
      status: {
        notIn: [TransactionStatus.SUCCESS, TransactionStatus.REVERSED, TransactionStatus.FAILED],
      },
    },
    {
      status: TransactionStatus.FAILED,
      failureReason: reason,
      verifiedAt: new Date(),
    },
  );
}

/**
 * Applies a Paystack verification result to a transaction. This function is
 * the single place where provider status becomes local status, and it uses
 * guarded updates so duplicate webhooks/verifications cannot regress or
 * double-process a payment.
 */
export async function reconcileTransaction(
  transaction: PaymentTransaction,
  provider: VerifyPaymentResult,
): Promise<ReconcileResult> {
  if (provider.reference !== transaction.reference) {
    logger.warn('payment_reference_mismatch', { reference: transaction.reference });
    const result = await markMismatch(transaction, 'Reference mismatch during verification');
    return { ...result, mismatch: true, providerStatus: provider.status };
  }

  if (provider.amountKobo !== transaction.amount) {
    logger.warn('payment_amount_mismatch', {
      reference: transaction.reference,
      expectedKobo: transaction.amount,
      receivedKobo: provider.amountKobo,
    });
    const result = await markMismatch(transaction, 'Amount mismatch between provider and transaction record');
    return { ...result, mismatch: true, providerStatus: provider.status };
  }

  if (provider.currency.toUpperCase() !== transaction.currency) {
    const result = await markMismatch(transaction, 'Currency mismatch between provider and transaction record');
    return { ...result, mismatch: true, providerStatus: provider.status };
  }

  const nextStatus = mapProviderStatus(provider.status);
  const now = new Date();

  if (nextStatus === TransactionStatus.SUCCESS) {
    const result = await transition(
      transaction.id,
      { status: { notIn: [TransactionStatus.SUCCESS, TransactionStatus.REVERSED] } },
      {
        status: TransactionStatus.SUCCESS,
        providerReference: provider.providerTransactionId ?? transaction.providerReference,
        channel: provider.channel ?? transaction.channel,
        gatewayResponse: provider.gatewayResponse ?? transaction.gatewayResponse,
        verifiedAt: now,
        paidAt: provider.paidAt ?? transaction.paidAt ?? now,
        failureReason: null,
      },
    );
    return { ...result, mismatch: false, providerStatus: provider.status };
  }

  if (nextStatus === TransactionStatus.REVERSED) {
    const result = await transition(
      transaction.id,
      { status: { not: TransactionStatus.REVERSED } },
      {
        status: TransactionStatus.REVERSED,
        verifiedAt: now,
        gatewayResponse: provider.gatewayResponse ?? transaction.gatewayResponse,
        failureReason: 'Payment reversed',
      },
    );
    return { ...result, mismatch: false, providerStatus: provider.status };
  }

  if (transaction.status === TransactionStatus.SUCCESS || transaction.status === TransactionStatus.REVERSED) {
    return { transaction, changed: false, mismatch: false, providerStatus: provider.status };
  }

  if (nextStatus === TransactionStatus.PENDING) {
    const result = await transition(
      transaction.id,
      {
        status: {
          notIn: [TransactionStatus.SUCCESS, TransactionStatus.REVERSED, TransactionStatus.PENDING],
        },
      },
      {
        status: TransactionStatus.PENDING,
        providerReference: provider.providerTransactionId ?? transaction.providerReference,
        channel: provider.channel ?? transaction.channel,
        gatewayResponse: provider.gatewayResponse ?? transaction.gatewayResponse,
        failureReason: null,
      },
    );
    return { ...result, mismatch: false, providerStatus: provider.status };
  }

  const result = await transition(
    transaction.id,
    {
      status: {
        notIn: [TransactionStatus.SUCCESS, TransactionStatus.REVERSED, nextStatus],
      },
    },
    {
      status: nextStatus,
      providerReference: provider.providerTransactionId ?? transaction.providerReference,
      channel: provider.channel ?? transaction.channel,
      gatewayResponse: provider.gatewayResponse ?? transaction.gatewayResponse,
      verifiedAt: now,
      failureReason:
        nextStatus === TransactionStatus.FAILED || nextStatus === TransactionStatus.ABANDONED
          ? provider.gatewayResponse?.slice(0, 500) ?? 'Payment was not completed'
          : null,
    },
  );
  return { ...result, mismatch: false, providerStatus: provider.status };
}

export class PaymentService {
  constructor(private readonly paystack: PaystackGateway) {}

  async initialize(input: InitializeInput): Promise<InitializeResult> {
    const email = input.email.trim().toLowerCase();
    const currency = assertSupportedCurrency(input.currency ?? 'NGN');
    const amountKobo = ngnToKobo(input.amount);

    let transaction: PaymentTransaction | null = null;
    for (let attempt = 0; attempt < 3 && !transaction; attempt += 1) {
      try {
        transaction = await prisma.paymentTransaction.create({
          data: {
            reference: generateTransactionReference(),
            amount: amountKobo,
            currency,
            customerEmail: email,
            status: TransactionStatus.INITIALIZED,
            provider: 'paystack',
            metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          continue;
        }
        throw error;
      }
    }

    if (!transaction) {
      throw new ApiError(500, 'REFERENCE_GENERATION_FAILED', 'Could not create a unique transaction reference');
    }

    let providerResult: Awaited<ReturnType<PaystackGateway['initialize']>>;
    try {
      providerResult = await this.paystack.initialize({
        email,
        amountKobo,
        currency,
        reference: transaction.reference,
        callbackUrl: env.PAYSTACK_CALLBACK_URL,
        metadata: { reference: transaction.reference, source: 'payflow-gateway' },
      });
    } catch (error) {
      await prisma.paymentTransaction
        .update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.FAILED,
            failureReason:
              error instanceof Error ? error.message.slice(0, 500) : 'Payment initialization failed',
          },
        })
        .catch(() => undefined);
      throw error;
    }

    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { providerReference: providerResult.providerReference || providerResult.reference },
    });

    return {
      reference: transaction.reference,
      authorizationUrl: providerResult.authorizationUrl,
      amountKobo,
      amountNgn: toNgn(amountKobo),
      currency,
    };
  }

  async verify(reference: string): Promise<PaymentTransaction> {
    const transaction = await prisma.paymentTransaction.findUnique({ where: { reference } });
    if (!transaction) {
      throw ApiError.notFound('Transaction not found');
    }

    if (transaction.status === TransactionStatus.SUCCESS || transaction.status === TransactionStatus.REVERSED) {
      return transaction;
    }

    let providerResult: VerifyPaymentResult;
    try {
      providerResult = await this.paystack.verify(transaction.reference);
    } catch (error) {
      if (error instanceof PaystackProviderError && !error.retryable) {
        const result = await transition(
          transaction.id,
          {
            status: {
              notIn: [
                TransactionStatus.SUCCESS,
                TransactionStatus.REVERSED,
                TransactionStatus.FAILED,
                TransactionStatus.ABANDONED,
              ],
            },
          },
          {
            status: TransactionStatus.FAILED,
            failureReason: error.message.slice(0, 500),
            verifiedAt: new Date(),
          },
        );
        return result.transaction;
      }
      throw error;
    }

    const result = await reconcileTransaction(transaction, providerResult);
    if (result.mismatch) {
      throw new ApiError(
        409,
        'PAYMENT_MISMATCH',
        'Payment could not be verified because the provider details did not match this transaction',
      );
    }
    if (result.changed) {
      dispatchTransactionEvent(result.transaction);
    }
    return result.transaction;
  }

  async getByReference(reference: string): Promise<PaymentTransaction> {
    const transaction = await prisma.paymentTransaction.findUnique({ where: { reference } });
    if (!transaction) {
      throw ApiError.notFound('Transaction not found');
    }
    return transaction;
  }

  async list(query: {
    page: number;
    pageSize: number;
    status?: TransactionStatus;
    reference?: string;
    email?: string;
    from?: Date;
    to?: Date;
  }) {
    const where: Prisma.PaymentTransactionWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.reference) where.reference = { contains: query.reference, mode: 'insensitive' };
    if (query.email) where.customerEmail = { contains: query.email, mode: 'insensitive' };
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = query.from;
      if (query.to) where.createdAt.lte = query.to;
    }

    const [items, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.paymentTransaction.count({ where }),
    ]);

    return { items, total };
  }
}
