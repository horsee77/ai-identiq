import { PrismaClient } from "@prisma/client";
import { chunkText } from "../lib/knowledge/chunking";

type TrainingDocument = {
  slug: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  content: string;
};

const prisma = new PrismaClient();

const CHUNK_SIZE = 800;
const OVERLAP = 120;
const EMBEDDING_MODEL = "local-embedding-v1";
const TRAINING_SOURCE = "identiq_training_pack_v1";
const EMBEDDING_DIMENSIONS = Number(process.env.AI_LOCAL_EMBEDDING_DIMENSIONS ?? 256);

const trainingDocuments: TrainingDocument[] = [
  {
    slug: "identiq-visao-geral-institucional",
    title: "Identiq | Visão Geral Institucional",
    category: "FAQ Institucional",
    description: "Posicionamento institucional, proposta de valor e escopo operacional da Identiq.",
    tags: ["institucional", "visao-geral", "identidade", "confianca"],
    content: `
A Identiq é uma plataforma orientada para verificação de identidade, segurança operacional e conformidade em jornadas digitais.
Seu foco é apoiar operações com critérios técnicos, rastreabilidade, governança e redução de risco.

Pilares institucionais:
- confiança e credibilidade em processos de identidade;
- segurança e proteção de dados sensíveis;
- clareza operacional em fluxos críticos;
- governança de decisão com revisão humana quando necessário.

A comunicação institucional deve ser objetiva, profissional e cautelosa, sem promessas indevidas.
    `.trim(),
  },
  {
    slug: "identiq-portfolio-capacidades",
    title: "Identiq | Portfólio de Capacidades",
    category: "FAQ Comercial",
    description: "Mapa macro das capacidades operacionais e de produto da Identiq.",
    tags: ["portfolio", "comercial", "kyc", "fraude", "compliance"],
    content: `
Capacidades centrais da Identiq:
- onboarding digital com trilha auditável;
- KYC com validações em camadas;
- validação documental e documentoscopia;
- biometria e face match com interpretação cautelosa;
- prevenção a fraudes e monitoramento operacional;
- apoio a compliance e AML em fluxos sensíveis;
- integração por API para canais e sistemas corporativos.

A resposta comercial deve sempre alinhar escopo técnico, requisitos regulatórios, volume operacional e SLA esperado.
    `.trim(),
  },
  {
    slug: "identiq-onboarding-corporativo",
    title: "Identiq | Fluxo de Onboarding Corporativo",
    category: "Onboarding",
    description: "Boas práticas e etapas recomendadas para onboarding corporativo em ambientes regulados.",
    tags: ["onboarding", "fluxo", "operacoes", "triagem"],
    content: `
Fluxo recomendado de onboarding corporativo:
1. coleta de dados e documentos obrigatórios;
2. validação estrutural de cadastro e consistência de campos;
3. validação documental e checagem de integridade;
4. etapas biométricas quando aplicável ao caso;
5. avaliação de risco conforme política interna;
6. revisão humana em divergências, baixa confiança ou cenário crítico.

Diretriz operacional:
- não concluir aprovação automática final sem base verificável;
- registrar evidências e justificativas em cada etapa relevante.
    `.trim(),
  },
  {
    slug: "identiq-kyc-validacao-documental",
    title: "Identiq | KYC e Validação Documental",
    category: "KYC",
    description: "Critérios de KYC e limites de resposta para validação documental.",
    tags: ["kyc", "documentoscopia", "validacao", "rastreabilidade"],
    content: `
Em KYC, a resposta deve priorizar critérios objetivos e evidências de processo.

Princípios:
- validar consistência, legibilidade e integridade documental;
- tratar divergências com cautela e encaminhamento adequado;
- manter rastreabilidade de dados utilizados na decisão;
- evitar linguagem conclusiva quando a análise ainda depende de validação adicional.

Guardrail obrigatório:
- nunca afirmar aprovação documental sem base real e verificável.
    `.trim(),
  },
  {
    slug: "identiq-biometria-face-match",
    title: "Identiq | Biometria e Face Match",
    category: "Biometria",
    description: "Diretrizes de segurança para respostas relacionadas a biometria e comparação facial.",
    tags: ["biometria", "face-match", "seguranca", "risco"],
    content: `
Em temas de biometria e face match:
- tratar resultados como apoio técnico e não como decisão final isolada;
- considerar qualidade de captura, contexto de uso e política de risco;
- escalar para revisão humana em inconsistências ou baixa confiança.

Guardrails:
- nunca inventar resultado de biometria;
- nunca inventar resultado de face match;
- nunca declarar conclusão humana quando a resposta for automatizada.
    `.trim(),
  },
  {
    slug: "identiq-aml-risco-compliance",
    title: "Identiq | AML, Risco e Compliance",
    category: "AML",
    description: "Postura institucional para temas sensíveis de risco regulatório e compliance.",
    tags: ["aml", "compliance", "risco", "regulatorio"],
    content: `
Para AML e compliance, respostas devem ser técnicas e prudentes.

Diretrizes:
- contextualizar análise por indícios e políticas internas;
- evitar afirmações absolutas de conformidade legal;
- recomendar revisão especializada em casos críticos;
- registrar motivos de escalonamento quando houver handoff.

Guardrail obrigatório:
- nunca afirmar compliance absoluta sem avaliação formal da área responsável.
    `.trim(),
  },
  {
    slug: "identiq-prevencao-fraude-monitoramento",
    title: "Identiq | Prevenção a Fraudes e Monitoramento",
    category: "Operações",
    description: "Princípios de prevenção a fraude e monitoramento contínuo de risco operacional.",
    tags: ["fraude", "monitoramento", "operacoes", "seguranca"],
    content: `
Prevenção a fraude deve combinar sinais de risco, contexto transacional e histórico operacional.

Boas práticas:
- detectar padrões anômalos e inconsistências relevantes;
- correlacionar eventos em múltiplas etapas da jornada;
- aplicar resposta proporcional ao nível de risco;
- manter evidências para auditoria e revisão.

Em caso de risco elevado, priorizar contenção, escalonamento e análise humana.
    `.trim(),
  },
  {
    slug: "identiq-integracoes-api-canais",
    title: "Identiq | Integrações, API e Canais",
    category: "Integrações",
    description: "Diretrizes para integração técnica da Identiq em canais digitais e APIs.",
    tags: ["integracao", "api", "webchat", "canais"],
    content: `
A integração com a plataforma deve seguir contratos de payload, autenticação segura e observabilidade.

Recomendações:
- validar campos obrigatórios antes do envio;
- tratar erros com códigos consistentes e rastreáveis;
- registrar request id para auditoria operacional;
- separar ambientes e chaves por contexto de uso;
- monitorar latência, custo e taxa de falha por canal.
    `.trim(),
  },
  {
    slug: "identiq-guardrails-ia-autonoma",
    title: "Identiq | Guardrails da IA Autônoma",
    category: "Compliance",
    description: "Regras mandatórias de segurança e governança para respostas da IA.",
    tags: ["guardrails", "ia", "governanca", "seguranca"],
    content: `
Regras mandatórias da IA da Identiq:
- nunca afirmar aprovação documental sem evidência verificável;
- nunca inventar resultado de biometria, face match ou status de análise;
- nunca expor dados sensíveis sem autorização e contexto válido;
- nunca simular decisão humana final;
- sempre sinalizar limites da resposta quando houver incerteza.

Quando houver criticidade, baixa confiança ou solicitação explícita de atendente:
- ativar handoff humano;
- registrar motivo de escalonamento;
- preservar resumo operacional para continuidade do atendimento.
    `.trim(),
  },
  {
    slug: "identiq-escalonamento-humano",
    title: "Identiq | Escalonamento Humano e Continuidade",
    category: "Suporte",
    description: "Critérios de handoff e continuidade operacional entre IA e equipe humana.",
    tags: ["handoff", "humano", "suporte", "continuidade"],
    content: `
O handoff humano deve ocorrer quando:
- o usuário solicitar atendimento humano;
- a confiança da resposta estiver abaixo do limiar definido;
- houver risco crítico, ambiguidade alta ou dados insuficientes;
- o caso envolver impacto regulatório relevante.

Na transição IA -> humano:
- registrar resumo objetivo da conversa;
- destacar pontos de risco e pendências;
- preservar contexto técnico já coletado.
    `.trim(),
  },
  {
    slug: "identiq-linguagem-e-tom-institucional",
    title: "Identiq | Linguagem e Tom Institucional",
    category: "FAQ Institucional",
    description: "Padrão de linguagem oficial para agentes da Identiq.",
    tags: ["tom", "linguagem", "institucional", "resposta"],
    content: `
Padrão de linguagem da Identiq:
- profissional, claro e objetivo;
- humano e confiável, sem exageros de marketing;
- transparente sobre limites e incertezas;
- cauteloso em temas de risco, identidade e compliance.

Evitar:
- promessas indevidas;
- afirmações não verificáveis;
- respostas vagas sem próximos passos.

Sempre que possível:
- orientar ação prática;
- indicar quando revisão humana é necessária.
    `.trim(),
  },
  {
    slug: "identiq-faq-operacional-base",
    title: "Identiq | FAQ Operacional Base",
    category: "FAQ Técnico",
    description: "Perguntas frequentes de operação, suporte e governança da plataforma.",
    tags: ["faq", "operacional", "suporte", "tecnico"],
    content: `
FAQ operacional base:

Pergunta: A IA pode aprovar automaticamente um caso documental?
Resposta: Não como decisão final. A IA oferece apoio e triagem; aprovação final exige base verificável e política operacional aplicada.

Pergunta: O que fazer quando o caso é sensível?
Resposta: Aplicar resposta cautelosa, restringir escopo e encaminhar para revisão humana.

Pergunta: Como melhorar qualidade de resposta?
Resposta: Ampliar base de conhecimento com conteúdo validado, bem categorizado, atualizado e indexado.
    `.trim(),
  },
];

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fnv1a32(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function normalizeVector(vector: number[]) {
  const magnitude = Math.sqrt(vector.reduce((acc, value) => acc + value * value, 0));
  if (!magnitude) {
    return vector;
  }
  return vector.map((value) => value / magnitude);
}

function generateLocalEmbedding(text: string, dimensions = EMBEDDING_DIMENSIONS) {
  const vector = Array.from({ length: dimensions }, () => 0);
  const tokens = normalizeText(text)
    .split(" ")
    .filter((token) => token.length > 1);

  for (const token of tokens) {
    const hash = fnv1a32(token);
    const index = hash % dimensions;
    const sign = (hash & 1) === 0 ? 1 : -1;
    const weight = 1 + Math.log10(token.length + 1);
    vector[index] += sign * weight;
  }

  return normalizeVector(vector);
}

function generateLocalEmbeddings(input: string[]) {
  return input.map((text) => generateLocalEmbedding(text));
}

async function indexDocumentLocally({
  tenantId,
  documentId,
  text,
}: {
  tenantId: string;
  documentId: string;
  text: string;
}) {
  const chunks = chunkText(text, {
    chunkSize: CHUNK_SIZE,
    overlap: OVERLAP,
  });

  if (!chunks.length) {
    throw new Error(`Documento ${documentId} sem conteúdo indexável.`);
  }

  const embeddings = generateLocalEmbeddings(chunks);

  const job = await prisma.embeddingJob.create({
    data: {
      tenantId,
      documentId,
      status: "PROCESSING",
      chunkSize: CHUNK_SIZE,
      overlap: OVERLAP,
      embeddingModel: EMBEDDING_MODEL,
      strategy: "local_embeddings",
      startedAt: new Date(),
    },
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.knowledgeChunk.deleteMany({
        where: { documentId },
      });

      for (const [index, chunk] of chunks.entries()) {
        await tx.knowledgeChunk.create({
          data: {
            tenantId,
            documentId,
            chunkIndex: index,
            content: chunk,
            tokenCount: chunk.split(/\s+/g).length,
            embedding: embeddings[index] ?? [],
          },
        });
      }

      await tx.knowledgeDocument.update({
        where: { id: documentId },
        data: {
          status: "INDEXED",
          indexedAt: new Date(),
        },
      });

      await tx.embeddingJob.update({
        where: { id: job.id },
        data: {
          status: "INDEXED",
          finishedAt: new Date(),
        },
      });
    });

    return {
      chunks: chunks.length,
      strategy: "local_embeddings",
    };
  } catch (error) {
    await prisma.embeddingJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Erro inesperado na indexação.",
        finishedAt: new Date(),
      },
    });

    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: {
        status: "FAILED",
      },
    });

    throw error;
  }
}

