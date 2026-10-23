import { PrismaClient, Role } from '@prisma/client';
import { hash as argonHash } from '@node-rs/argon2';
import { randomBytes } from 'node:crypto';
import 'dotenv/config';

const prisma = new PrismaClient();

function generatePassword(): string {
  return randomBytes(12).toString('base64url');
}

async function ensureUser(
  email: string,
  name: string,
  role: Role,
  password: string | undefined,
  envVar: string,
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return existing;
  }

  const resolvedPassword = password && password.length >= 8 ? password : generatePassword();
  const passwordHash = await argonHash(resolvedPassword, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  const user = await prisma.user.create({
    data: {
      email,
      name,
      role,
      passwordHash,
      isActive: true,
    },
  });

  console.log(`[seed] Created ${role} user: ${email}`);
  console.log(`[seed] Password for ${email}: ${resolvedPassword}`);
  console.log(`[seed] Set ${envVar} or update the password after first login.`);
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

  await ensureUser(
    process.env.SEED_ADMIN_EMAIL || 'admin@payflow.local',
    'PayFlow Admin',
    'ADMIN',
    process.env.SEED_ADMIN_PASSWORD,
    'SEED_ADMIN_PASSWORD',
  );

  await ensureUser(
    process.env.SEED_MERCHANT_EMAIL || 'merchant@payflow.local',
    'PayFlow Merchant',
    'MERCHANT',
    process.env.SEED_MERCHANT_PASSWORD,
    'SEED_MERCHANT_PASSWORD',
  );

  console.log('[seed] Database seeded');
}

main()
  .catch((error) => {
    console.error('[seed] Failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
