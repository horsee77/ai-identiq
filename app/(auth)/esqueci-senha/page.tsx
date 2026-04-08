import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Recuperação de acesso</p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Esqueci minha senha</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Informe seu email corporativo para receber instruções de redefinição.
        </p>

        <div className="mt-6">
          <ForgotPasswordForm />
        </div>

        <p className="mt-4 text-sm text-zinc-600">
          Lembrou sua senha?{" "}
          <Link href="/entrar" className="font-medium text-zinc-900 hover:text-zinc-700">
            Voltar para login
          </Link>
        </p>
      </div>
    </div>
  );
}