async function upsertTrainingDocument({
  tenantId,
  uploadedById,
  document,
}: {
  tenantId: string;
  uploadedById?: string;
  document: TrainingDocument;
}) {
  const existing = await prisma.knowledgeDocument.findFirst({
    where: {
      tenantId,
      slug: document.slug,
    },
    select: {
      id: true,
      version: true,
    },
  });

  if (existing) {
    const updated = await prisma.knowledgeDocument.update({
      where: { id: existing.id },
      data: {
        title: document.title,
        category: document.category,
        description: document.description,
        tags: document.tags,
        rawContent: document.content,
        processedContent: document.content,
        fileType: "text/manual",
        fileSize: document.content.length,
        language: "pt-BR",
        status: "APPROVED",
        visibility: "TENANT",
        approved: true,
        sensitivity: "INTERNAL",
        source: TRAINING_SOURCE,
        uploadedById,
        publishedAt: new Date(),
        deletedAt: null,
        version: existing.version + 1,
      },
    });

    return { id: updated.id, action: "updated" as const };
  }

  const created = await prisma.knowledgeDocument.create({
    data: {
      tenantId,
      title: document.title,
      slug: document.slug,
      category: document.category,
      description: document.description,
      tags: document.tags,
      rawContent: document.content,
      processedContent: document.content,
      fileType: "text/manual",
      fileSize: document.content.length,
      language: "pt-BR",
      status: "APPROVED",
      version: 1,
      source: TRAINING_SOURCE,
      visibility: "TENANT",
      approved: true,
      sensitivity: "INTERNAL",
      uploadedById,
      publishedAt: new Date(),
    },
  });

  return { id: created.id, action: "created" as const };
}

