import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Identiq AI Platform</p>
        <h1 className="mt-3 text-2xl font-semibold text-zinc-900">Página não encontrada</h1>
        <p className="mt-2 text-sm text-zinc-600">
          O endereço informado não existe ou foi removido.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/entrar"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            Ir para acesso
          </Link>
          <Link
            href="/plataforma/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-100 px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200"
          >
            Abrir painel
          </Link>
        </div>
      </div>
    </div>
  );
}
