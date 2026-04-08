import { createCipheriv, createHash, randomBytes } from "crypto";
import { PrismaClient, RoleCode, PermissionAction } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const permissionKeys = [
  "dashboard.view",
  "tenants.view",
  "tenants.manage",
  "users.view",
  "users.create",
  "users.update",
  "users.delete",
  "roles.view",
  "roles.manage",
  "providers.view",
  "providers.manage",
  "models.view",
  "models.manage",
  "agents.view",
  "agents.create",
  "agents.update",
  "agents.publish",
  "prompts.view",
  "prompts.manage",
  "knowledge.view",
  "knowledge.upload",
  "knowledge.approve",
  "knowledge.reindex",
  "embeddings.view",
  "embeddings.manage",
  "conversations.view",
  "conversations.export",
  "tools.view",
  "tools.manage",
  "apikeys.view",
  "apikeys.create",
  "apikeys.revoke",
  "billing.view",
  "billing.manage",
  "analytics.view",
  "audit.view",
  "logs.sensitive.view",
  "playground.use",
  "settings.manage",
  "features.manage",
  "api.public.use",
] as const;

const rolePermissionMap: Record<RoleCode, string[]> = {
  MASTER_ADMIN: [...permissionKeys],
  ADMIN: [
    "dashboard.view",
    "tenants.view",
    "users.view",
    "users.create",
    "users.update",
    "roles.view",
    "providers.view",
    "providers.manage",
    "models.view",
    "models.manage",
    "agents.view",
    "agents.create",
    "agents.update",
    "agents.publish",
    "prompts.view",
    "prompts.manage",
    "knowledge.view",
    "knowledge.upload",
    "knowledge.approve",
    "knowledge.reindex",
    "embeddings.view",
    "embeddings.manage",
    "conversations.view",
    "tools.view",
    "tools.manage",
    "apikeys.view",
    "apikeys.create",
    "apikeys.revoke",
    "billing.view",
    "analytics.view",
    "audit.view",
    "playground.use",
  ],
  MANAGER: [
    "dashboard.view",
    "users.view",
    "agents.view",
    "agents.create",
    "agents.update",
    "prompts.view",
    "prompts.manage",
    "knowledge.view",
    "knowledge.upload",
    "embeddings.view",
    "conversations.view",
    "tools.view",
    "tools.manage",
    "apikeys.view",
    "billing.view",
    "analytics.view",
    "playground.use",
  ],
  ANALYST: [
    "dashboard.view",
    "agents.view",
    "prompts.view",
    "knowledge.view",
    "knowledge.upload",
    "embeddings.view",
    "conversations.view",
    "tools.view",
    "analytics.view",
    "playground.use",
  ],
  SUPPORT: [
    "dashboard.view",
    "agents.view",
    "knowledge.view",
    "conversations.view",
    "tools.view",
    "playground.use",
  ],
  VIEWER: [
    "dashboard.view",
    "agents.view",
    "knowledge.view",
    "conversations.view",
    "analytics.view",
  ],
};

