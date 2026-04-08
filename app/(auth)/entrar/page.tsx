import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getSessionContext } from "@/lib/auth/access";

export default async function LoginPage() {
  const session = await getSessionContext();
  if (session) {
    redirect("/plataforma/dashboard");
  }

  return (
    <div className="grid min-h-screen bg-zinc-100 lg:grid-cols-2">
      <section className="hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">Identiq</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight">Identiq AI Platform</h1>
          <p className="mt-4 max-w-md text-sm text-zinc-300">
            Plataforma corporativa de IA com Governança, multi-tenant, observabilidade e segurança operacional para fluxos de identidade e compliance.
          </p>
        </div>
        <p className="text-xs text-zinc-400">Ambiente seguro com auditoria completa e segregação de dados por tenant.</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Acesso seguro</p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-900">Entrar na plataforma</h2>
          <p className="mt-1 text-sm text-zinc-500">Use suas credenciais corporativas para continuar.</p>

          <div className="mt-6">
            <LoginForm />
          </div>

          <div className="mt-4 text-sm">
            <Link href="/esqueci-senha" className="font-medium text-zinc-900 hover:text-zinc-700">
              Esqueci minha senha
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
