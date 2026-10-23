import { api } from '@/lib/api';
import type {
  InitializePaymentResponse,
  Paginated,
  PaymentTransaction,
  PublicPayment,
  TransactionStatus,
} from '@/types';

export type PaymentListParams = {
  page?: number;
  pageSize?: number;
  status?: TransactionStatus | 'ALL';
  search?: string;
  from?: string;
  to?: string;
};

export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'ALL') {
      query.set(key, String(value));
    }
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export const paymentsService = {
  async initialize(input: { email: string; amount: number }): Promise<InitializePaymentResponse> {
    const payload = await api.post<{ data: InitializePaymentResponse }>('/payments/initialize', input);
    return payload.data;
  },

  async verify(reference: string): Promise<PublicPayment> {
    const payload = await api.get<{ data: PublicPayment }>(
      `/payments/verify/${encodeURIComponent(reference)}`,
    );
    return payload.data;
  },

  async getPublic(reference: string): Promise<PublicPayment> {
    const payload = await api.get<{ data: PublicPayment }>(`/payments/${encodeURIComponent(reference)}`);
    return payload.data;
  },

  async list(params: PaymentListParams): Promise<Paginated<PaymentTransaction>> {
    const payload = await api.get<Paginated<PaymentTransaction>>(`/payments${buildQuery(params)}`);
    return payload;
  },

  async completeMock(reference: string, outcome: 'success' | 'failed' | 'abandoned' | 'reversed' | 'pending'): Promise<void> {
    await api.post(`/dev/mock-payments/${encodeURIComponent(reference)}/complete`, { outcome });
  },
};
