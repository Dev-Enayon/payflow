import { api, setCsrfToken } from '@/lib/api';
import type { SessionInfo, User } from '@/types';

type AuthPayload = { user: User; csrfToken: string };

export const authService = {
  async me(): Promise<AuthPayload> {
    const payload = await api.get<{ data: AuthPayload }>('/auth/me');
    setCsrfToken(payload.data.csrfToken);
    return payload.data;
  },

  async register(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthPayload> {
    const payload = await api.post<{ data: AuthPayload }>('/auth/register', input);
    setCsrfToken(payload.data.csrfToken);
    return payload.data;
  },

  async login(email: string, password: string): Promise<AuthPayload> {
    const payload = await api.post<{ data: AuthPayload }>('/auth/login', { email, password });
    setCsrfToken(payload.data.csrfToken);
    return payload.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
    setCsrfToken(null);
  },

  async updateProfile(input: { name?: string; email?: string }): Promise<User> {
    const payload = await api.patch<{ data: { user: User } }>('/auth/profile', input);
    return payload.data.user;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', { currentPassword, newPassword });
  },

  async sessions(): Promise<SessionInfo[]> {
    const payload = await api.get<{ data: SessionInfo[] }>('/auth/sessions');
    return payload.data;
  },

  async revokeSession(id: string): Promise<void> {
    await api.delete(`/auth/sessions/${id}`);
  },
};
