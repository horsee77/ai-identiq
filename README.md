# Identiq AI Platform

Plataforma SaaS enterprise da Identiq com arquitetura **autônoma por padrão**:

1. `Core Engine` próprio (decisão, políticas, handoff e composição)
2. `Knowledge Engine` próprio (busca lexical + semântica local)
3. `LLM Engine` opcional (local ou externo, apenas para enriquecimento)

O sistema funciona sem OpenAI e sem provider externo.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL

## Rotas públicas

- `/` Home institucional da plataforma
- `/documentacao` Guia rápido e endpoints públicos
- `/docs` Alias para `/documentacao`
- `/entrar` Acesso ao painel administrativo

## Arquitetura de IA (atual)

### Camadas de resposta

1. `L1_INTENT`: classificação local de intenção
2. `L2_POLICY`: políticas de segurança e governança
3. `L3_KNOWLEDGE`: recuperação de conhecimento (local)
4. `L4_TEMPLATE`: resposta controlada por templates aprovados
5. `L5_LOCAL_LLM` (opcional): enriquecimento por modelo local
6. `L6_EXTERNAL_LLM` (opcional): enriquecimento por provider externo

As camadas 5 e 6 nunca são obrigatórias.

### Módulos principais

- `lib/ai/core-engine/*`: roteamento, classificação, política, confiança, handoff, composição
- `lib/ai/response-library/*`: biblioteca institucional de blocos e fluxos
- `lib/knowledge/service.ts`: busca knowledge-first local (sem dependência externa)
- `lib/ai/embeddings/local-provider.ts`: embeddings locais determinísticos
- `lib/ai/runtime.ts`: pipeline unificado para API pública e playground

## Modos de resposta por agente

- `STRICT_TEMPLATE_MODE`
- `KNOWLEDGE_COMPOSER_MODE` (padrão)
- `ENRICHED_MODE`

## Configuração runtime (tenant/agente)

Via painel em `Plataforma > Configurações`, com persistência em `settings`:

- `autonomous_mode`
- `external_provider_enabled`
- `local_llm_enabled`
- `local_embeddings_enabled`
- `lexical_search_enabled`
- `handoff_threshold`
- `strict_templates_only`
- `allow_enrichment`
- `safety_level`
- `knowledge_required_categories`

Endpoint interno:

- `GET /api/internal/settings/runtime`
- `PUT /api/internal/settings/runtime`

## API pública

Permanece estável:

- `POST /api/v1/responses`
- `POST /api/v1/chat/completions`
- `POST /api/v1/site/chat`
- `POST /api/v1/embeddings`
- `GET /api/v1/models`
- `GET /api/v1/agents`
- `GET /api/v1/usage`
- `GET /api/v1/health`

Agora com motor autônomo provider-optional.

### Hub de integrações (API Keys)

No painel administrativo:

- `Plataforma > Integrações`
- gestão completa de API keys (criação, escopos, limites, revogação)
- quickstart em `cURL`, `JavaScript` e `Python` para uso em qualquer sistema

Atalhos de rota:

- `/plataforma/integracoes` (principal)
- `/plataforma/api-keys` (redireciona)
- `/integracoes` e `/api-keys` (atalhos globais)

### Motor de resposta do site (widget/web chat)

Configuração no painel:

- `Plataforma > Configurações > Motor de Resposta do Site`
- Definição de domínios autorizados (CORS)
- Agente padrão do site
- Habilitação de visitantes anônimos

Endpoint:

- `POST /api/v1/site/chat`

Preflight CORS:

- `OPTIONS /api/v1/site/chat`

Exemplo de chamada (frontend do site):

```ts
await fetch("https://api.identiq.ai/api/v1/site/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer SUA_API_KEY_DO_SITE", // ou x-api-key
  },
  body: JSON.stringify({
    session_id: "site_abcd1234",
    message: "Quero entender o fluxo de onboarding.",
    use_rag: true,
  }),
});
```

Exigências de segurança do endpoint:

- API key é obrigatória (`Authorization` ou `x-api-key`)
- validação de escopo (`site:chat`, `chat:completions` ou `responses:create`)
- validação de origem por CORS (domínios autorizados no painel)
- validação de ambiente da chave (`development` x `production`)
- rate limit e quota por chave/sessão

Escopos aceitos na API key:

- `site:chat` (recomendado)
- `chat:completions`
- `responses:create`

## Setup local

1. Instalar dependências

```bash
npm install
```

2. Configurar ambiente

```bash
cp .env.example .env
```

3. Configurar banco (`DATABASE_URL`)

4. Prisma

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
```

5. Rodar aplicação

```bash
npm run dev
```

## Qualidade

```bash
npm run lint
npm run typecheck
npm run build
```

## Observabilidade

Cada resposta registra em `api_request_logs`:

- camada utilizada (`layers`)
- modo de resposta
- intenção, confiança e criticidade
- blocos institucionais aplicados
- uso de local/external LLM (quando houver)
- handoff e motivo

