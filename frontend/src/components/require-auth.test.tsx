// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminRoute } from '@/components/require-auth';
import { AuthContext, type AuthContextValue } from '@/providers/auth-context';
import type { User } from '@/types';

const adminUser: User = {
  id: 'admin-1',
  email: 'admin@example.com',
  name: 'Admin',
  role: 'ADMIN',
  isActive: true,
  lastLoginAt: null,
};

const merchantUser: User = { ...adminUser, id: 'merchant-1', role: 'MERCHANT' };

function authValue(user: User | null): AuthContextValue {
  return {
    user,
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
  };
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderAdminRoute(user: User | null) {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <AuthContext.Provider value={authValue(user)}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <div>Admin content</div>
              </AdminRoute>
            }
          />
          <Route path="/admin/login" element={<div>Admin login</div>} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
        <LocationProbe />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('AdminRoute', () => {
  it('redirects unauthenticated visitors to the admin login with a next path', () => {
    renderAdminRoute(null);

    expect(screen.getByText('Admin login')).toBeTruthy();
    expect(screen.getByTestId('location').textContent).toBe('/admin/login?next=%2Fadmin');
  });

  it('shows access denied for an authenticated merchant', () => {
    renderAdminRoute(merchantUser);

    expect(screen.queryByText('Admin content')).toBeNull();
    expect(screen.getByText('Access denied')).toBeTruthy();
  });

  it('renders the admin area only for authenticated administrators', () => {
    renderAdminRoute(adminUser);

    expect(screen.getByText('Admin content')).toBeTruthy();
    expect(screen.queryByText('Access denied')).toBeNull();
  });
});
