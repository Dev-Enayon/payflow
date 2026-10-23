import { useParams } from 'react-router-dom';
import { TransactionDetail } from '@/components/dashboard/transaction-detail';
import { usePageTitle } from '@/hooks/use-page-title';
import { dashboardService } from '@/services/dashboard.service';

export default function DashboardTransactionDetailPage() {
  usePageTitle('Transaction details');
  const { reference = '' } = useParams();
  return (
    <TransactionDetail
      reference={reference}
      fetcher={dashboardService.transaction}
      backTo="/dashboard/transactions"
    />
  );
}
