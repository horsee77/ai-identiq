import { Badge } from "@/components/ui/badge";
import { DataCell } from "@/components/ui/table";
import { ListModule } from "@/components/modules/list-module";
import { SectionTitle } from "@/components/ui/section-title";
import { requirePermission } from "@/lib/auth/access";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function ConversasPage() {
  const context = await requirePermission("conversations.view");

  const conversations = await prisma.conversation.findMany({
    where: { tenantId: context.tenantId },
    include: {
      agent: true,
      provider: true,
      model: true,
      messages: {
        orderBy: { sequence: "asc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Conversas e histórico"
        description="Rastreamento completo de mensagens, custo, contexto efetivo e encaminhamento humano."
      />

      <ListModule
        title="Conversas recentes"
        description="Filtros operacionais para investigação de erros, custo e qualidade da resposta."
        headers={["Canal", "Agente", "Modelo", "Tokens", "Custo", "Status", "Criada em"]}
        hasData={conversations.length > 0}
        emptyTitle="Nenhuma conversa registrada"
        emptyDescription="As interações dos canais aparecerão aqui assim que houver tráfego."
      >
        {conversations.map((conversation) => (
          <tr key={conversation.id}>
            <DataCell>{conversation.channel}</DataCell>
            <DataCell>{conversation.agent?.name ?? "Sem agente"}</DataCell>
            <DataCell>{conversation.model?.displayName ?? "Sem modelo"}</DataCell>
            <DataCell>{(conversation.inputTokens + conversation.outputTokens).toLocaleString("pt-BR")}</DataCell>
            <DataCell>{formatCurrency(Number(conversation.totalCostUsd))}</DataCell>
            <DataCell>
              <Badge
                label={conversation.status}
                variant={conversation.status === "RESOLVED" ? "success" : conversation.status === "FAILED" ? "danger" : "warning"}
              />
            </DataCell>
            <DataCell>{new Date(conversation.createdAt).toLocaleString("pt-BR")}</DataCell>
          </tr>
        ))}
      </ListModule>
    </div>
  );
}

