import { SectionTitle } from "@/components/ui/section-title";
import { requirePermission } from "@/lib/auth/access";
import { prisma } from "@/lib/db/prisma";
import { PlaygroundConsole } from "@/components/modules/playground-console";

export default async function PlaygroundPage() {
  const context = await requirePermission("playground.use");

  const [agents, providers, models] = await Promise.all([
    prisma.agent.findMany({
      where: {
        OR: [{ tenantId: context.tenantId }, { scope: "GLOBAL" }],
        status: "ACTIVE",
      },
      select: { id: true, name: true },
      take: 100,
    }),
    prisma.provider.findMany({
      where: {
        OR: [{ tenantId: context.tenantId }, { tenantId: null }],
        status: "ACTIVE",
      },
      select: { id: true, name: true },
      take: 100,
    }),
    prisma.model.findMany({
      where: {
        OR: [{ tenantId: context.tenantId }, { tenantId: null }],
        isActive: true,
      },
      select: { id: true, displayName: true, technicalName: true },
      take: 100,
    }),
  ]);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Playground de IA"
        description="Ambiente interno para simulação de cenários com core engine autônomo, conhecimento local e enriquecimento opcional."
      />
      <PlaygroundConsole agents={agents} providers={providers} models={models} />
    </div>
  );
}

