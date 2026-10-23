import type {
  InitializePaymentInput,
  InitializePaymentResult,
  PaystackGateway,
  PaystackNormalizedStatus,
  VerifyPaymentResult,
} from './paystack.types';
import { PaystackProviderError } from './paystack.types';

type PaystackEnvelope<T> = {
  status: boolean;
  message: string;
  data: T;
};

type InitializeData = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

type VerifyData = {
  id?: number;
  status?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  paid_at?: string | null;
  channel?: string | null;
  gateway_response?: string | null;
  customer?: { email?: string };
};

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const REQUEST_TIMEOUT_MS = 15_000;

function normalizeStatus(status: string | undefined): PaystackNormalizedStatus {
  switch (status) {
    case 'success':
      return 'success';
    case 'failed':
      return 'failed';
    case 'abandoned':
      return 'abandoned';
    case 'reversed':
      return 'reversed';
    default:
      return 'pending';
  }
}

export class PaystackApiGateway implements PaystackGateway {
  readonly kind = 'api' as const;
  readonly mode: 'test' | 'live';

  constructor(private readonly secretKey: string) {
    this.mode = secretKey.startsWith('sk_live') ? 'live' : 'test';
  }

  private async request<T>(path: string, init?: RequestInit): Promise<PaystackEnvelope<T>> {
    let response: Response;
    try {
      response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new PaystackProviderError(
        error instanceof Error && error.name === 'TimeoutError'
          ? 'The payment provider timed out. Please try again.'
          : 'Could not reach the payment provider. Please try again.',
        { code: 'PROVIDER_UNREACHABLE', retryable: true },
      );
    }

    let body: PaystackEnvelope<T> | undefined;
    try {
      body = (await response.json()) as PaystackEnvelope<T>;
    } catch {
      body = undefined;
    }

    if (!response.ok || !body?.status) {
      const message =
        body?.message && response.status < 500
          ? body.message.slice(0, 200)
          : 'The payment provider could not process this request.';
      throw new PaystackProviderError(message, {
        code: 'PROVIDER_REJECTED',
        retryable: response.status >= 500 || response.status === 429,
        statusCode: response.status,
      });
    }

    return body;
  }

  async initialize(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const body = await this.request<InitializeData>('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email: input.email,
        amount: input.amountKobo,
        currency: input.currency,
        reference: input.reference,
        callback_url: input.callbackUrl,
        ...(input.metadata ? { metadata: input.metadata } : {}),
      }),
    });

    if (!body.data?.authorization_url || !body.data.reference) {
      throw new PaystackProviderError('The payment provider returned an invalid response.', {
        code: 'PROVIDER_INVALID_RESPONSE',
        retryable: true,
      });
    }

    return {
      authorizationUrl: body.data.authorization_url,
      accessCode: body.data.access_code ?? '',
      reference: body.data.reference,
      providerReference: body.data.reference,
    };
  }

  async verify(reference: string): Promise<VerifyPaymentResult> {
    const body = await this.request<VerifyData>(
      `/transaction/verify/${encodeURIComponent(reference)}`,
    );

    if (!body.data?.reference) {
      throw new PaystackProviderError('The payment provider returned an invalid response.', {
        code: 'PROVIDER_INVALID_RESPONSE',
        retryable: true,
      });
    }

    return {
      status: normalizeStatus(body.data.status),
      reference: body.data.reference,
      amountKobo: Number(body.data.amount ?? 0),
      currency: (body.data.currency ?? 'NGN').toUpperCase(),
      providerTransactionId: body.data.id ? String(body.data.id) : undefined,
      channel: body.data.channel ?? undefined,
      paidAt: body.data.paid_at ? new Date(body.data.paid_at) : undefined,
      gatewayResponse: body.data.gateway_response ?? undefined,
      customerEmail: body.data.customer?.email,
    };
  }
}
