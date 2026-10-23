import { TransactionsView } from '@/components/dashboard/transactions-view';
import { usePageTitle } from '@/hooks/use-page-title';
import { adminService } from '@/services/admin.service';

export default function AdminTransactionsPage() {
  usePageTitle('All transactions');
  return (
    <TransactionsView
      title="All transactions"
      description="Cross-workspace payment activity with full search and filtering."
      fetcher={adminService.transactions}
      basePath="/admin/transactions"
    />
  );
}