async function main() {
  const tenantSlug = process.env.TRAIN_TENANT_SLUG ?? "identiq-corporativo";
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: {
      id: true,
      slug: true,
      memberships: {
        where: { status: "ACTIVE" },
        select: {
          userId: true,
        },
        take: 1,
      },
    },
  });

  if (!tenant) {
    throw new Error(`Tenant "${tenantSlug}" não encontrado.`);
  }

  const uploadedById = tenant.memberships[0]?.userId;
  const summary: Array<{
    slug: string;
    title: string;
    action: "created" | "updated";
    chunks: number;
    strategy: string;
  }> = [];

  for (const document of trainingDocuments) {
    const upsert = await upsertTrainingDocument({
      tenantId: tenant.id,
      uploadedById,
      document,
    });

    const indexing = await indexDocumentLocally({
      tenantId: tenant.id,
      documentId: upsert.id,
      text: document.content,
    });

    summary.push({
      slug: document.slug,
      title: document.title,
      action: upsert.action,
      chunks: indexing.chunks,
      strategy: indexing.strategy,
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      userId: uploadedById,
      action: "knowledge.training_pack_applied",
      entityType: "KnowledgeDocument",
      severity: "HIGH",
      message: `Pacote institucional de treinamento da Identiq aplicado (${trainingDocuments.length} documentos).`,
      metadata: {
        source: TRAINING_SOURCE,
        embeddingModel: EMBEDDING_MODEL,
        chunkSize: CHUNK_SIZE,
        overlap: OVERLAP,
        documents: summary.map((item) => ({
          slug: item.slug,
          action: item.action,
          chunks: item.chunks,
        })),
      },
    },
  });

  console.log(
    JSON.stringify(
      {
        tenant: tenant.slug,
        source: TRAINING_SOURCE,
        totalDocuments: summary.length,
        results: summary,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
