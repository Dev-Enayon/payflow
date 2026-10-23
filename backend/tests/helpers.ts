import { hash as argonHash } from '@node-rs/argon2';
import type { Role } from '@prisma/client';
import request from 'supertest';
import type { Express } from 'express';
import type TestAgent from 'supertest/lib/agent';
import { prisma } from '../src/config/prisma';
import type {
  InitializePaymentInput,
  InitializePaymentResult,
  PaystackGateway,
  VerifyPaymentResult,
} from '../src/services/paystack.types';

export const TEST_PASSWORD = 'TestPassword123';

export async function resetDatabase() {
  await prisma.webhookDelivery.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.webhookEndpoint.deleteMany();
  await prisma.apiCredential.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.user.deleteMany();
}

export async function createUser(
  role: Role = 'MERCHANT',
  overrides: { email?: string; password?: string; name?: string } = {},
) {
  const email = overrides.email ?? `${role.toLowerCase()}@example.com`;
  const passwordHash = await argonHash(overrides.password ?? TEST_PASSWORD, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
  return prisma.user.create({
    data: {
      email,
      name: overrides.name ?? `${role} User`,
      role,
      passwordHash,
    },
  });
}

export type LoggedInAgent = {
  agent: TestAgent;
  csrfToken: string;
  user: { id: string; email: string; role: Role };
};

export async function login(
  app: Express,
  email: string,
  password = TEST_PASSWORD,
): Promise<LoggedInAgent> {
  const agent = request.agent(app);
  const response = await agent
    .post('/api/auth/login')
    .set('Origin', 'http://localhost:5173')
    .send({ email, password });

  if (response.status !== 200) {
    throw new Error(`Login failed for ${email}: ${response.status} ${JSON.stringify(response.body)}`);
  }

  return {
    agent,
    csrfToken: response.body.data.csrfToken as string,
    user: response.body.data.user,
  };
}

export function authed(agent: TestAgent, csrfToken: string) {
  return {
    get: (path: string) => agent.get(path).set('Origin', 'http://localhost:5173'),
    post: (path: string) =>
      agent.post(path).set('Origin', 'http://localhost:5173').set('X-CSRF-Token', csrfToken),
    patch: (path: string) =>
      agent.patch(path).set('Origin', 'http://localhost:5173').set('X-CSRF-Token', csrfToken),
    delete: (path: string) =>
      agent.delete(path).set('Origin', 'http://localhost:5173').set('X-CSRF-Token', csrfToken),
  };
}

export class FakePaystackGateway implements PaystackGateway {
  readonly kind = 'api' as const;
  readonly mode = 'test' as const;
  initializeCalls: InitializePaymentInput[] = [];
  verifyCalls: string[] = [];
  verifyResult: VerifyPaymentResult | null = null;
  verifyError: Error | null = null;
  initializeError: Error | null = null;

  async initialize(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    this.initializeCalls.push(input);
    if (this.initializeError) throw this.initializeError;
    return {
      authorizationUrl: `https://checkout.paystack.test/${input.reference}`,
      accessCode: `access_${input.reference}`,
      reference: input.reference,
      providerReference: input.reference,
    };
  }

  async verify(reference: string): Promise<VerifyPaymentResult> {
    this.verifyCalls.push(reference);
    if (this.verifyError) throw this.verifyError;
    if (!this.verifyResult) {
      throw new Error('FakePaystackGateway.verifyResult was not configured');
    }
    return { ...this.verifyResult, reference };
  }
}

export async function createTransaction(overrides: {
  reference?: string;
  amount?: number;
  currency?: string;
  email?: string;
  status?: 'INITIALIZED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'ABANDONED' | 'REVERSED';
} = {}) {
  return prisma.paymentTransaction.create({
    data: {
      reference: overrides.reference ?? `PF-TEST-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(16)
        .slice(2, 8)
        .toUpperCase()}`,
      amount: overrides.amount ?? 100000,
      currency: overrides.currency ?? 'NGN',
      customerEmail: overrides.email ?? 'customer@example.com',
      status: overrides.status ?? 'INITIALIZED',
    },
  });
}
