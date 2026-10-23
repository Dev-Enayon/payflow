import { useParams } from 'react-router-dom';
import { TransactionDetail } from '@/components/dashboard/transaction-detail';
import { usePageTitle } from '@/hooks/use-page-title';
import { adminService } from '@/services/admin.service';

export default function AdminTransactionDetailPage() {
  usePageTitle('Transaction details');
  const { reference = '' } = useParams();
  return (
    <TransactionDetail
      reference={reference}
      fetcher={adminService.transaction}
      backTo="/admin/transactions"
    />
  );
}
