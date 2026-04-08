import "server-only";
import { prisma } from "@/lib/db/prisma";
import { createProviderFromDatabase } from "@/lib/ai/providers/factory";

export async function runProviderHealthCheck(providerId: string) {
  const provider = await createProviderFromDatabase(providerId);
  const result = await provider.health();

  await prisma.provider.update({
    where: { id: providerId },
    data: {
      healthStatus: result.ok ? "healthy" : "unhealthy",
      status: result.ok ? "ACTIVE" : "DEGRADED",
    },
  });

  return result;
}
