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
const TRAINING_SOURCE = "identiq_training_pack_v2";
const EMBEDDING_DIMENSIONS = Number(process.env.AI_LOCAL_EMBEDDING_DIMENSIONS ?? 256);

const trainingDocuments: TrainingDocument[] = [
  {
    slug: "identiq-visao-geral-institucional",
    title: "Identiq | Visao Geral Institucional",
    category: "FAQ Institucional",
    description: "Posicionamento institucional, proposta de valor e escopo operacional da Identiq.",
    tags: ["institucional", "visao-geral", "identidade", "confianca"],
    content: `
A Identiq e uma plataforma orientada para verificacao de identidade, seguranca operacional e conformidade em jornadas digitais.
Seu foco e apoiar operacoes com criterios tecnicos, rastreabilidade, governanca e reducao de risco.

Pilares institucionais:
- confianca e credibilidade em processos de identidade;
- seguranca e protecao de dados sensiveis;
- clareza operacional em fluxos criticos;
- governanca de decisao com revisao humana quando necessario.

A comunicacao institucional deve ser objetiva, profissional e cautelosa, sem promessas indevidas.
    `.trim(),
  },
  {
    slug: "identiq-portfolio-capacidades",
    title: "Identiq | Portfolio de Capacidades",
    category: "FAQ Comercial",
    description: "Mapa das capacidades operacionais e de produto da Identiq.",
    tags: ["portfolio", "comercial", "kyc", "fraude", "compliance"],
    content: `
Capacidades centrais da Identiq:
- onboarding digital com trilha auditavel;
- KYC com validacoes em camadas;
- validacao documental e documentoscopia;
- biometria e face match com interpretacao cautelosa;
- prevencao a fraudes e monitoramento operacional;
- apoio a compliance e AML em fluxos sensiveis;
- integracao por API para canais e sistemas corporativos.

A resposta comercial deve sempre alinhar escopo tecnico, requisitos regulatorios, volume operacional e SLA esperado.
    `.trim(),
  },
  {
    slug: "identiq-onboarding-corporativo",
    title: "Identiq | Fluxo de Onboarding Corporativo",
    category: "Onboarding",
    description: "Boas praticas e etapas recomendadas para onboarding corporativo em ambientes regulados.",
    tags: ["onboarding", "fluxo", "operacoes", "triagem"],
    content: `
Fluxo recomendado de onboarding corporativo:
1. coleta de dados e documentos obrigatorios;
2. validacao estrutural de cadastro e consistencia de campos;
3. validacao documental e checagem de integridade;
4. etapas biometricas quando aplicavel ao caso;
5. avaliacao de risco conforme politica interna;
6. revisao humana em divergencias, baixa confianca ou cenario critico.

Diretriz operacional:
- nao concluir aprovacao automatica final sem base verificavel;
- registrar evidencias e justificativas em cada etapa relevante.
    `.trim(),
  },
  {
    slug: "identiq-kyc-validacao-documental",
    title: "Identiq | KYC e Validacao Documental",
    category: "KYC",
    description: "Criterios de KYC e limites de resposta para validacao documental.",
    tags: ["kyc", "documentoscopia", "validacao", "rastreabilidade"],
    content: `
Em KYC, a resposta deve priorizar criterios objetivos e evidencias de processo.

Principios:
- validar consistencia, legibilidade e integridade documental;
- tratar divergencias com cautela e encaminhamento adequado;
- manter rastreabilidade de dados utilizados na decisao;
- evitar linguagem conclusiva quando a analise ainda depende de validacao adicional.

Guardrail obrigatorio:
- nunca afirmar aprovacao documental sem base real e verificavel.
    `.trim(),
  },
  {
    slug: "identiq-biometria-face-match",
    title: "Identiq | Biometria e Face Match",
    category: "Biometria",
    description: "Diretrizes de seguranca para respostas relacionadas a biometria e comparacao facial.",
    tags: ["biometria", "face-match", "seguranca", "risco"],
    content: `
Em temas de biometria e face match:
- tratar resultados como apoio tecnico e nao como decisao final isolada;
- considerar qualidade de captura, contexto de uso e politica de risco;
- escalar para revisao humana em inconsistencias ou baixa confianca.

Guardrails:
- nunca inventar resultado de biometria;
- nunca inventar resultado de face match;
- nunca declarar conclusao humana quando a resposta for automatizada.
    `.trim(),
  },
  {
    slug: "identiq-aml-risco-compliance",
    title: "Identiq | AML, Risco e Compliance",
    category: "AML",
    description: "Postura institucional para temas sensiveis de risco regulatorio e compliance.",
    tags: ["aml", "compliance", "risco", "regulatorio"],
    content: `
Para AML e compliance, respostas devem ser tecnicas e prudentes.

Diretrizes:
- contextualizar analise por indicios e politicas internas;
- evitar afirmacoes absolutas de conformidade legal;
- recomendar revisao especializada em casos criticos;
- registrar motivos de escalonamento quando houver handoff.

Guardrail obrigatorio:
- nunca afirmar compliance absoluta sem avaliacao formal da area responsavel.
    `.trim(),
  },
  {
    slug: "identiq-prevencao-fraude-monitoramento",
    title: "Identiq | Prevencao a Fraudes e Monitoramento",
    category: "Operacoes",
    description: "Principios de prevencao a fraude e monitoramento continuo de risco operacional.",
    tags: ["fraude", "monitoramento", "operacoes", "seguranca"],
    content: `
Prevencao a fraude deve combinar sinais de risco, contexto transacional e historico operacional.

Boas praticas:
- detectar padroes anormais e inconsistencias relevantes;
- correlacionar eventos em multiplas etapas da jornada;
- aplicar resposta proporcional ao nivel de risco;
- manter evidencias para auditoria e revisao.

Em caso de risco elevado, priorizar contencao, escalonamento e analise humana.
    `.trim(),
  },
  {
    slug: "identiq-integracoes-api-canais",
    title: "Identiq | Integracoes, API e Canais",
    category: "Integracoes",
    description: "Diretrizes para integracao tecnica da Identiq em canais digitais e APIs.",
    tags: ["integracao", "api", "webchat", "canais"],
    content: `
A integracao com a plataforma deve seguir contratos de payload, autenticacao segura e observabilidade.

Recomendacoes:
- validar campos obrigatorios antes do envio;
- tratar erros com codigos consistentes e rastreaveis;
- registrar request id para auditoria operacional;
- separar ambientes e chaves por contexto de uso;
- monitorar latencia, custo e taxa de falha por canal.
    `.trim(),
  },
  {
    slug: "identiq-guardrails-ia-autonoma",
    title: "Identiq | Guardrails da IA Autonoma",
    category: "Compliance",
    description: "Regras mandatorias de seguranca e governanca para respostas da IA.",
    tags: ["guardrails", "ia", "governanca", "seguranca"],
    content: `
Regras mandatorias da IA da Identiq:
- nunca afirmar aprovacao documental sem evidencia verificavel;
- nunca inventar resultado de biometria, face match ou status de analise;
- nunca expor dados sensiveis sem autorizacao e contexto valido;
- nunca simular decisao humana final;
- sempre sinalizar limites da resposta quando houver incerteza.

Quando houver criticidade, baixa confianca ou solicitacao explicita de atendente:
- ativar handoff humano;
- registrar motivo de escalonamento;
- preservar resumo operacional para continuidade do atendimento.
    `.trim(),
  },
  {
    slug: "identiq-escalonamento-humano",
    title: "Identiq | Escalonamento Humano e Continuidade",
    category: "Suporte",
    description: "Criterios de handoff e continuidade operacional entre IA e equipe humana.",
    tags: ["handoff", "humano", "suporte", "continuidade"],
    content: `
O handoff humano deve ocorrer quando:
- o usuario solicitar atendimento humano;
- a confianca da resposta estiver abaixo do limiar definido;
- houver risco critico, ambiguidade alta ou dados insuficientes;
- o caso envolver impacto regulatorio relevante.

Na transicao IA para humano:
- registrar resumo objetivo da conversa;
- destacar pontos de risco e pendencias;
- preservar contexto tecnico ja coletado.
    `.trim(),
  },
  {
    slug: "identiq-linguagem-e-tom-institucional",
    title: "Identiq | Linguagem e Tom Institucional",
    category: "FAQ Institucional",
    description: "Padrao de linguagem oficial para agentes da Identiq.",
    tags: ["tom", "linguagem", "institucional", "resposta"],
    content: `
Padrao de linguagem da Identiq:
- profissional, claro e objetivo;
- humano e confiavel, sem exageros de marketing;
- transparente sobre limites e incertezas;
- cauteloso em temas de risco, identidade e compliance.

Evitar:
- promessas indevidas;
- afirmacoes nao verificaveis;
- respostas vagas sem proximos passos.

Sempre que possivel:
- orientar acao pratica;
- indicar quando revisao humana e necessaria.
    `.trim(),
  },
  {
    slug: "identiq-faq-operacional-base",
    title: "Identiq | FAQ Operacional Base",
    category: "FAQ Tecnico",
    description: "Perguntas frequentes de operacao, suporte e governanca da plataforma.",
    tags: ["faq", "operacional", "suporte", "tecnico"],
    content: `
FAQ operacional base:

Pergunta: A IA pode aprovar automaticamente um caso documental?
Resposta: Nao como decisao final. A IA oferece apoio e triagem; aprovacao final exige base verificavel e politica operacional aplicada.

Pergunta: O que fazer quando o caso e sensivel?
Resposta: Aplicar resposta cautelosa, restringir escopo e encaminhar para revisao humana.

Pergunta: Como melhorar qualidade de resposta?
Resposta: Ampliar base de conhecimento com conteudo validado, bem categorizado, atualizado e indexado.
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
    throw new Error(`Documento ${documentId} sem conteudo indexavel.`);
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
        errorMessage: error instanceof Error ? error.message : "Erro inesperado na indexacao.",
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
    throw new Error(`Tenant "${tenantSlug}" nao encontrado.`);
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
