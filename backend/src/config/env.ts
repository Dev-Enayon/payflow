import 'dotenv/config';
import { z } from 'zod';

const booleanString = z
  .string()
  .optional()
  .default('false')
  .transform((value) => value.toLowerCase() === 'true');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().max(65535).default(5000),
    FRONTEND_URL: z.string().min(1),
    PAYSTACK_CALLBACK_URL: z.string().url(),
    DATABASE_URL: z.string().min(1),
    PAYSTACK_SECRET_KEY: z.string().optional().default(''),
    PAYSTACK_PUBLIC_KEY: z.string().optional().default(''),
    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
    SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(168),
    ENCRYPTION_KEY: z.string().optional().default(''),
    COOKIE_DOMAIN: z.string().optional().default(''),
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).optional(),
    TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
    PAYSTACK_MOCK: booleanString,
    MIN_PAYMENT_AMOUNT: z.coerce.number().min(1).max(100000000).default(100),
    MAX_PAYMENT_AMOUNT: z.coerce.number().min(1).max(100000000).default(5000000),
    SEED_ADMIN_EMAIL: z.string().email().optional(),
    SEED_ADMIN_PASSWORD: z.string().optional(),
    SEED_MERCHANT_EMAIL: z.string().email().optional(),
    SEED_MERCHANT_PASSWORD: z.string().optional(),
    BUSINESS_NAME: z.string().optional().default('PayFlow'),
    SUPPORT_EMAIL: z.string().email().optional().default('support@payflow.local'),
    BRAND_NAME: z.string().optional().default('PayFlow'),
    RATE_LIMITS_ENABLED: z
      .string()
      .optional()
      .default('true')
      .transform((value) => value.toLowerCase() === 'true'),
    LOGIN_RATE_LIMIT: z.coerce.number().int().min(1).default(10),
    INIT_RATE_LIMIT: z.coerce.number().int().min(1).default(10),
    VERIFY_RATE_LIMIT: z.coerce.number().int().min(1).default(60),
  })
  .superRefine((value, ctx) => {
    if (value.MIN_PAYMENT_AMOUNT >= value.MAX_PAYMENT_AMOUNT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'MIN_PAYMENT_AMOUNT must be lower than MAX_PAYMENT_AMOUNT',
        path: ['MIN_PAYMENT_AMOUNT'],
      });
    }

    if (!value.PAYSTACK_MOCK && !value.PAYSTACK_SECRET_KEY.startsWith('sk_')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'PAYSTACK_SECRET_KEY is required unless PAYSTACK_MOCK=true',
        path: ['PAYSTACK_SECRET_KEY'],
      });
    }

    const origins = value.FRONTEND_URL.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (origins.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'FRONTEND_URL must contain at least one origin',
        path: ['FRONTEND_URL'],
      });
    }

    origins.forEach((origin) => {
      let url: URL;
      try {
        url = new URL(origin);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid frontend origin: ${origin}`,
          path: ['FRONTEND_URL'],
        });
        return;
      }
      if (!['http:', 'https:'].includes(url.protocol)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Frontend origins must use HTTP or HTTPS: ${origin}`,
          path: ['FRONTEND_URL'],
        });
      }
      if (value.NODE_ENV === 'production' && url.protocol !== 'https:') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `FRONTEND_URL must use HTTPS in production: ${origin}`,
          path: ['FRONTEND_URL'],
        });
      }
    });

    if (value.NODE_ENV === 'production') {
      if (value.PAYSTACK_MOCK) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PAYSTACK_MOCK cannot be enabled in production',
          path: ['PAYSTACK_MOCK'],
        });
      }
      if (!value.PAYSTACK_CALLBACK_URL.startsWith('https://')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PAYSTACK_CALLBACK_URL must use HTTPS in production',
          path: ['PAYSTACK_CALLBACK_URL'],
        });
      }
      if (!value.RATE_LIMITS_ENABLED) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'RATE_LIMITS_ENABLED cannot be disabled in production',
          path: ['RATE_LIMITS_ENABLED'],
        });
      }
    }
  });

export type ParsedEnv = z.infer<typeof envSchema>;

function buildEnv(parsed: ParsedEnv) {
  const isProduction = parsed.NODE_ENV === 'production';
  const isTest = parsed.NODE_ENV === 'test';
  const sameSite = parsed.COOKIE_SAME_SITE ?? (isProduction ? 'none' : 'lax');

  const frontendOrigins = Array.from(
    new Set(
      parsed.FRONTEND_URL.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
        .map((origin) => new URL(origin).origin),
    ),
  );

  return {
    ...parsed,
    isProduction,
    isTest,
    isDevelopment: parsed.NODE_ENV === 'development',
    frontendOrigins,
    sessionTtlMs: parsed.SESSION_TTL_HOURS * 60 * 60 * 1000,
    cookie: {
      name: 'pf_session',
      secure: isProduction,
      sameSite: sameSite as 'lax' | 'strict' | 'none',
      domain: parsed.COOKIE_DOMAIN || undefined,
    },
    paystackMode: parsed.PAYSTACK_MOCK
      ? ('mock' as const)
      : parsed.PAYSTACK_SECRET_KEY.startsWith('sk_live')
        ? ('live' as const)
        : ('test' as const),
  };
}

export function parseEnv(source: NodeJS.ProcessEnv = process.env) {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n  - ');
    throw new Error(`Invalid environment configuration:\n  - ${issues}`);
  }

  return buildEnv(parsed.data);
}

export const env = parseEnv();

export type Env = ReturnType<typeof buildEnv>;
