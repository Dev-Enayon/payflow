export type PaystackNormalizedStatus =
  | 'success'
  | 'failed'
  | 'abandoned'
  | 'reversed'
  | 'pending';

export type InitializePaymentInput = {
  email: string;
  amountKobo: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
};

export type InitializePaymentResult = {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
  providerReference: string;
};

export type VerifyPaymentResult = {
  status: PaystackNormalizedStatus;
  reference: string;
  amountKobo: number;
  currency: string;
  providerTransactionId?: string;
  channel?: string;
  paidAt?: Date;
  gatewayResponse?: string;
  customerEmail?: string;
};

export interface PaystackGateway {
  readonly kind: 'api' | 'mock';
  readonly mode: 'test' | 'live' | 'mock';
  initialize(input: InitializePaymentInput): Promise<InitializePaymentResult>;
  verify(reference: string): Promise<VerifyPaymentResult>;
}

export type MockOutcome = 'success' | 'failed' | 'abandoned' | 'reversed' | 'pending';

export interface MockPaystackGateway extends PaystackGateway {
  kind: 'mock';
  setOutcome(reference: string, outcome: MockOutcome): boolean;
}

export class PaystackProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly statusCode?: number;

  constructor(message: string, options: { code?: string; retryable?: boolean; statusCode?: number } = {}) {
    super(message);
    this.name = 'PaystackProviderError';
    this.code = options.code ?? 'PAYSTACK_ERROR';
    this.retryable = options.retryable ?? true;
    this.statusCode = options.statusCode;
  }
}
