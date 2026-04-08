import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataCell, DataTable } from "@/components/ui/table";
import { SectionTitle } from "@/components/ui/section-title";
import { requirePermission } from "@/lib/auth/access";
import { prisma } from "@/lib/db/prisma";

export default async function EmbeddingsPage() {
  const context = await requirePermission("embeddings.view");

  const [jobs, chunks] = await Promise.all([
    prisma.embeddingJob.findMany({
      where: {
        OR: [{ tenantId: context.tenantId }, { tenantId: null }],
      },
      include: { document: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.knowledgeChunk.findMany({
      where: {
        OR: [{ tenantId: context.tenantId }, { tenantId: null }],
      },
      include: { document: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Embeddings e Busca semântica"
        description="Jobs de indexação, inspeção de chunks e rastreabilidade de recuperação semântica."
      />

      <Card title="Jobs de indexação" subtitle="Pipeline de ingestão, chunking e geração de embeddings.">
        <DataTable headers={["Documento", "Modelo", "Chunk size", "Overlap", "Status", "Reprocessamentos"]}>
          {jobs.map((job) => (
            <tr key={job.id}>
              <DataCell>{job.document.title}</DataCell>
              <DataCell>{job.embeddingModel}</DataCell>
              <DataCell>{job.chunkSize}</DataCell>
              <DataCell>{job.overlap}</DataCell>
              <DataCell>
                <Badge label={job.status} variant={job.status === "INDEXED" ? "success" : job.status === "FAILED" ? "danger" : "warning"} />
              </DataCell>
              <DataCell>{job.retries}</DataCell>
            </tr>
          ))}
        </DataTable>
      </Card>

      <Card title="Chunks recentes" subtitle="inspeção de conteúdo indexado para avaliação de recuperação.">
        <DataTable headers={["Documento", "Chunk", "Tokens", "Criado em"]}>
          {chunks.map((chunk) => (
            <tr key={chunk.id}>
              <DataCell>{chunk.document.title}</DataCell>
              <DataCell className="max-w-[560px] truncate">{chunk.content}</DataCell>
              <DataCell>{chunk.tokenCount}</DataCell>
              <DataCell>{new Date(chunk.createdAt).toLocaleString("pt-BR")}</DataCell>
            </tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}

