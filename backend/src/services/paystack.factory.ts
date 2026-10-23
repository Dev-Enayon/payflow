import { env } from '../config/env';
import { PaystackApiGateway } from './paystack.api';
import { MockPaystackGatewayImpl } from './paystack.mock';
import type { MockPaystackGateway, PaystackGateway } from './paystack.types';

export function createPaystackGateway(): PaystackGateway | MockPaystackGateway {
  if (env.PAYSTACK_MOCK) {
    return new MockPaystackGatewayImpl();
  }
  return new PaystackApiGateway(env.PAYSTACK_SECRET_KEY);
}

export function isMockGateway(gateway: PaystackGateway): gateway is MockPaystackGateway {
  return gateway.kind === 'mock';
}
