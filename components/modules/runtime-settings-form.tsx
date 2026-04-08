"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type RuntimeConfig = {
  autonomousMode: boolean;
  externalProviderEnabled: boolean;
  localLlmEnabled: boolean;
  localEmbeddingsEnabled: boolean;
  lexicalSearchEnabled: boolean;
  handoffThreshold: number;
  strictTemplatesOnly: boolean;
  allowEnrichment: boolean;
  safetyLevel: "STRICT" | "BALANCED" | "ELEVATED";
  knowledgeRequiredCategories: string[];
  defaultResponseMode: "STRICT_TEMPLATE_MODE" | "KNOWLEDGE_COMPOSER_MODE" | "ENRICHED_MODE";
  localLlmProviderId?: string;
  externalProviderId?: string;
};

type Props = {
  initialConfig: RuntimeConfig;
  agents: { id: string; name: string }[];
  providers: { id: string; name: string }[];
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

export function RuntimeSettingsForm({ initialConfig, agents, providers }: Props) {
  const [scope, setScope] = useState<"tenant" | "agent">("tenant");
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [config, setConfig] = useState<RuntimeConfig>(initialConfig);
  const [categories, setCategories] = useState(initialConfig.knowledgeRequiredCategories.join(", "));

  const selectedAgentEnabled = useMemo(() => scope === "agent" && Boolean(selectedAgentId), [scope, selectedAgentId]);

  async function loadConfigForScope() {
    setError(null);
    setMessage(null);
    setLoading(true);

    const query = selectedAgentEnabled ? `?agentId=${selectedAgentId}` : "";
    const response = await fetch(`/api/internal/settings/runtime${query}`);
    const payload = await response.json();
    setLoading(false);

    if (!response.ok || !payload?.ok) {
      setError(payload?.error?.message ?? "Não foi possível carregar as configurações.");
      return;
    }

    setConfig(payload.data);
    setCategories((payload.data.knowledgeRequiredCategories ?? []).join(", "));
  }

  useEffect(() => {
    loadConfigForScope();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, selectedAgentId]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);

    const payload = {
      ...(selectedAgentEnabled ? { agentId: selectedAgentId } : {}),
      ...config,
      knowledgeRequiredCategories: categories
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      localLlmProviderId: config.localLlmProviderId || null,
      externalProviderId: config.externalProviderId || null,
    };

    const response = await fetch("/api/internal/settings/runtime", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setSaving(false);

    if (!response.ok || !result?.ok) {
      setError(result?.error?.message ?? "Falha ao salvar configurações.");
      return;
    }

    setConfig(result.data);
    setCategories((result.data.knowledgeRequiredCategories ?? []).join(", "));
    setMessage("Configurações salvas com sucesso.");
  }

  return (
    <Card
      title="Runtime de inteligência autônoma"
      subtitle="Configuração por tenant/agente para operação local, segura e independente de provider externo."
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Escopo de edição</Label>
            <Select value={scope} onChange={(event) => setScope(event.target.value as "tenant" | "agent")}>
              <option value="tenant">Tenant (padrão)</option>
              <option value="agent">Agente específico</option>
            </Select>
          </div>

          <div>
            <Label>Agente</Label>
            <Select
              value={selectedAgentId}
              onChange={(event) => setSelectedAgentId(event.target.value)}
              disabled={scope !== "agent" || !agents.length}
            >
              {!agents.length && <option value="">Nenhum agente disponível</option>}
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <Toggle
            label="Autonomous mode"
            checked={config.autonomousMode}
            onChange={(value) => setConfig((prev) => ({ ...prev, autonomousMode: value }))}
          />
          <Toggle
            label="Provider externo habilitado"
            checked={config.externalProviderEnabled}
            onChange={(value) => setConfig((prev) => ({ ...prev, externalProviderEnabled: value }))}
          />
          <Toggle
            label="LLM local habilitado"
            checked={config.localLlmEnabled}
            onChange={(value) => setConfig((prev) => ({ ...prev, localLlmEnabled: value }))}
          />
          <Toggle
            label="Embeddings locais habilitados"
            checked={config.localEmbeddingsEnabled}
            onChange={(value) => setConfig((prev) => ({ ...prev, localEmbeddingsEnabled: value }))}
          />
          <Toggle
            label="Busca lexical habilitada"
            checked={config.lexicalSearchEnabled}
            onChange={(value) => setConfig((prev) => ({ ...prev, lexicalSearchEnabled: value }))}
          />
          <Toggle
            label="Somente templates estritos"
            checked={config.strictTemplatesOnly}
            onChange={(value) => setConfig((prev) => ({ ...prev, strictTemplatesOnly: value }))}
          />
          <Toggle
            label="Permitir enriquecimento"
            checked={config.allowEnrichment}
            onChange={(value) => setConfig((prev) => ({ ...prev, allowEnrichment: value }))}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Modo de resposta padrão</Label>
            <Select
              value={config.defaultResponseMode}
              onChange={(event) =>
                setConfig((prev) => ({
                  ...prev,
                  defaultResponseMode: event.target.value as RuntimeConfig["defaultResponseMode"],
                }))
              }
            >
              <option value="STRICT_TEMPLATE_MODE">STRICT_TEMPLATE_MODE</option>
              <option value="KNOWLEDGE_COMPOSER_MODE">KNOWLEDGE_COMPOSER_MODE</option>
              <option value="ENRICHED_MODE">ENRICHED_MODE</option>
            </Select>
          </div>
          <div>
            <Label>Nível de segurança</Label>
            <Select
              value={config.safetyLevel}
              onChange={(event) =>
                setConfig((prev) => ({ ...prev, safetyLevel: event.target.value as RuntimeConfig["safetyLevel"] }))
              }
            >
              <option value="STRICT">STRICT</option>
              <option value="BALANCED">BALANCED</option>
              <option value="ELEVATED">ELEVATED</option>
            </Select>
          </div>
          <div>
            <Label>Limiar de handoff (0-1)</Label>
            <Input
              value={String(config.handoffThreshold)}
              onChange={(event) =>
                setConfig((prev) => ({
                  ...prev,
                  handoffThreshold: Number(event.target.value) || 0,
                }))
              }
            />
          </div>
          <div>
            <Label>Provider de LLM local (opcional)</Label>
            <Select
              value={config.localLlmProviderId ?? ""}
              onChange={(event) => setConfig((prev) => ({ ...prev, localLlmProviderId: event.target.value || undefined }))}
            >
              <option value="">Não definido</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Provider externo para enriquecimento (opcional)</Label>
            <Select
              value={config.externalProviderId ?? ""}
              onChange={(event) =>
                setConfig((prev) => ({
                  ...prev,
                  externalProviderId: event.target.value || undefined,
                }))
              }
            >
              <option value="">Não definido</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Categorias obrigatórias de conhecimento (separadas por vírgula)</Label>
            <Input value={categories} onChange={(event) => setCategories(event.target.value)} />
          </div>
        </div>

        {loading && <p className="text-xs text-zinc-500">Carregando configuração...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-emerald-600">{message}</p>}

        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Salvando..." : "Salvar configurações"}
          </Button>
          <Button variant="secondary" onClick={loadConfigForScope} disabled={loading}>
            Recarregar
          </Button>
        </div>
      </div>
    </Card>
  );
}