function parsePermissionAction(rawAction: string): PermissionAction {
  const normalized = rawAction.toLowerCase();

  const mapping: Record<string, PermissionAction> = {
    view: "VIEW",
    create: "CREATE",
    update: "UPDATE",
    delete: "DELETE",
    publish: "PUBLISH",
    approve: "APPROVE",
    reindex: "REINDEX",
    manage: "MANAGE",
    export: "EXPORT",
    execute: "EXECUTE",
    upload: "CREATE",
    use: "EXECUTE",
  };

  return mapping[normalized] ?? "MANAGE";
}
function encryptSecret(value: string) {
  const secret = process.env.ENCRYPTION_KEY ?? "identiq-dev-secret-key-change-me";
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function hashApiKey(rawKey: string) {
  return createHash("sha256").update(rawKey).digest("hex");
}

async function main() {
  const masterEmail = process.env.MASTER_SEED_EMAIL ?? "master@identiq.ai";
  const masterPassword = process.env.MASTER_SEED_PASSWORD ?? "Identiq@123456";

  const planEnterprise = await prisma.plan.upsert({
    where: { slug: "enterprise" },
    update: {
      status: "ACTIVE",
      maxUsers: 300,
      maxAgents: 150,
      maxDocuments: 100000,
      monthlyTokenLimit: 25000000,
      monthlyCostLimitUsd: 50000,
      requestPerMinuteLimit: 2500,
    },
    create: {
      name: "Enterprise",
      slug: "enterprise",
      status: "ACTIVE",
      description: "Plano corporativo com Governança avançada.",
      maxUsers: 300,
      maxAgents: 150,
      maxDocuments: 100000,
      monthlyTokenLimit: 25000000,
      monthlyCostLimitUsd: 50000,
      requestPerMinuteLimit: 2500,
    },
  });

  const planGrowth = await prisma.plan.upsert({
    where: { slug: "growth" },
    update: {},
    create: {
      name: "Growth",
      slug: "growth",
      status: "ACTIVE",
      description: "Plano para operação em expansão.",
      maxUsers: 80,
      maxAgents: 50,
      maxDocuments: 20000,
      monthlyTokenLimit: 4000000,
      monthlyCostLimitUsd: 8000,
      requestPerMinuteLimit: 600,
    },
  });

  const roles = await Promise.all(
    Object.values(RoleCode).map((code) =>
      prisma.role.upsert({
        where: { code },
        update: {
          name: code,
          isSystem: true,
        },
        create: {
          code,
          name: code,
          isSystem: true,
          description: `Perfil ${code} da plataforma Identiq.`,
        },
      })
    )
  );

  const permissions = await Promise.all(
    permissionKeys.map((key) => {
      const [module, action] = key.split(".");
      const permissionAction = parsePermissionAction(action ?? "manage");
      return prisma.permission.upsert({
        where: { key },
        update: {
          module,
          action: permissionAction,
        },
        create: {
          key,
          module,
          action: permissionAction,
          description: `permissão ${key}`,
        },
      });
    })
  );

  for (const role of roles) {
    const desiredPermissions = rolePermissionMap[role.code];
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    for (const key of desiredPermissions) {
      const permission = permissions.find((entry) => entry.key === key);
      if (!permission) continue;

      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  const tenantIdentiq = await prisma.tenant.upsert({
    where: { slug: "identiq-corporativo" },
    update: {
      name: "Identiq Corporativo",
      status: "ACTIVE",
      planId: planEnterprise.id,
      settings: {
        language: "pt-BR",
        timezone: "America/Sao_Paulo",
      },
      limits: {
        users: 300,
        agents: 150,
        documents: 100000,
        monthlyTokens: 25000000,
        monthlyCostUsd: 50000,
      },
      branding: {
        primary: "#111111",
        secondary: "#f4f4f5",
      },
    },
    create: {
      name: "Identiq Corporativo",
      slug: "identiq-corporativo",
      status: "ACTIVE",
      planId: planEnterprise.id,
      settings: {
        language: "pt-BR",
        timezone: "America/Sao_Paulo",
      },
      limits: {
        users: 300,
        agents: 150,
        documents: 100000,
        monthlyTokens: 25000000,
        monthlyCostUsd: 50000,
      },
      branding: {
        primary: "#111111",
        secondary: "#f4f4f5",
      },
    },
  });

  const tenantDemo = await prisma.tenant.upsert({
    where: { slug: "tenant-demo-financeiro" },
    update: {
      name: "Tenant Demo Financeiro",
      status: "ACTIVE",
      planId: planGrowth.id,
    },
    create: {
      name: "Tenant Demo Financeiro",
      slug: "tenant-demo-financeiro",
      status: "ACTIVE",
      planId: planGrowth.id,
    },
  });

  await prisma.subscription.upsert({
    where: { id: `${tenantIdentiq.id}-sub` },
    update: {
      status: "ACTIVE",
      planId: planEnterprise.id,
      tenantId: tenantIdentiq.id,
    },
    create: {
      id: `${tenantIdentiq.id}-sub`,
      tenantId: tenantIdentiq.id,
      planId: planEnterprise.id,
      status: "ACTIVE",
      startsAt: new Date(),
    },
  });

  await prisma.subscription.upsert({
    where: { id: `${tenantDemo.id}-sub` },
    update: {
      status: "TRIAL",
      planId: planGrowth.id,
      tenantId: tenantDemo.id,
    },
    create: {
      id: `${tenantDemo.id}-sub`,
      tenantId: tenantDemo.id,
      planId: planGrowth.id,
      status: "TRIAL",
      startsAt: new Date(),
      trialEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
    },
  });

  const masterRole = roles.find((entry) => entry.code === "MASTER_ADMIN");
  if (!masterRole) {
    throw new Error("Role MASTER_ADMIN não encontrada");
  }

  const master = await prisma.user.upsert({
    where: { email: masterEmail.toLowerCase() },
    update: {
      fullName: "Master Administrator Identiq",
      status: "ACTIVE",
      passwordHash: await bcrypt.hash(masterPassword, 12),
    },
    create: {
      email: masterEmail.toLowerCase(),
      fullName: "Master Administrator Identiq",
      status: "ACTIVE",
      passwordHash: await bcrypt.hash(masterPassword, 12),
      memberships: {
        create: [
          {
            tenantId: tenantIdentiq.id,
            roleId: masterRole.id,
            status: "ACTIVE",
            isDefault: true,
          },
          {
            tenantId: tenantDemo.id,
            roleId: masterRole.id,
            status: "ACTIVE",
            isDefault: false,
          },
        ],
      },
    },
    include: {
      memberships: true,
    },
  });

  const provider = await prisma.provider.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenantIdentiq.id,
        slug: "openai-default",
      },
    },
    update: {
      name: "OpenAI Principal",
      type: "OPENAI",
      baseUrl: "https://api.openai.com/v1",
      apiKeyEncrypted: encryptSecret(process.env.OPENAI_API_KEY ?? "sk-demo-key"),
      apiKeyHint: "****demo",
      supportsChat: true,
      supportsResponses: true,
      supportsEmbeddings: true,
      supportsTools: true,
      supportsStreaming: true,
      healthStatus: "healthy",
      status: "ACTIVE",
      priority: 1,
    },
    create: {
      tenantId: tenantIdentiq.id,
      name: "OpenAI Principal",
      slug: "openai-default",
      type: "OPENAI",
      baseUrl: "https://api.openai.com/v1",
      apiKeyEncrypted: encryptSecret(process.env.OPENAI_API_KEY ?? "sk-demo-key"),
      apiKeyHint: "****demo",
      authType: "BEARER",
      supportsChat: true,
      supportsResponses: true,
      supportsEmbeddings: true,
      supportsTools: true,
      supportsStreaming: true,
      supportsMultimodal: false,
      healthStatus: "healthy",
      status: "ACTIVE",
      priority: 1,
    },
  });

  const modelChat = await prisma.model.upsert({
    where: {
      providerId_technicalName: {
        providerId: provider.id,
        technicalName: "gpt-4.1-mini",
      },
    },
    update: {
      tenantId: tenantIdentiq.id,
      displayName: "GPT 4.1 Mini",
      slug: "gpt-4-1-mini",
      category: "CHAT",
      isActive: true,
      isDefault: true,
      maxContextTokens: 128000,
      maxOutputTokens: 16384,
      inputCostPer1kUsd: 0.0008,
      outputCostPer1kUsd: 0.0024,
      supportsTools: true,
      supportsStreaming: true,
      supportsReasoning: false,
      supportsEmbeddings: false,
    },
    create: {
      tenantId: tenantIdentiq.id,
      providerId: provider.id,
      technicalName: "gpt-4.1-mini",
      displayName: "GPT 4.1 Mini",
      slug: "gpt-4-1-mini",
      category: "CHAT",
      isActive: true,
      isDefault: true,
      maxContextTokens: 128000,
      maxOutputTokens: 16384,
      inputCostPer1kUsd: 0.0008,
      outputCostPer1kUsd: 0.0024,
      supportsTools: true,
      supportsStreaming: true,
      supportsReasoning: false,
      supportsEmbeddings: false,
    },
  });

  const modelEmbedding = await prisma.model.upsert({
    where: {
      providerId_technicalName: {
        providerId: provider.id,
        technicalName: "text-embedding-3-large",
      },
    },
    update: {
      tenantId: tenantIdentiq.id,
      displayName: "Embedding Large",
      slug: "text-embedding-3-large",
      category: "EMBEDDING",
      isActive: true,
      isDefault: false,
      maxContextTokens: 8192,
      maxOutputTokens: 0,
      inputCostPer1kUsd: 0.00013,
      outputCostPer1kUsd: 0,
      supportsTools: false,
      supportsStreaming: false,
      supportsReasoning: false,
      supportsEmbeddings: true,
    },
    create: {
      tenantId: tenantIdentiq.id,
      providerId: provider.id,
      technicalName: "text-embedding-3-large",
      displayName: "Embedding Large",
      slug: "text-embedding-3-large",
      category: "EMBEDDING",
      isActive: true,
      isDefault: false,
      maxContextTokens: 8192,
      maxOutputTokens: 0,
      inputCostPer1kUsd: 0.00013,
      outputCostPer1kUsd: 0,
      supportsTools: false,
      supportsStreaming: false,
      supportsReasoning: false,
      supportsEmbeddings: true,
    },
  });

  const tools = [
    {
      name: "Buscar na Base",
      slug: "buscar-base-conhecimento",
      description: "Executa busca semântica em documentos indexados",
    },
    {
      name: "Registrar Lead",
      slug: "registrar-lead",
      description: "Registra interesse comercial em CRM interno",
    },
    {
      name: "Consultar Status Onboarding",
      slug: "consultar-status-onboarding",
      description: "Consulta estado do onboarding e validações",
    },
    {
      name: "Encaminhar para Atendimento Humano",
      slug: "handoff-humano",
      description: "Encaminha caso sensível para analista",
    },
  ];

  const toolRecords = [] as { id: string; slug: string }[];
  for (const tool of tools) {
    const created = await prisma.toolDefinition.upsert({
      where: {
        tenantId_slug: {
          tenantId: tenantIdentiq.id,
          slug: tool.slug,
        },
      },
      update: {
        name: tool.name,
        description: tool.description,
        status: "ACTIVE",
        inputSchema: {
          type: "object",
          properties: { query: { type: "string" } },
        },
        outputSchema: {
          type: "object",
          properties: { result: { type: "string" } },
        },
      },
      create: {
        tenantId: tenantIdentiq.id,
        name: tool.name,
        slug: tool.slug,
        description: tool.description,
        timeoutMs: 15000,
        status: "ACTIVE",
        inputSchema: {
          type: "object",
          properties: { query: { type: "string" } },
        },
        outputSchema: {
          type: "object",
          properties: { result: { type: "string" } },
        },
      },
    });

    toolRecords.push({ id: created.id, slug: created.slug });
  }

  const agents = [
    {
      name: "Agente Comercial",
      slug: "agente-comercial",
      category: "comercial",
      objective: "Apoiar conversões com postura institucional da Identiq.",
    },
    {
      name: "Agente de Suporte",
      slug: "agente-suporte",
      category: "suporte",
      objective: "Resolver dúvidas operacionais e técnicas com clareza.",
    },
    {
      name: "Agente de Onboarding/KYC",
      slug: "agente-onboarding-kyc",
      category: "kyc",
      objective: "Apoiar fluxos de onboarding sem prometer decisões automatizadas.",
    },
    {
      name: "Agente de Compliance",
      slug: "agente-compliance",
      category: "compliance",
      objective: "Oferecer orientação de compliance com cautela regulatória.",
    },
    {
      name: "Agente Técnico",
      slug: "agente-tecnico",
      category: "tecnico",
      objective: "Ajudar integrações API e troubleshooting avançado.",
    },
    {
      name: "Agente FAQ Institucional",
      slug: "agente-faq-institucional",
      category: "faq",
      objective: "Responder perguntas institucionais da Identiq.",
    },
    {
      name: "Agente Operacional Interno",
      slug: "agente-operacional-interno",
      category: "operacao",
      objective: "Apoiar rotinas internas e playbooks operacionais.",
    },
  ];

  for (const agentPayload of agents) {
    const agent = await prisma.agent.upsert({
      where: {
        tenantId_slug: {
          tenantId: tenantIdentiq.id,
          slug: agentPayload.slug,
        },
      },
      update: {
        name: agentPayload.name,
        category: agentPayload.category,
        objective: agentPayload.objective,
        status: "ACTIVE",
        scope: "TENANT",
        defaultModelId: modelChat.id,
        defaultProviderId: provider.id,
        temperature: 0.2,
        maxTokens: 1200,
        systemPrompt:
          "Você é um agente da Identiq. Seja profissional, claro, objetivo e nunca invente resultados de análise documental, biometria ou compliance.",
        rigidInstructions:
          "Em cenários críticos, escale para humano e sinalize limites da automação.",
        prohibitiveRules:
          "Proibido afirmar aprovação/reprovação de documentos sem base de sistema.",
        securityPolicies: {
          maskSensitiveData: true,
          enforceGuardrails: true,
        },
      },
      create: {
        tenantId: tenantIdentiq.id,
        name: agentPayload.name,
        slug: agentPayload.slug,
        description: agentPayload.objective,
        objective: agentPayload.objective,
        category: agentPayload.category,
        defaultLanguage: "pt-BR",
        systemPrompt:
          "Você é um agente da Identiq. Seja profissional, claro, objetivo e nunca invente resultados de análise documental, biometria ou compliance.",
        rigidInstructions:
          "Em cenários críticos, escale para humano e sinalize limites da automação.",
        prohibitiveRules:
          "Proibido afirmar aprovação/reprovação de documentos sem base de sistema.",
        fallbackBehavior: "Quando houver baixa confiança, responder com cautela e abrir handoff.",
        defaultModelId: modelChat.id,
        defaultProviderId: provider.id,
        temperature: 0.2,
        topP: 1,
        maxTokens: 1200,
        status: "ACTIVE",
        scope: "TENANT",
        publishedAt: new Date(),
        securityPolicies: {
          maskSensitiveData: true,
          enforceGuardrails: true,
        },
      },
    });

    await prisma.agentVersion.upsert({
      where: { agentId_version: { agentId: agent.id, version: 1 } },
      update: {
        snapshot: {
          objective: agent.objective,
          category: agent.category,
          systemPrompt: agent.systemPrompt,
        },
      },
      create: {
        agentId: agent.id,
        version: 1,
        changelog: "Versão inicial seeded",
        createdById: master.id,
        snapshot: {
          objective: agent.objective,
          category: agent.category,
          systemPrompt: agent.systemPrompt,
        },
      },
    });

    for (const tool of toolRecords.slice(0, 2)) {
      await prisma.agentTool.upsert({
        where: {
          agentId_toolId: {
            agentId: agent.id,
            toolId: tool.id,
          },
        },
        update: {},
        create: {
          agentId: agent.id,
          toolId: tool.id,
        },
      });
    }

    const prompt = await prisma.prompt.upsert({
      where: {
        tenantId_slug: {
          tenantId: tenantIdentiq.id,
          slug: `prompt-${agent.slug}`,
        },
      },
      update: {
        name: `Prompt ${agent.name}`,
        type: "SYSTEM",
        scope: "TENANT",
        status: "PUBLISHED",
        agentId: agent.id,
      },
      create: {
        tenantId: tenantIdentiq.id,
        agentId: agent.id,
        name: `Prompt ${agent.name}`,
        slug: `prompt-${agent.slug}`,
        type: "SYSTEM",
        scope: "TENANT",
        status: "PUBLISHED",
      },
    });

    const version = await prisma.promptVersion.upsert({
      where: {
        promptId_version: {
          promptId: prompt.id,
          version: 1,
        },
      },
      update: {
        content:
          "Atue de forma institucional, sem promessas indevidas, com transparência sobre limites da automação e foco em segurança.",
        status: "PUBLISHED",
        authorId: master.id,
        publishedAt: new Date(),
      },
      create: {
        promptId: prompt.id,
        version: 1,
        content:
          "Atue de forma institucional, sem promessas indevidas, com transparência sobre limites da automação e foco em segurança.",
        status: "PUBLISHED",
        authorId: master.id,
        publishedAt: new Date(),
      },
    });

    await prisma.prompt.update({
      where: { id: prompt.id },
      data: {
        activeVersionId: version.id,
      },
    });
  }

  const document = await prisma.knowledgeDocument.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenantIdentiq.id,
        slug: "politica-kyc-interna-v1",
      },
    },
    update: {
      title: "política Interna de KYC",
      category: "KYC",
      status: "INDEXED",
      approved: true,
      rawContent:
        "A política de KYC da Identiq determina validação documental, biometria e avaliação de risco em camadas.",
      processedContent:
        "A política de KYC da Identiq determina validação documental, biometria e avaliação de risco em camadas.",
      fileType: "text/manual",
      fileSize: 132,
      language: "pt-BR",
      uploadedById: master.id,
      source: "seed",
      indexedAt: new Date(),
      publishedAt: new Date(),
    },
    create: {
      tenantId: tenantIdentiq.id,
      title: "política Interna de KYC",
      slug: "politica-kyc-interna-v1",
      category: "KYC",
      description: "Diretrizes institucionais de validação e risco",
      tags: ["KYC", "compliance", "onboarding"],
      rawContent:
        "A política de KYC da Identiq determina validação documental, biometria e avaliação de risco em camadas.",
      processedContent:
        "A política de KYC da Identiq determina validação documental, biometria e avaliação de risco em camadas.",
      fileType: "text/manual",
      fileSize: 132,
      language: "pt-BR",
      status: "INDEXED",
      approved: true,
      uploadedById: master.id,
      source: "seed",
      indexedAt: new Date(),
      publishedAt: new Date(),
    },
  });

  await prisma.embeddingJob.upsert({
    where: { id: `${document.id}-job` },
    update: {
      status: "INDEXED",
      embeddingModel: modelEmbedding.technicalName,
      chunkSize: 800,
      overlap: 120,
      startedAt: new Date(),
      finishedAt: new Date(),
    },
    create: {
      id: `${document.id}-job`,
      tenantId: tenantIdentiq.id,
      documentId: document.id,
      status: "INDEXED",
      embeddingModel: modelEmbedding.technicalName,
      chunkSize: 800,
      overlap: 120,
      startedAt: new Date(),
      finishedAt: new Date(),
    },
  });

  await prisma.knowledgeChunk.upsert({
    where: {
      documentId_chunkIndex: {
        documentId: document.id,
        chunkIndex: 0,
      },
    },
    update: {
      tenantId: tenantIdentiq.id,
      content:
        "A política de KYC da Identiq determina validação documental, biometria e avaliação de risco em camadas.",
      tokenCount: 20,
      embedding: [0.12, 0.08, 0.65, 0.43, 0.17, 0.55, 0.02, 0.91],
    },
    create: {
      tenantId: tenantIdentiq.id,
      documentId: document.id,
      chunkIndex: 0,
      content:
        "A política de KYC da Identiq determina validação documental, biometria e avaliação de risco em camadas.",
      tokenCount: 20,
      embedding: [0.12, 0.08, 0.65, 0.43, 0.17, 0.55, 0.02, 0.91],
    },
  });

  const agentsForMapping = await prisma.agent.findMany({
    where: { tenantId: tenantIdentiq.id },
    take: 3,
  });

  for (const agent of agentsForMapping) {
    await prisma.agentKnowledge.upsert({
      where: {
        agentId_documentId: {
          agentId: agent.id,
          documentId: document.id,
        },
      },
      update: {},
      create: {
        agentId: agent.id,
        documentId: document.id,
      },
    });
  }

  const apiRawKey = "idq_seed_platform_demo_key";
  const apiHash = hashApiKey(apiRawKey);

  const apiKey = await prisma.apiKey.upsert({
    where: { keyHash: apiHash },
    update: {
      tenantId: tenantIdentiq.id,
      name: "Chave pública Seed",
      prefix: apiRawKey.slice(0, 10),
      scopes: [
        "site:chat",
        "responses:create",
        "chat:completions",
        "embeddings:create",
        "models:read",
        "agents:read",
        "usage:read",
      ],
      status: "ACTIVE",
      monthlyRequestLimit: 200000,
      monthlyCostLimitUsd: 10000,
    },
    create: {
      tenantId: tenantIdentiq.id,
      name: "Chave pública Seed",
      prefix: apiRawKey.slice(0, 10),
      keyHash: apiHash,
      scopes: [
        "site:chat",
        "responses:create",
        "chat:completions",
        "embeddings:create",
        "models:read",
        "agents:read",
        "usage:read",
      ],
      environment: "development",
      status: "ACTIVE",
      monthlyRequestLimit: 200000,
      monthlyCostLimitUsd: 10000,
    },
  });

  await prisma.featureFlag.upsert({
    where: {
      key_tenantId: {
        key: "playground.v2",
        tenantId: tenantIdentiq.id,
      },
    },
    update: {
      enabled: true,
      scope: "TENANT",
    },
    create: {
      key: "playground.v2",
      description: "Playground avançado com rastreabilidade de prompt efetivo",
      scope: "TENANT",
      enabled: true,
      tenantId: tenantIdentiq.id,
    },
  });

  await prisma.setting.deleteMany({
    where: {
      key: "security.mask_sensitive_data",
      tenantId: tenantIdentiq.id,
      agentId: null,
      providerId: null,
    },
  });

  await prisma.setting.create({
    data: {
      key: "security.mask_sensitive_data",
      tenantId: tenantIdentiq.id,
      value: true,
    },
  });

  const runtimeDefaultSettings = [
    { key: "ai.autonomous_mode", value: true },
    { key: "ai.external_provider_enabled", value: false },
    { key: "ai.local_llm_enabled", value: false },
    { key: "ai.local_embeddings_enabled", value: true },
    { key: "ai.lexical_search_enabled", value: true },
    { key: "ai.handoff_threshold", value: 0.68 },
    { key: "ai.strict_templates_only", value: false },
    { key: "ai.allow_enrichment", value: false },
    { key: "ai.safety_level", value: "BALANCED" },
    { key: "ai.knowledge_required_categories", value: [] },
    { key: "ai.default_response_mode", value: "KNOWLEDGE_COMPOSER_MODE" },
  ];

  for (const entry of runtimeDefaultSettings) {
    await prisma.setting.deleteMany({
      where: {
        key: entry.key,
        tenantId: tenantIdentiq.id,
        agentId: null,
        providerId: null,
      },
    });

    await prisma.setting.create({
      data: {
        key: entry.key,
        tenantId: tenantIdentiq.id,
        value: entry.value,
      },
    });
  }

  const sampleConversation = await prisma.conversation.create({
    data: {
      tenantId: tenantIdentiq.id,
      userId: master.id,
      apiKeyId: apiKey.id,
      channel: "DASHBOARD",
      agentId: agentsForMapping[0]?.id,
      providerId: provider.id,
      modelId: modelChat.id,
      status: "RESOLVED",
      effectivePrompt: "Prompt institucional com guardrails",
      inputTokens: 520,
      outputTokens: 820,
      totalCostUsd: 0.0042,
      latencyMs: 1420,
      retrievedDocuments: [{ id: document.id, title: document.title }],
      toolCalls: [{ name: "buscar-base-conhecimento" }],
      messages: {
        create: [
          {
            sequence: 1,
            role: "USER",
            content: "Quais critérios de validação documental se aplicam ao onboarding corporativo?",
            tokenCount: 520,
          },
          {
            sequence: 2,
            role: "ASSISTANT",
            content:
              "A validação contempla consistência documental, análise biométrica e revisão de risco. Em cenário crítico, o caso deve ser encaminhado para analista humano.",
            tokenCount: 820,
            costUsd: 0.0042,
          },
        ],
      },
    },
  });

  await prisma.apiRequestLog.create({
    data: {
      requestId: `seed-${Date.now()}`,
      tenantId: tenantIdentiq.id,
      userId: master.id,
      apiKeyId: apiKey.id,
      providerId: provider.id,
      modelId: modelChat.id,
      agentId: agentsForMapping[0]?.id,
      conversationId: sampleConversation.id,
      endpoint: "/api/v1/chat/completions",
      method: "POST",
      channel: "API",
      success: true,
      statusCode: 200,
      inputTokens: 520,
      outputTokens: 820,
      totalCostUsd: 0.0042,
      latencyMs: 1420,
    },
  });

  await prisma.usageRecord.create({
    data: {
      tenantId: tenantIdentiq.id,
      apiKeyId: apiKey.id,
      userId: master.id,
      agentId: agentsForMapping[0]?.id,
      providerId: provider.id,
      modelId: modelChat.id,
      channel: "API",
      metricType: "COST",
      inputTokens: 520,
      outputTokens: 820,
      totalTokens: 1340,
      requests: 1,
      costUsd: 0.0042,
      periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      periodEnd: new Date(),
      metadata: {
        source: "seed",
      },
    },
  });

  await prisma.alert.create({
    data: {
      tenantId: tenantIdentiq.id,
      type: "cost_warning",
      title: "Uso de custo acima do esperado",
      description: "O custo acumulado semanal ultrapassou 80% da meta interna.",
      status: "OPEN",
      severity: "MEDIUM",
      currentValue: 80,
      threshold: 75,
    },
  });

  await prisma.billingEvent.create({
    data: {
      tenantId: tenantIdentiq.id,
      type: "LIMIT_WARNING",
      title: "Aviso preventivo de franquia",
      description: "Tenant atingiu 70% da franquia mensal de tokens.",
      createdById: master.id,
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        tenantId: tenantIdentiq.id,
        userId: master.id,
        action: "seed.bootstrap",
        entityType: "System",
        severity: "LOW",
        message: "Base inicial da plataforma criada com sucesso.",
      },
      {
        tenantId: tenantIdentiq.id,
        userId: master.id,
        action: "auth.login_success",
        entityType: "User",
        entityId: master.id,
        severity: "LOW",
        message: "Login de validação pós-seed.",
      },
    ],
  });

  console.log("Seed concluído com sucesso.");
  console.log(`Master login: ${masterEmail}`);
  console.log(`Master password: ${masterPassword}`);
  console.log(`API key seed (somente seed): ${apiRawKey}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


