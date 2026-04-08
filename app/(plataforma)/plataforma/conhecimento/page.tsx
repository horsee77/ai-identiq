import { Badge } from "@/components/ui/badge";
import { DataCell } from "@/components/ui/table";
import { ListModule } from "@/components/modules/list-module";
import { SectionTitle } from "@/components/ui/section-title";
import { hasPermission, requirePermission } from "@/lib/auth/access";
import { prisma } from "@/lib/db/prisma";
import { KnowledgeTrainingCenter } from "@/components/modules/knowledge-training-center";

export default async function ConhecimentoPage() {
  const context = await requirePermission("knowledge.view");

  const documents = await prisma.knowledgeDocument.findMany({
    where: {
      OR: [{ tenantId: context.tenantId }, { tenantId: null }],
    },
    include: {
      _count: {
        select: {
          chunks: true,
          embeddingJobs: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Base de Conhecimento"
        description="Governança de documentos, políticas e conteúdo operacional para estratégia de treino e RAG."
      />

      <KnowledgeTrainingCenter
        documents={documents.map((document) => ({
          id: document.id,
          title: document.title,
          status: document.status,
          approved: document.approved,
        }))}
        canUpload={hasPermission(context, "knowledge.upload")}
        canApprove={hasPermission(context, "knowledge.approve")}
        canIndex={hasPermission(context, "knowledge.reindex") || hasPermission(context, "embeddings.manage")}
      />

      <ListModule
        title="Documentos e artigos"
        description="Upload, aprovação, versionamento, indexação e visibilidade por tenant."
        headers={["Documento", "Categoria", "Tipo", "Chunks", "Status", "Aprovação"]}
        hasData={documents.length > 0}
        emptyTitle="Nenhum documento cadastrado"
        emptyDescription="Adicione documentos para habilitar respostas contextualizadas com rastreabilidade."
      >
        {documents.map((document) => (
          <tr key={document.id}>
            <DataCell>
              <p className="font-medium text-zinc-900">{document.title}</p>
              <p className="text-xs text-zinc-500">{document.slug}</p>
            </DataCell>
            <DataCell>{document.category}</DataCell>
            <DataCell>{document.fileType}</DataCell>
            <DataCell>{document._count.chunks}</DataCell>
            <DataCell>
              <Badge
                label={document.status}
                variant={document.status === "INDEXED" ? "success" : document.status === "FAILED" ? "danger" : "warning"}
              />
            </DataCell>
            <DataCell>
              <Badge label={document.approved ? "Aprovado" : "Pendente"} variant={document.approved ? "success" : "warning"} />
            </DataCell>
          </tr>
        ))}
      </ListModule>
    </div>
  );
}

