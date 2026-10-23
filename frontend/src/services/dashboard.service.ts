import { api } from '@/lib/api';
import { buildQuery, type PaymentListParams } from './payments.service';
import type { DashboardOverview, Paginated, PaymentTransaction } from '@/types';

export const dashboardService = {
  async overview(period: number): Promise<DashboardOverview> {
    const payload = await api.get<{ data: DashboardOverview }>(`/dashboard/overview${buildQuery({ period })}`);
    return payload.data;
  },

  async transactions(params: PaymentListParams): Promise<Paginated<PaymentTransaction>> {
    const payload = await api.get<Paginated<PaymentTransaction>>(`/dashboard/transactions${buildQuery(params)}`);
    return payload;
  },

  async transaction(reference: string): Promise<PaymentTransaction> {
    const payload = await api.get<{ data: PaymentTransaction }>(
      `/dashboard/transactions/${encodeURIComponent(reference)}`,
    );
    return payload.data;
  },
};
