import "server-only";
import { prisma } from "@/lib/db/prisma";

export async function getSetting(key: string, tenantId?: string) {
  const settings = await prisma.setting.findMany({
    where: {
      key,
      OR: [{ tenantId }, { tenantId: null }],
    },
    orderBy: [{ tenantId: "desc" }, { createdAt: "desc" }],
    take: 1,
  });

  return settings[0] ?? null;
}

export async function isFeatureEnabled(key: string, tenantId?: string) {
  const flag = await prisma.featureFlag.findFirst({
    where: {
      key,
      OR: [{ tenantId }, { tenantId: null }],
      enabled: true,
    },
    orderBy: [{ tenantId: "desc" }, { createdAt: "desc" }],
  });

  return Boolean(flag);
}
