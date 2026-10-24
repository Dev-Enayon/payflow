import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { FullPageLoader } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/use-auth';
import type { Role } from '@/types';
import ForbiddenPage from '@/pages/forbidden';

export function RequireAuth({
  children,
  role,
  loginPath = '/login',
}: {
  children: ReactNode;
  role?: Role;
  loginPath?: string;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <FullPageLoader />
      </div>
    );
  }

  if (!user) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`${loginPath}?next=${encodeURIComponent(next)}`} replace />;
  }

  if (role && user.role !== role) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  return (
    <RequireAuth role="ADMIN" loginPath="/admin/login">
      {children}
    </RequireAuth>
  );
}
