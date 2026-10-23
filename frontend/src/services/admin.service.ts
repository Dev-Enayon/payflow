import { api } from '@/lib/api';
import { buildQuery, type PaymentListParams } from './payments.service';
import type {
  AdminOverview,
  AdminSettings,
  AuditLog,
  Paginated,
  PaymentTransaction,
  User,
  WebhookDelivery,
  WebhookEvent,
} from '@/types';

export type AuditParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  action?: string;
  from?: string;
  to?: string;
};

export const adminService = {
  async overview(): Promise<AdminOverview> {
    const payload = await api.get<{ data: AdminOverview }>('/admin/overview');
    return payload.data;
  },

  async users(): Promise<User[]> {
    const payload = await api.get<{ data: User[] }>('/admin/users');
    return payload.data;
  },

  async transactions(params: PaymentListParams): Promise<Paginated<PaymentTransaction>> {
    const payload = await api.get<Paginated<PaymentTransaction>>(`/admin/transactions${buildQuery(params)}`);
    return payload;
  },

  async transaction(reference: string): Promise<PaymentTransaction> {
    const payload = await api.get<{ data: PaymentTransaction }>(
      `/admin/transactions/${encodeURIComponent(reference)}`,
    );
    return payload.data;
  },

  async auditLogs(params: AuditParams): Promise<Paginated<AuditLog>> {
    const payload = await api.get<Paginated<AuditLog>>(`/admin/audit-logs${buildQuery(params)}`);
    return payload;
  },

  async webhookEvents(params: { page?: number; pageSize?: number; status?: string; search?: string }): Promise<Paginated<WebhookEvent>> {
    const payload = await api.get<Paginated<WebhookEvent>>(`/admin/webhook-events${buildQuery(params)}`);
    return payload;
  },

  async webhookDeliveries(params: { page?: number; pageSize?: number; status?: string; search?: string }): Promise<Paginated<WebhookDelivery>> {
    const payload = await api.get<Paginated<WebhookDelivery>>(`/admin/webhook-deliveries${buildQuery(params)}`);
    return payload;
  },

  async settings(): Promise<AdminSettings> {
    const payload = await api.get<{ data: AdminSettings }>('/admin/settings');
    return payload.data;
  },

  async updateSettings(input: {
    brandName: string;
    businessName: string;
    supportEmail: string;
    website?: string | null;
    defaultCurrency: 'NGN';
  }): Promise<AdminSettings> {
    const payload = await api.patch<{ data: AdminSettings }>('/admin/settings', input);
    return payload.data;
  },
};
