import { api } from '@/lib/api';
import type { ApiKey, CreatedApiKey } from '@/types';

export const keysService = {
  async list(): Promise<ApiKey[]> {
    const payload = await api.get<{ data: ApiKey[] }>('/keys');
    return payload.data;
  },

  async create(input: { name: string; environment: 'TEST' | 'LIVE' }): Promise<CreatedApiKey> {
    const payload = await api.post<{ data: CreatedApiKey }>('/keys', input);
    return payload.data;
  },

  async revoke(id: string): Promise<void> {
    await api.delete(`/keys/${id}`);
  },
};
