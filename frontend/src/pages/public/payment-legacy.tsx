import { Navigate, useSearchParams } from 'react-router-dom';

export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference') ?? searchParams.get('trxref');
  return <Navigate to={reference ? `/payment/result/${encodeURIComponent(reference)}` : '/payment/verify'} replace />;
}

export function PaymentFailedPage() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference') ?? searchParams.get('trxref');
  return <Navigate to={reference ? `/payment/result/${encodeURIComponent(reference)}` : '/payment/verify'} replace />;
}
