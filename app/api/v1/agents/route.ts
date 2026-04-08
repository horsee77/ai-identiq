import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { authenticatePublicApiRequest } from "@/lib/api/public-auth";
import { assertRateLimit, assertScope } from "@/lib/api/public-usage";
import { prisma } from "@/lib/db/prisma";

export const GET = withApiHandler(async (request, requestId) => {
  const apiContext = await authenticatePublicApiRequest(request);
  assertRateLimit(`public:${apiContext.apiKeyId}`);
  await assertScope(apiContext.scopes, "agents:read");

  const agents = await prisma.agent.findMany({
    where: {
      status: "ACTIVE",
      OR: [{ tenantId: apiContext.tenantId }, { scope: "GLOBAL" }],
    },
    include: {
      defaultModel: true,
      defaultProvider: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return ok(requestId, {
    object: "list",
    data: agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
      description: agent.description,
      category: agent.category,
      language: agent.defaultLanguage,
      provider: agent.defaultProvider?.name,
      model: agent.defaultModel?.technicalName,
      status: agent.status,
    })),
  });
});
