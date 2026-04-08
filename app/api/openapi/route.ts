import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";

export const GET = withApiHandler(async (_request, requestId) => {
  const openapi = {
    openapi: "3.0.3",
    info: {
      title: "Identiq AI Platform API",
      version: "1.1.0",
      description:
        "API pública da Identiq com core engine autônomo, knowledge-first response policy e enriquecimento opcional por LLM.",
    },
    servers: [{ url: "https://api.identiq.ai" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      "/api/v1/responses": {
        post: {
          summary: "Cria resposta em formato Responses",
        },
      },
      "/api/v1/chat/completions": {
        post: {
          summary: "Cria completion em formato Chat",
        },
      },
      "/api/v1/site/chat": {
        post: {
          summary: "Motor de resposta para widget/chat do site com CORS e validação de origem",
        },
      },
      "/api/v1/embeddings": {
        post: {
          summary: "Gera embeddings (local por padrão)",
        },
      },
      "/api/v1/models": {
        get: {
          summary: "Lista modelos disponíveis (core + configurados)",
        },
      },
      "/api/v1/agents": {
        get: {
          summary: "Lista agentes ativos",
        },
      },
      "/api/v1/usage": {
        get: {
          summary: "Resumo de uso da chave",
        },
      },
      "/api/v1/health": {
        get: {
          summary: "Status operacional da API",
        },
      },
    },
  };

  return ok(requestId, openapi);
});

