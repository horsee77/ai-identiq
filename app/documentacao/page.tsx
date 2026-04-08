import Link from "next/link";

const endpoints = [
  {
    method: "POST",
    path: "/api/v1/site/chat",
    description: "Motor de resposta para site/widget com CORS, escopo e validação de origem.",
  },
  {
    method: "POST",
    path: "/api/v1/responses",
    description: "Interface principal para respostas da plataforma.",
  },
  {
    method: "POST",
    path: "/api/v1/chat/completions",
    description: "Compatibilidade técnica para clientes que usam payload estilo chat.",
  },
  {
    method: "POST",
    path: "/api/v1/embeddings",
    description: "Geração de embeddings com prioridade local.",
  },
  {
    method: "GET",
    path: "/api/v1/models",
    description: "Lista de modelos e capacidades disponíveis para o tenant.",
  },
  {
    method: "GET",
    path: "/api/v1/usage",
    description: "Resumo de uso, tokens, custo e consumo por chave.",
  },
];

export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-400">Identiq</p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">Documentação da API</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-700 px-4 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white"
            >
              Voltar para home
            </Link>
            <Link
              href="/entrar"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-100 px-4 text-sm font-medium text-zinc-900 transition hover:bg-white"
            >
              Acessar plataforma
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h1 className="text-2xl font-semibold text-white">Guia rápido de integração</h1>
          <p className="mt-3 max-w-4xl text-sm leading-relaxed text-zinc-300">
            A API da Identiq AI Platform permite integrar o motor de resposta em qualquer stack com autenticação por
            API key e controles enterprise de escopo, quota, auditoria e rastreabilidade.
          </p>
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-zinc-300">
            <p className="font-mono">Base URL: https://seu-dominio/api</p>
            <p className="mt-2 font-mono">Auth: Authorization: Bearer idq_... ou x-api-key: idq_...</p>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">Endpoints principais</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800">
            <table className="min-w-full divide-y divide-zinc-800">
              <thead className="bg-zinc-950">
                <tr>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-zinc-500">Método</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-zinc-500">Endpoint</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-zinc-500">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-900">
                {endpoints.map((endpoint) => (
                  <tr key={endpoint.path}>
                    <td className="px-4 py-3 text-sm text-zinc-200">{endpoint.method}</td>
                    <td className="px-4 py-3 font-mono text-sm text-zinc-100">{endpoint.path}</td>
                    <td className="px-4 py-3 text-sm text-zinc-300">{endpoint.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h3 className="text-base font-semibold text-white">Exemplo cURL</h3>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-zinc-100">
              <code>{`curl -X POST "https://seu-dominio/api/v1/site/chat" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: idq_sua_api_key" \\
  -d '{
    "session_id": "cliente_001",
    "message": "Preciso de orientação para onboarding.",
    "use_rag": true
  }'`}</code>
            </pre>
          </article>

          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h3 className="text-base font-semibold text-white">Próximos passos</h3>
            <ol className="mt-3 space-y-2 text-sm text-zinc-300">
              <li>1. Gere sua API key em `/plataforma/integracoes`.</li>
              <li>2. Defina escopos mínimos para cada integração.</li>
              <li>3. Configure limites de requisição e custo por chave.</li>
              <li>4. Monitore uso em `/api/v1/usage` e no dashboard interno.</li>
            </ol>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/plataforma/integracoes"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-100 px-4 text-sm font-medium text-zinc-900 transition hover:bg-white"
              >
                Abrir integrações
              </Link>
              <Link
                href="/api/openapi"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-700 px-4 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white"
              >
                Ver OpenAPI JSON
              </Link>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
