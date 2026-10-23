import { TransactionsView } from '@/components/dashboard/transactions-view';
import { usePageTitle } from '@/hooks/use-page-title';
import { dashboardService } from '@/services/dashboard.service';

export default function DashboardTransactionsPage() {
  usePageTitle('Transactions');
  return (
    <TransactionsView
      title="Transactions"
      description="Every payment initialized through your workspace, verified with Paystack."
      fetcher={dashboardService.transactions}
      basePath="/dashboard/transactions"
    />
  );
}
