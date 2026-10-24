import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/providers/auth-provider';
import { AdminRoute, RequireAuth } from '@/components/require-auth';
import { ErrorBoundary } from '@/components/error-boundary';
import { ApiError } from '@/lib/api';
import { PublicLayout } from '@/layouts/public-layout';
import { DashboardLayout } from '@/layouts/dashboard-layout';
import { AdminLayout } from '@/layouts/admin-layout';
import LandingPage from '@/pages/public/landing';
import CheckoutPage from '@/pages/public/checkout';
import PaymentCallbackPage from '@/pages/public/payment-callback';
import PaymentProcessingPage from '@/pages/public/payment-processing';
import PaymentResultPage from '@/pages/public/payment-result';
import { PaymentFailedPage, PaymentSuccessPage } from '@/pages/public/payment-legacy';
import MockCheckoutPage from '@/pages/public/mock-checkout';
import { PrivacyPage, TermsPage } from '@/pages/public/legal';
import LoginPage from '@/pages/auth/login';
import RegisterPage from '@/pages/auth/register';
import NotFoundPage from '@/pages/not-found';
import ForbiddenPage from '@/pages/forbidden';
import { FullPageLoader } from '@/components/ui/spinner';

const DashboardOverviewPage = lazy(() => import('@/pages/dashboard/overview'));
const DashboardTransactionsPage = lazy(() => import('@/pages/dashboard/transactions'));
const DashboardTransactionDetailPage = lazy(() => import('@/pages/dashboard/transaction-detail'));
const ApiKeysPage = lazy(() => import('@/pages/dashboard/api-keys'));
const WebhooksPage = lazy(() => import('@/pages/dashboard/webhooks'));
const IntegrationPage = lazy(() => import('@/pages/dashboard/integration'));
const SettingsPage = lazy(() => import('@/pages/dashboard/settings'));
const SecurityPage = lazy(() => import('@/pages/dashboard/security'));
const AdminOverviewPage = lazy(() => import('@/pages/admin/overview'));
const AdminTransactionsPage = lazy(() => import('@/pages/admin/transactions'));
const AdminTransactionDetailPage = lazy(() => import('@/pages/admin/transaction-detail'));
const AdminUsersPage = lazy(() => import('@/pages/admin/users'));
const AdminWebhooksPage = lazy(() => import('@/pages/admin/webhooks'));
const AdminAuditLogsPage = lazy(() => import('@/pages/admin/audit-logs'));
const AdminSettingsPage = lazy(() => import('@/pages/admin/settings'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 500) {
          return failureCount < 1;
        }
        return false;
      },
      staleTime: 15_000,
      refetchOnWindowFocus: false,
    },
  },
});

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <FullPageLoader />
    </div>
  );
}

function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const element = document.getElementById(hash.slice(1));
      if (element) {
        window.setTimeout(() => element.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname, hash]);

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ScrollManager />
          <ErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
              <Route element={<PublicLayout />}>
                <Route index element={<LandingPage />} />
                <Route path="privacy" element={<PrivacyPage />} />
                <Route path="terms" element={<TermsPage />} />
                <Route path="forbidden" element={<ForbiddenPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>

              <Route path="pay" element={<CheckoutPage />} />
              <Route path="payment/verify" element={<PaymentCallbackPage />} />
              <Route path="payment/processing" element={<PaymentProcessingPage />} />
              <Route path="payment/result/:reference" element={<PaymentResultPage />} />
              <Route path="payment/success" element={<PaymentSuccessPage />} />
              <Route path="payment/failed" element={<PaymentFailedPage />} />
              <Route path="payment/mock-checkout" element={<MockCheckoutPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="admin/login" element={<LoginPage adminMode />} />

              <Route
                path="dashboard"
                element={
                  <RequireAuth>
                    <DashboardLayout />
                  </RequireAuth>
                }
              >
                <Route index element={<DashboardOverviewPage />} />
                <Route path="transactions" element={<DashboardTransactionsPage />} />
                <Route path="transactions/:reference" element={<DashboardTransactionDetailPage />} />
                <Route path="api-keys" element={<ApiKeysPage />} />
                <Route path="webhooks" element={<WebhooksPage />} />
                <Route path="integration" element={<IntegrationPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="security" element={<SecurityPage />} />
              </Route>

              <Route
                path="admin"
                element={
                  <AdminRoute>
                    <AdminLayout />
                  </AdminRoute>
                }
              >
                <Route index element={<AdminOverviewPage />} />
                <Route path="transactions" element={<AdminTransactionsPage />} />
                <Route path="transactions/:reference" element={<AdminTransactionDetailPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="webhooks" element={<AdminWebhooksPage />} />
                <Route path="audit-logs" element={<AdminAuditLogsPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>
              </Routes>
            </Suspense>
          </ErrorBoundary>
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{ duration: 4500, style: { fontFamily: 'inherit' } }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
