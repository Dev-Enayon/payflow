import { api } from '@/lib/api';
import { buildQuery } from './payments.service';
import type {
  CreatedWebhookEndpoint,
  Paginated,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookEvent,
} from '@/types';

export const WEBHOOK_EVENTS = [
  { value: 'payment.success', label: 'Payment succeeded', description: 'A payment was verified successfully.' },
  { value: 'payment.failed', label: 'Payment failed', description: 'A payment failed or was abandoned.' },
  { value: 'payment.reversed', label: 'Payment reversed', description: 'A successful payment was refunded or reversed.' },
] as const;

export type WebhookEventParams = {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
};

export type DeliveryParams = WebhookEventParams;

export const webhooksService = {
  async endpoints(): Promise<WebhookEndpoint[]> {
    const payload = await api.get<{ data: WebhookEndpoint[] }>('/webhooks');
    return payload.data;
  },

  async create(input: {
    url: string;
    description?: string;
    events: string[];
  }): Promise<CreatedWebhookEndpoint> {
    const payload = await api.post<{ data: CreatedWebhookEndpoint }>('/webhooks', input);
    return payload.data;
  },

  async update(
    id: string,
    input: { url?: string; description?: string | null; events?: string[]; isActive?: boolean },
  ): Promise<WebhookEndpoint> {
    const payload = await api.patch<{ data: WebhookEndpoint }>(`/webhooks/${id}`, input);
    return payload.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/webhooks/${id}`);
  },

  async test(id: string): Promise<WebhookDelivery | null> {
    const payload = await api.post<{ data: WebhookDelivery | null }>(`/webhooks/${id}/test`);
    return payload.data;
  },

  async events(params: WebhookEventParams): Promise<Paginated<WebhookEvent>> {
    const payload = await api.get<Paginated<WebhookEvent>>(`/webhooks/events${buildQuery(params)}`);
    return payload;
  },

  async deliveries(params: DeliveryParams): Promise<Paginated<WebhookDelivery>> {
    const payload = await api.get<Paginated<WebhookDelivery>>(`/webhooks/deliveries${buildQuery(params)}`);
    return payload;
  },
};
