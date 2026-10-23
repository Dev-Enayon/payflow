import { useEffect } from 'react';
import { BRAND_NAME } from '@/lib/utils';

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${BRAND_NAME}` : `${BRAND_NAME} | Paystack Payment Gateway`;
  }, [title]);
}
