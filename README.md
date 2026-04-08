# Identiq AI Platform

Plataforma SaaS enterprise da Identiq com arquitetura autonoma por padrao:

1. Core Engine proprio (decisao, politicas, handoff e composicao)
2. Knowledge Engine proprio (busca lexical + semantica local)
3. LLM Engine opcional (local ou externo, apenas para enriquecimento)

O sistema funciona sem OpenAI e sem provider externo.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL

## Rotas publicas

- `/` Home institucional da plataforma
- `/documentacao` Guia rapido e endpoints publicos
- `/docs` Alias para `/documentacao`
- `/entrar` Acesso ao painel administrativo

## API publica

- `POST /api/v1/responses`
- `POST /api/v1/chat/completions`
- `POST /api/v1/site/chat`
- `POST /api/v1/embeddings`
- `GET /api/v1/models`
- `GET /api/v1/agents`
- `GET /api/v1/usage`
- `GET /api/v1/health`

## Hub de integracoes

No painel:

- `Plataforma > Integracoes`
- Criacao e revogacao de API keys
- Escopos, limites, quotas e rate limit
- Snippets cURL, JavaScript e Python

Atalhos:

- `/plataforma/integracoes`
- `/integracoes`
- `/api-keys`

## Setup local

1. Instalar dependencias

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

5. Rodar aplicacao

```bash
npm run dev
```

## Qualidade

```bash
npm run lint
npm run typecheck
npm run build
```
