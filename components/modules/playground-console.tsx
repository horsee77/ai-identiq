"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { JsonViewer } from "@/components/ui/json-viewer";

export function PlaygroundConsole({
  agents,
  providers,
  models,
}: {
  agents: { id: string; name: string }[];
  providers: { id: string; name: string }[];
  models: { id: string; displayName: string; technicalName: string }[];
}) {
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [providerId, setProviderId] = useState("");
  const [modelId, setModelId] = useState("");
  const [temperature, setTemperature] = useState("0.2");
  const [message, setMessage] = useState(
    "Olá, preciso de orientações sobre validação documental em onboarding corporativo."
  );
  const [response, setResponse] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const payload = {
      agentId: agentId || undefined,
      providerId: providerId || undefined,
      modelId: modelId || undefined,
      temperature: Number(temperature),
      message,
      enableRag: true,
      enableTools: true,
    };

    const request = await fetch("/api/internal/playground", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await request.json();
    setResponse(data);
    setLoading(false);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <Card
        title="Console de testes"
        subtitle="Validação de prompt efetivo, latência, tokens, custo e contexto RAG."
      >
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Agente (opcional)</label>
            <Select value={agentId} onChange={(event) => setAgentId(event.target.value)}>
              <option value="">Core autônomo (sem agente específico)</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Provider (opcional)</label>
            <Select value={providerId} onChange={(event) => setProviderId(event.target.value)}>
              <option value="">Autônomo (sem provider)</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Modelo (opcional)</label>
            <Select value={modelId} onChange={(event) => setModelId(event.target.value)}>
              <option value="">Modelo core da plataforma</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.displayName} ({model.technicalName})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Temperatura</label>
            <Input value={temperature} onChange={(event) => setTemperature(event.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Mensagem de teste</label>
            <Textarea value={message} onChange={(event) => setMessage(event.target.value)} />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Executando teste..." : "Executar cenário"}
          </Button>
        </form>
      </Card>

      <Card
        title="Resultado da execução"
        subtitle="Visualização completa da resposta e telemetria de execução."
      >
        {response ? (
          <JsonViewer value={response} />
        ) : (
          <p className="text-sm text-zinc-500">Execute um teste para visualizar o resultado.</p>
        )}
      </Card>
    </div>
  );
}

