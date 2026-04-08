import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm text-center">
          <h1 className="text-xl font-semibold text-zinc-900">Token de redefinição ausente</h1>
          <p className="mt-2 text-sm text-zinc-500">Solicite um novo link para redefinir sua senha.</p>
          <Link href="/esqueci-senha" className="mt-4 inline-block text-sm font-medium text-zinc-900">
            Solicitar novo link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">segurança de acesso</p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Redefinir senha</h1>
        <p className="mt-1 text-sm text-zinc-500">Defina uma nova senha segura para sua conta.</p>
        <div className="mt-6">
          <ResetPasswordForm token={token} />
        </div>
      </div>
    </div>
  );
}

