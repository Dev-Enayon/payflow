import { env } from '../config/env';
import type {
  InitializePaymentInput,
  InitializePaymentResult,
  MockOutcome,
  MockPaystackGateway,
  VerifyPaymentResult,
} from './paystack.types';
import { PaystackProviderError } from './paystack.types';

type MockTransaction = {
  reference: string;
  amountKobo: number;
  currency: string;
  email: string;
  outcome: MockOutcome;
  createdAt: Date;
};

/**
 * Local-only gateway used when PAYSTACK_MOCK=true. It never runs in
 * production. It allows the complete payment lifecycle to be exercised
 * without real credentials or charges.
 */
export class MockPaystackGatewayImpl implements MockPaystackGateway {
  readonly kind = 'mock' as const;
  readonly mode = 'mock' as const;
  private readonly transactions = new Map<string, MockTransaction>();

  async initialize(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    this.transactions.set(input.reference, {
      reference: input.reference,
      amountKobo: input.amountKobo,
      currency: input.currency,
      email: input.email,
      outcome: 'pending',
      createdAt: new Date(),
    });

    const frontendUrl = env.frontendOrigins[0] ?? 'http://localhost:5173';
    return {
      authorizationUrl: `${frontendUrl}/payment/mock-checkout?reference=${encodeURIComponent(input.reference)}`,
      accessCode: `mock_access_${input.reference}`,
      reference: input.reference,
      providerReference: `mock_${input.reference}`,
    };
  }

  async verify(reference: string): Promise<VerifyPaymentResult> {
    const transaction = this.transactions.get(reference);
    if (!transaction) {
      throw new PaystackProviderError('Transaction was not found at the payment provider.', {
        code: 'PROVIDER_NOT_FOUND',
        retryable: false,
        statusCode: 404,
      });
    }

    const base: VerifyPaymentResult = {
      status: 'pending',
      reference: transaction.reference,
      amountKobo: transaction.amountKobo,
      currency: transaction.currency,
      providerTransactionId: `mock_${transaction.reference}`,
      channel: 'mock',
      customerEmail: transaction.email,
    };

    switch (transaction.outcome) {
      case 'success':
        return {
          ...base,
          status: 'success',
          paidAt: new Date(),
          gatewayResponse: 'Approved by PayFlow mock gateway',
        };
      case 'failed':
        return {
          ...base,
          status: 'failed',
          gatewayResponse: 'Declined by PayFlow mock gateway',
        };
      case 'abandoned':
        return {
          ...base,
          status: 'abandoned',
          gatewayResponse: 'Customer abandoned the mock checkout',
        };
      case 'reversed':
        return {
          ...base,
          status: 'reversed',
          gatewayResponse: 'Payment reversed by PayFlow mock gateway',
        };
      default:
        return base;
    }
  }

  setOutcome(reference: string, outcome: MockOutcome): boolean {
    const transaction = this.transactions.get(reference);
    if (!transaction) {
      return false;
    }
    transaction.outcome = outcome;
    return true;
  }
}
