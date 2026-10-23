import type {
  ApiCredential,
  AuditLog,
  PaymentTransaction,
  Session,
  User,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookEvent,
} from '@prisma/client';
import { maskEmail } from './crypto';

export function serializeUser(user: Pick<User, 'id' | 'email' | 'name' | 'role' | 'isActive' | 'lastLoginAt' | 'createdAt'>) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

export function serializePaymentDashboard(transaction: PaymentTransaction) {
  return {
    id: transaction.id,
    reference: transaction.reference,
    amount: transaction.amount,
    currency: transaction.currency,
    customerEmail: transaction.customerEmail,
    customerName: transaction.customerName,
    status: transaction.status,
    provider: transaction.provider,
    providerReference: transaction.providerReference,
    channel: transaction.channel,
    gatewayResponse: transaction.gatewayResponse,
    failureReason: transaction.failureReason,
    metadata: transaction.metadata,
    initializedAt: transaction.initializedAt,
    verifiedAt: transaction.verifiedAt,
    paidAt: transaction.paidAt,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
}

export function serializePaymentPublic(transaction: PaymentTransaction) {
  return {
    reference: transaction.reference,
    amount: transaction.amount,
    currency: transaction.currency,
    customerEmail: maskEmail(transaction.customerEmail),
    status: transaction.status,
    channel: transaction.channel,
    failureReason: transaction.failureReason,
    paidAt: transaction.paidAt,
    createdAt: transaction.createdAt,
    verifiedAt: transaction.verifiedAt,
  };
}

export function serializeApiKey(
  key: Pick<
    ApiCredential,
    'id' | 'name' | 'keyPrefix' | 'lastFour' | 'environment' | 'lastUsedAt' | 'revokedAt' | 'createdAt'
  >,
) {
  return {
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    lastFour: key.lastFour,
    environment: key.environment,
    lastUsedAt: key.lastUsedAt,
    revokedAt: key.revokedAt,
    createdAt: key.createdAt,
  };
}

export function serializeSession(session: Session, currentSessionId?: string) {
  return {
    id: session.id,
    ip: session.ip,
    userAgent: session.userAgent,
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
    expiresAt: session.expiresAt,
    isCurrent: session.id === currentSessionId,
  };
}

export function serializeWebhookEvent(event: WebhookEvent) {
  return {
    id: event.id,
    eventType: event.eventType,
    reference: event.reference,
    status: event.status,
    attempts: event.attempts,
    error: event.error,
    processedAt: event.processedAt,
    createdAt: event.createdAt,
  };
}

export function serializeWebhookEventDetail(event: WebhookEvent & { deliveries?: WebhookDelivery[] }) {
  return {
    ...serializeWebhookEvent(event),
    payload: event.payload,
    deliveries: event.deliveries?.map(serializeDelivery) ?? [],
  };
}

export function serializeDelivery(delivery: WebhookDelivery) {
  return {
    id: delivery.id,
    endpointId: delivery.endpointId,
    eventType: delivery.eventType,
    reference: delivery.reference,
    status: delivery.status,
    responseStatus: delivery.responseStatus,
    responseBody: delivery.responseBody,
    error: delivery.error,
    attempts: delivery.attempts,
    durationMs: delivery.durationMs,
    deliveredAt: delivery.deliveredAt,
    createdAt: delivery.createdAt,
  };
}

export function serializeWebhookEndpoint(
  endpoint: WebhookEndpoint & { _count?: { deliveries: number } },
) {
  return {
    id: endpoint.id,
    url: endpoint.url,
    description: endpoint.description,
    events: endpoint.events,
    isActive: endpoint.isActive,
    secretLastFour: endpoint.secretLastFour,
    lastDeliveryAt: endpoint.lastDeliveryAt,
    lastDeliveryStatus: endpoint.lastDeliveryStatus,
    failureCount: endpoint.failureCount,
    deliveryCount: endpoint._count?.deliveries ?? 0,
    createdAt: endpoint.createdAt,
    updatedAt: endpoint.updatedAt,
  };
}

export function serializeAuditLog(log: AuditLog) {
  return {
    id: log.id,
    actorEmail: log.actorEmail,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    ip: log.ip,
    userAgent: log.userAgent,
    metadata: log.metadata,
    createdAt: log.createdAt,
  };
}
