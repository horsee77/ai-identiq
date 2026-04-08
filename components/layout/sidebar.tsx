"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  Building2,
  Cable,
  ClipboardList,
  CreditCard,
  FileText,
  Fingerprint,
  IdCard,
  KeyRound,
  Layers3,
  LifeBuoy,
  MessageSquareText,
  SearchCheck,
  Shield,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/plataforma/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/plataforma/perfil", label: "Meu Perfil", icon: IdCard },
  { href: "/plataforma/tenants", label: "Tenants", icon: Building2 },
  { href: "/plataforma/usuarios", label: "Usuários", icon: Users },
  { href: "/plataforma/papeis", label: "Papéis", icon: Shield },
  { href: "/plataforma/providers", label: "Providers", icon: Cable },
  { href: "/plataforma/modelos", label: "Modelos", icon: Layers3 },
  { href: "/plataforma/agentes", label: "Agentes", icon: Bot },
  { href: "/plataforma/prompts", label: "Prompts", icon: Sparkles },
  { href: "/plataforma/conhecimento", label: "Conhecimento", icon: FileText },
  { href: "/plataforma/embeddings", label: "Embeddings", icon: SearchCheck },
  { href: "/plataforma/conversas", label: "Conversas", icon: MessageSquareText },
  { href: "/plataforma/tools", label: "Tools", icon: Wrench },
  { href: "/plataforma/integracoes", label: "Integrações", icon: KeyRound },
  { href: "/plataforma/billing", label: "Billing", icon: CreditCard },
  { href: "/plataforma/observabilidade", label: "Observabilidade", icon: Fingerprint },
  { href: "/plataforma/auditoria", label: "Auditoria", icon: ClipboardList },
  { href: "/plataforma/playground", label: "Playground", icon: LifeBuoy },
  { href: "/plataforma/configuracoes", label: "Configurações", icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-72 flex-col border-r border-zinc-200 bg-gradient-to-b from-zinc-950 to-zinc-900 px-4 py-6 text-zinc-100 lg:flex">
      <div className="mb-8 px-2">
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">Identiq</p>
        <h1 className="mt-2 text-lg font-semibold">AI Platform</h1>
      </div>

      <nav className="space-y-1 overflow-y-auto pb-6">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                active
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-400">
        <p className="font-medium text-zinc-200">Governança ativa</p>
        <p className="mt-1">Segregação multi-tenant, auditoria e controle de custos habilitados.</p>
      </div>
    </aside>
  );
}

