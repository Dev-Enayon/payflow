import { PrismaClient, Role } from '@prisma/client';
import { hash as argonHash } from '@node-rs/argon2';
import { randomBytes } from 'node:crypto';
import 'dotenv/config';

const prisma = new PrismaClient();
const isProduction = process.env.NODE_ENV === 'production';
const seedPasswordRules = /^(?=.*[A-Za-z])(?=.*\d).{12,}$/;

function resolvePassword(
  password: string | undefined,
  envVar: string,
  allowGenerated: boolean,
): { password: string; generated: boolean } {
  if (password) {
    if (!seedPasswordRules.test(password)) {
      throw new Error(
        `${envVar} must be at least 12 characters and include a letter and a number`,
      );
    }
    return { password, generated: false };
  }

  if (!allowGenerated) {
    throw new Error(`${envVar} is required when NODE_ENV=production`);
  }

  return { password: randomBytes(18).toString('base64url'), generated: true };
}

async function ensureUser(
  email: string,
  name: string,
  role: Role,
  password: string | undefined,
  envVar: string,
  options: { allowGenerated: boolean },
) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    if (existing.role !== role) {
      throw new Error(
        `[seed] ${normalizedEmail} already exists with role ${existing.role}; refusing to change roles automatically`,
      );
    }
    console.log(`[seed] ${role} user already exists: ${normalizedEmail}`);
    return existing;
  }

  const resolved = resolvePassword(password, envVar, options.allowGenerated);
  const passwordHash = await argonHash(resolved.password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name,
      role,
      passwordHash,
      isActive: true,
    },
  });

  console.log(`[seed] Created ${role} user: ${normalizedEmail}`);
  if (resolved.generated) {
    console.log(`[seed] One-time generated password for ${normalizedEmail}: ${resolved.password}`);
    console.log(`[seed] Set ${envVar} to a strong secret to choose your own password.`);
  } else {
    console.log(`[seed] Password for ${normalizedEmail} was read from ${envVar}.`);
  }
  return user;
}

async function main() {
  const businessName = process.env.BUSINESS_NAME || 'PayFlow';
  const brandName = process.env.BRAND_NAME || 'PayFlow';
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@payflow.local';

  await prisma.setting.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      businessName,
      brandName,
      supportEmail,
      defaultCurrency: 'NGN',
    },
    update: {
      businessName,
      brandName,
      supportEmail,
    },
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL || (isProduction ? '' : 'admin@payflow.local');
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (isProduction && (!adminEmail || !adminPassword)) {
    throw new Error(
      'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required to provision the first admin in production',
    );
  }

  await ensureUser(adminEmail, 'PayFlow Admin', 'ADMIN', adminPassword, 'SEED_ADMIN_PASSWORD', {
    allowGenerated: !isProduction,
  });

  const merchantEmail = process.env.SEED_MERCHANT_EMAIL;
  const merchantPassword = process.env.SEED_MERCHANT_PASSWORD;

  if (isProduction && !merchantEmail) {
    if (merchantPassword) {
      throw new Error('SEED_MERCHANT_EMAIL is required when SEED_MERCHANT_PASSWORD is set');
    }
    console.log('[seed] SEED_MERCHANT_EMAIL not set; skipping merchant provisioning');
  } else if (merchantEmail || !isProduction) {
    if (!merchantEmail && merchantPassword) {
      throw new Error('SEED_MERCHANT_EMAIL is required when SEED_MERCHANT_PASSWORD is set');
    }
    if (merchantEmail && !merchantPassword) {
      throw new Error('SEED_MERCHANT_PASSWORD is required when SEED_MERCHANT_EMAIL is set');
    }

    await ensureUser(
      merchantEmail || 'merchant@payflow.local',
      'PayFlow Merchant',
      'MERCHANT',
      merchantPassword,
      'SEED_MERCHANT_PASSWORD',
      { allowGenerated: !isProduction },
    );
  }

  console.log('[seed] Database seeded');
}

main()
  .catch((error) => {
    console.error('[seed] Failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
