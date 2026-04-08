import Link from "next/link";

const highlights = [
  {
    title: "Engine autônoma",
    description:
      "Operação independente de provider externo com core engine próprio, guardrails e handoff humano.",
  },
  {
    title: "API universal",
    description:
      "Integração em qualquer sistema com API key, escopos, rate limit, quotas e observabilidade por requisição.",
  },
  {
    title: "Governança enterprise",
    description:
      "Auditoria completa, segregação multi-tenant, trilha administrativa e política LGPD preparada para produção.",
  },
];

const modules = [
  "Agentes e prompts versionados",
  "Knowledge base com ingestão e RAG",
  "Playground operacional com custo e latência",
  "API pública compatível com padrões de mercado",
  "Observabilidade, billing e auditoria em tempo real",
  "Controle de acesso com RBAC e políticas por tenant",
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-400">Identiq</p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">AI Platform</p>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-zinc-300 md:flex">
            <Link href="/documentacao" className="transition hover:text-white">
              Documentação
            </Link>
            <Link href="/api/openapi" className="transition hover:text-white">
              OpenAPI
            </Link>
            <Link href="/integracoes" className="transition hover:text-white">
              Integrações
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/entrar"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-100 px-4 text-sm font-medium text-zinc-900 transition hover:bg-white"
            >
              Acessar plataforma
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-zinc-900">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.09),transparent_36%),radial-gradient(circle_at_78%_0%,rgba(255,255,255,0.06),transparent_33%)]" />
          <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
            <div>
              <p className="inline-flex items-center rounded-full border border-zinc-700/80 bg-zinc-900/80 px-3 py-1 text-xs text-zinc-300">
                Plataforma proprietária para IA de identidade, risco e compliance
              </p>
              <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-tight text-white lg:text-5xl">
                A infraestrutura de IA da Identiq para operar em qualquer sistema.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-300 lg:text-lg">
                Conecte site, CRM, ERP, app e operações internas ao motor da Identiq com segurança, governança e
                observabilidade enterprise desde o primeiro deploy.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/entrar"
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
                >
                  Entrar no painel
                </Link>
                <Link
                  href="/documentacao"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-700 px-5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white"
                >
                  Ler documentação
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-2xl shadow-black/20">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Endpoints principais</p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-200">
                  POST /api/v1/site/chat
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-200">
                  POST /api/v1/responses
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-200">
                  POST /api/v1/chat/completions
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-200">
                  GET /api/v1/models
                </div>
              </div>
              <p className="mt-4 text-xs text-zinc-400">
                Autenticação por <span className="font-mono text-zinc-300">Authorization: Bearer</span> ou{" "}
                <span className="font-mono text-zinc-300">x-api-key</span>.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-14 lg:py-16">
          <div className="grid gap-4 md:grid-cols-3">
            {highlights.map((item) => (
              <article key={item.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <h2 className="text-base font-semibold text-zinc-100">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-16 lg:pb-20">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="text-lg font-semibold text-white">Módulos prontos para produção</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {modules.map((module) => (
                <div key={module} className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-300">
                  {module}
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/integracoes"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-100 px-4 text-sm font-medium text-zinc-900 transition hover:bg-white"
              >
                Abrir hub de integrações
              </Link>
              <Link
                href="/plataforma/dashboard"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-700 px-4 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white"
              >
                Ir para dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
