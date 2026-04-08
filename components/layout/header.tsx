"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type HeaderProps = {
  userName: string;
  tenantName: string;
  memberships: { tenantId: string; tenantName: string }[];
};

export function Header({ userName, tenantName, memberships }: HeaderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedTenant, setSelectedTenant] = useState("");

  async function handleTenantSwitch() {
    if (!selectedTenant) return;
    startTransition(async () => {
      await fetch("/api/internal/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: selectedTenant }),
      });
      router.refresh();
    });
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/entrar");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-8">
        <div className="hidden max-w-sm flex-1 lg:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input className="pl-9" placeholder="Buscar módulo, agente, documento, tenant..." />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <select
            className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm"
            value={selectedTenant}
            onChange={(event) => setSelectedTenant(event.target.value)}
          >
            <option value="">Tenant: {tenantName}</option>
            {memberships.map((membership) => (
              <option key={membership.tenantId} value={membership.tenantId}>
                {membership.tenantName}
              </option>
            ))}
          </select>
          <Button variant="secondary" onClick={handleTenantSwitch} disabled={!selectedTenant || isPending}>
            Trocar
          </Button>
          <div className="text-right">
            <p className="text-sm font-medium text-zinc-900">{userName}</p>
            <p className="text-xs text-zinc-500">Administrador da plataforma</p>
          </div>
          <Button variant="ghost" onClick={handleLogout} title="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

