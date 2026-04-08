"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      setError(payload?.error?.message ?? "Não foi possível enviar a solicitação.");
      setLoading(false);
      return;
    }

    setMessage("Se o email existir na base, você receberá instruções para redefinição.");
    setLoading(false);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-700" htmlFor="email">
          Email de acesso
        </label>
        <Input
          id="email"
          type="email"
          placeholder="seu.email@empresa.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">{message}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Enviando..." : "Enviar link de redefinição"}
      </Button>
    </form>
  );
}

