export type Role = 'ADMIN' | 'MERCHANT';

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt?: string;
};

export type TransactionStatus =
  | 'INITIALIZED'
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'ABANDONED'
  | 'REVERSED';

export type PaymentTransaction = {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string | null;
  status: TransactionStatus;
  provider: string;
  providerReference: string | null;
  channel: string | null;
  gatewayResponse: string | null;
  failureReason: string | null;
  metadata: Record<string, unknown> | null;
  initializedAt: string;
  verifiedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicPayment = {
  reference: string;
  amount: number;
  currency: string;
  customerEmail: string;
  status: TransactionStatus;
  channel: string | null;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
  verifiedAt: string | null;
};

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = {
  data: T[];
  pagination: Pagination;
};

export type InitializePaymentResponse = {
  reference: string;
  authorizationUrl: string;
  amountKobo: number;
  amountNgn: number;
  currency: string;
};

export type DashboardOverview = {
  period: number;
  mode: 'test' | 'live' | 'mock';
  currency: string;
  metrics: {
    volumeNgn: number;
    previousVolumeNgn: number;
    volumeChangePct: number | null;
    successfulPayments: number;
    previousSuccessfulPayments: number;
    successfulChangePct: number | null;
    successRate: number;
    previousSuccessRate: number;
    totalPayments: number;
    pendingPayments: number;
    averagePaymentNgn: number;
  };
  series: Array<{
    date: string;
    volumeNgn: number;
    successful: number;
    total: number;
  }>;
  statusBreakdown: Array<{ status: TransactionStatus; count: number }>;
  recentTransactions: PaymentTransaction[];
};

export type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  lastFour: string;
  environment: 'TEST' | 'LIVE';
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type CreatedApiKey = ApiKey & { key: string };

export type WebhookEndpoint = {
  id: string;
  url: string;
  description: string | null;
  events: string[];
  isActive: boolean;
  secretLastFour: string;
  lastDeliveryAt: string | null;
  lastDeliveryStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | null;
  failureCount: number;
  deliveryCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreatedWebhookEndpoint = WebhookEndpoint & { signingSecret: string };

export type WebhookEvent = {
  id: string;
  eventType: string;
  reference: string | null;
  status: 'RECEIVED' | 'PROCESSED' | 'FAILED' | 'IGNORED';
  attempts: number;
  error: string | null;
  processedAt: string | null;
  createdAt: string;
  payload?: unknown;
};

export type WebhookDelivery = {
  id: string;
  endpointId: string;
  endpointUrl?: string;
  eventType: string;
  reference: string | null;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  responseStatus: number | null;
  responseBody: string | null;
  error: string | null;
  attempts: number;
  durationMs: number | null;
  deliveredAt: string | null;
  createdAt: string;
};

export type SessionInfo = {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

export type AuditLog = {
  id: string;
  actorEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminOverview = {
  mode: 'test' | 'live' | 'mock';
  users: number;
  roles: Record<string, number>;
  transactions: number;
  successful: number;
  successRate: number;
  volumeNgn: number;
  today: { payments: number; successful: number };
  webhooks: { received: number; processed: number; failed: number; ignored: number };
  deliveries: { total: number; success: number; failed: number; pending: number };
  series: Array<{ date: string; volumeNgn: number; successful: number; total: number }>;
  recentTransactions: PaymentTransaction[];
  recentAudit: AuditLog[];
};

export type PublicSettings = {
  brandName: string;
  businessName: string;
  supportEmail: string;
  website: string | null;
  defaultCurrency: string;
};

export type AdminSettings = PublicSettings & {
  callbackUrl: string;
  webhookUrl: string;
  mode: 'test' | 'live' | 'mock';
};

export type HealthStatus = {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  environment: string;
  paystackMode: 'test' | 'live' | 'mock';
  database: 'ok' | 'down';
  timestamp: string;
};
