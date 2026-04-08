"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type SiteSettings = {
  enabled: boolean;
  allowAnonymous: boolean;
  allowedOrigins: string[];
  defaultAgentId?: string;
  defaultResponseMode: "STRICT_TEMPLATE_MODE" | "KNOWLEDGE_COMPOSER_MODE" | "ENRICHED_MODE";
};

type Props = {
  initialSettings: SiteSettings;
  agents: { id: string; name: string }[];
};

function Label({ children }: { children: string }) {
  return <label className="block text-xs font-medium text-zinc-600">{children}</label>;
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export function SiteSettingsForm({ initialSettings, agents }: Props) {
  const [settings, setSettings] = useState<SiteSettings>(initialSettings);
  const [origins, setOrigins] = useState(initialSettings.allowedOrigins.join(", "));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/internal/settings/site");
    const payload = await response.json();
    setLoading(false);

    if (!response.ok || !payload?.ok) {
      setError(payload?.error?.message ?? "Não foi possível carregar configurações do site.");
      return;
    }

    setSettings(payload.data);
    setOrigins((payload.data.allowedOrigins ?? []).join(", "));
  }

  useEffect(() => {
    setOrigins(initialSettings.allowedOrigins.join(", "));
  }, [initialSettings]);

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);

    const payload = {
      ...settings,
      defaultAgentId: settings.defaultAgentId || null,
      allowedOrigins: origins
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };

    const response = await fetch("/api/internal/settings/site", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setSaving(false);

    if (!response.ok || !result?.ok) {
      setError(result?.error?.message ?? "Falha ao salvar configurações do site.");
      return;
    }

    setSettings(result.data);
    setOrigins((result.data.allowedOrigins ?? []).join(", "));
    setMessage("Configurações do motor de resposta do site salvas.");
  }

  return (
    <Card
      title="Motor de Resposta do Site"
      subtitle="Defina domínios autorizados, agente padrão e política de resposta para o chat do site da Identiq."
    >
      <div className="space-y-4">
        <div className="grid gap-2 md:grid-cols-2">
          <Toggle
            label="Widget do site habilitado"
            checked={settings.enabled}
            onChange={(value) => setSettings((prev) => ({ ...prev, enabled: value }))}
          />
          <Toggle
            label="Permitir visitantes anônimos"
            checked={settings.allowAnonymous}
            onChange={(value) => setSettings((prev) => ({ ...prev, allowAnonymous: value }))}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Agente padrão do site</Label>
            <Select
              value={settings.defaultAgentId ?? ""}
              onChange={(event) => setSettings((prev) => ({ ...prev, defaultAgentId: event.target.value || undefined }))}
            >
              <option value="">Selecionar automaticamente</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Modo de resposta padrão</Label>
            <Select
              value={settings.defaultResponseMode}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  defaultResponseMode: event.target.value as SiteSettings["defaultResponseMode"],
                }))
              }
            >
              <option value="STRICT_TEMPLATE_MODE">STRICT_TEMPLATE_MODE</option>
              <option value="KNOWLEDGE_COMPOSER_MODE">KNOWLEDGE_COMPOSER_MODE</option>
              <option value="ENRICHED_MODE">ENRICHED_MODE</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Domínios autorizados (origins separadas por vírgula)</Label>
            <Input
              value={origins}
              onChange={(event) => setOrigins(event.target.value)}
              placeholder="https://www.identiq.ai, https://identiq.ai"
            />
          </div>
        </div>

        <p className="text-xs text-zinc-500">
          Exemplo de origem válida: <code>https://www.identiq.ai</code>. Não use caminhos (ex: <code>/chat</code>).
        </p>

        {loading && <p className="text-xs text-zinc-500">Carregando configurações...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-emerald-600">{message}</p>}

        <div className="flex items-center gap-2">
          <Button onClick={save} disabled={saving || loading}>
            {saving ? "Salvando..." : "Salvar motor do site"}
          </Button>
          <Button variant="secondary" onClick={reload} disabled={loading}>
            Recarregar
          </Button>
        </div>
      </div>
    </Card>
  );
}
