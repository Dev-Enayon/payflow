import type { Setting } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/prisma';

export const SETTINGS_ID = 'default';

export type PublicSettings = {
  brandName: string;
  businessName: string;
  supportEmail: string;
  website: string | null;
  defaultCurrency: string;
};

export async function getSettings(): Promise<PublicSettings> {
  const setting: Setting | null = await prisma.setting.findUnique({ where: { id: SETTINGS_ID } });
  return {
    brandName: setting?.brandName ?? env.BRAND_NAME,
    businessName: setting?.businessName ?? env.BUSINESS_NAME,
    supportEmail: setting?.supportEmail ?? env.SUPPORT_EMAIL,
    website: setting?.website ?? null,
    defaultCurrency: setting?.defaultCurrency ?? 'NGN',
  };
}

export async function updateSettings(input: {
  brandName: string;
  businessName: string;
  supportEmail: string;
  website?: string | null;
  defaultCurrency: 'NGN';
}): Promise<PublicSettings> {
  const setting = await prisma.setting.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      brandName: input.brandName,
      businessName: input.businessName,
      supportEmail: input.supportEmail,
      website: input.website ?? null,
      defaultCurrency: input.defaultCurrency,
    },
    update: {
      brandName: input.brandName,
      businessName: input.businessName,
      supportEmail: input.supportEmail,
      website: input.website ?? null,
      defaultCurrency: input.defaultCurrency,
    },
  });
  return {
    brandName: setting.brandName,
    businessName: setting.businessName,
    supportEmail: setting.supportEmail,
    website: setting.website,
    defaultCurrency: setting.defaultCurrency,
  };
}
