import { api } from '@/lib/api';
import type { HealthStatus, PublicSettings } from '@/types';

export const settingsService = {
  async public(): Promise<PublicSettings> {
    const payload = await api.get<{ data: PublicSettings }>('/settings/public');
    return payload.data;
  },

  async health(): Promise<HealthStatus> {
    return api.get<HealthStatus>('/health');
  },
};
