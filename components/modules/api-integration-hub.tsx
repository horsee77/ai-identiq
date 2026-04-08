"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataCell, DataTable } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  environment: "development" | "staging" | "production";
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  scopes: string[];
  monthlyRequestLimit: number | null;
  monthlyCostLimitUsd: number | null;
  lastUsedAt: string | null;
  createdAt: string;
  notes: string | null;
};

type Props = {
  initialKeys: ApiKeyRow[];
  canCreate: boolean;
  canRevoke: boolean;
  baseUrl: string;
};

type SecretPayload = {
  id: string;
  name: string;
  prefix: string;
  key: string;
  masked: string;
  createdAt: string;
};

type SnippetLanguage = "curl" | "js" | "python";
type SnippetTarget = "site_chat" | "responses";

const availableScopes = [
  { value: "site:chat", label: "site:chat (widget e chat web)" },
  { value: "responses:create", label: "responses:create" },
  { value: "chat:completions", label: "chat:completions" },
  { value: "embeddings:create", label: "embeddings:create" },
  { value: "models:read", label: "models:read" },
  { value: "agents:read", label: "agents:read" },
  { value: "usage:read", label: "usage:read" },
];

function formatDate(value: string | null) {
  if (!value) {
    return "Nunca";
  }
  return new Date(value).toLocaleString("pt-BR");
}

function formatCurrency(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "Sem limite";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function parsePositiveNumber(rawValue: string) {
  if (!rawValue.trim()) {
    return undefined;
  }
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function getStatusBadge(status: ApiKeyRow["status"]) {
  if (status === "ACTIVE") {
    return <Badge label="Ativa" variant="success" />;
  }

  if (status === "REVOKED") {
    return <Badge label="Revogada" variant="warning" />;
  }

  return <Badge label="Expirada" variant="danger" />;
}

export function ApiIntegrationHub({ initialKeys, canCreate, canRevoke, baseUrl }: Props) {
  const [keys, setKeys] = useState<ApiKeyRow[]>(initialKeys);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<SecretPayload | null>(null);

  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState<"development" | "staging" | "production">("production");
  const [monthlyRequestLimit, setMonthlyRequestLimit] = useState("");
  const [monthlyCostLimitUsd, setMonthlyCostLimitUsd] = useState("");
  const [notes, setNotes] = useState("");
  const [scopes, setScopes] = useState<string[]>(["site:chat", "responses:create"]);

  const [snippetLanguage, setSnippetLanguage] = useState<SnippetLanguage>("curl");
  const [snippetTarget, setSnippetTarget] = useState<SnippetTarget>("site_chat");

  const effectiveSecret = revealedSecret?.key ?? "idq_sua_api_key_aqui";
  const siteChatUrl = `${baseUrl}/api/v1/site/chat`;
  const responsesUrl = `${baseUrl}/api/v1/responses`;

  const snippet = useMemo(() => {
    const endpoint = snippetTarget === "site_chat" ? siteChatUrl : responsesUrl;

    if (snippetLanguage === "js") {
      if (snippetTarget === "site_chat") {
        return `await fetch("${endpoint}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${effectiveSecret}"
  },
  body: JSON.stringify({
    session_id: "site_session_001",
    message: "Preciso de apoio com onboarding corporativo.",
    use_rag: true
  })
});`;
      }

      return `await fetch("${endpoint}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer ${effectiveSecret}"
  },
  body: JSON.stringify({
    input: "Qual o fluxo recomendado para validação documental?",
    metadata: {
      canal: "crm",
      origem: "integração_externa"
    }
  })
});`;
    }

    if (snippetLanguage === "python") {
      if (snippetTarget === "site_chat") {
        return `import requests

url = "${endpoint}"
headers = {
  "Content-Type": "application/json",
  "x-api-key": "${effectiveSecret}",
}
payload = {
  "session_id": "site_session_001",
  "message": "Preciso de apoio com onboarding corporativo.",
  "use_rag": True
}

resp = requests.post(url, json=payload, headers=headers, timeout=30)
print(resp.status_code)
print(resp.json())`;
      }

      return `import requests

url = "${endpoint}"
headers = {
  "Content-Type": "application/json",
  "Authorization": "Bearer ${effectiveSecret}",
}
payload = {
  "input": "Quais documentos são necessários para análise de KYC?",
  "metadata": {
    "canal": "erp",
    "origem": "integracao_externa"
  }
}

resp = requests.post(url, json=payload, headers=headers, timeout=30)
print(resp.status_code)
print(resp.json())`;
    }

    if (snippetTarget === "site_chat") {
      return `curl -X POST "${endpoint}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${effectiveSecret}" \\
  -d '{
    "session_id": "site_session_001",
    "message": "Preciso de apoio com onboarding corporativo.",
    "use_rag": true
  }'`;
    }

    return `curl -X POST "${endpoint}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${effectiveSecret}" \\
  -d '{
    "input": "Quais os próximos passos para compliance neste caso?",
    "metadata": {
      "canal": "backend",
      "origem": "integracao_externa"
    }
  }'`;
  }, [effectiveSecret, responsesUrl, siteChatUrl, snippetLanguage, snippetTarget]);

  async function copyToClipboard(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Conteúdo copiado para a área de transferência.");
      setError(null);
    } catch {
      setError("Não foi possível copiar automaticamente. Copie manualmente.");
    }
  }

  async function refreshKeys() {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/internal/api-keys");
    const payload = await response.json();
    setLoading(false);

    if (!response.ok || !payload?.ok) {
      setError(payload?.error?.message ?? "Falha ao carregar as API keys.");
      return;
    }

    setKeys((payload.data ?? []) as ApiKeyRow[]);
  }

  function toggleScope(scope: string) {
    setScopes((previous) =>
      previous.includes(scope)
        ? previous.filter((value) => value !== scope)
        : [...previous, scope]
    );
  }

  async function createKey() {
    setError(null);
    setMessage(null);
    setRevealedSecret(null);

    if (!name.trim()) {
      setError("Informe um nome para a API key.");
      return;
    }

    if (!scopes.length) {
      setError("Selecione ao menos um escopo.");
      return;
    }

    const requestLimit = parsePositiveNumber(monthlyRequestLimit);
    if (requestLimit === null) {
      setError("O limite mensal de requisições deve ser maior que zero.");
      return;
    }

    const costLimit = parsePositiveNumber(monthlyCostLimitUsd);
    if (costLimit === null) {
      setError("O limite mensal de custo deve ser maior que zero.");
      return;
    }

    setCreating(true);
    const response = await fetch("/api/internal/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        environment,
        scopes,
        monthlyRequestLimit: requestLimit,
        monthlyCostLimitUsd: costLimit,
        notes: notes.trim() || undefined,
      }),
    });
    const payload = await response.json();
    setCreating(false);

    if (!response.ok || !payload?.ok) {
      setError(payload?.error?.message ?? "Falha ao criar API key.");
      return;
    }

    setRevealedSecret(payload.data as SecretPayload);
    setMessage("API key criada. Salve o segredo agora, ele não será exibido novamente.");
    setName("");
    setMonthlyRequestLimit("");
    setMonthlyCostLimitUsd("");
    setNotes("");
    await refreshKeys();
  }

  async function revokeKey(apiKeyId: string) {
    setRevokingId(apiKeyId);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/internal/api-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKeyId }),
    });
    const payload = await response.json();
    setRevokingId(null);

    if (!response.ok || !payload?.ok) {
      setError(payload?.error?.message ?? "Falha ao revogar API key.");
      return;
    }

    setMessage("API key revogada com sucesso.");
    await refreshKeys();
  }

  return (
    <div className="space-y-6">
      <Card
        title="Hub de integração universal"
        subtitle="Use a inteligência da Identiq em site, CRM, ERP, app, backend e qualquer serviço interno ou externo."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Endpoint principal</p>
            <p className="mt-2 break-all text-sm font-medium text-zinc-900">{siteChatUrl}</p>
            <Button
              className="mt-3 w-full"
              variant="secondary"
              onClick={() => copyToClipboard(siteChatUrl)}
            >
              Copiar endpoint
            </Button>
          </div>
          <div className="rounded-xl border border-zinc-200 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Endpoint Responses</p>
            <p className="mt-2 break-all text-sm font-medium text-zinc-900">{responsesUrl}</p>
            <Button
              className="mt-3 w-full"
              variant="secondary"
              onClick={() => copyToClipboard(responsesUrl)}
            >
              Copiar endpoint
            </Button>
          </div>
          <div className="rounded-xl border border-zinc-200 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Autenticação exigida</p>
            <p className="mt-2 text-sm text-zinc-700">`Authorization: Bearer` ou `x-api-key`</p>
            <p className="mt-1 text-xs text-zinc-500">
              Escopo, quota, rate limit e auditoria são validados automaticamente.
            </p>
            <a
              className="mt-3 inline-block text-xs font-medium text-zinc-900 underline underline-offset-2"
              href="/api/openapi"
              target="_blank"
              rel="noreferrer"
            >
              Abrir documentação OpenAPI
            </a>
          </div>
        </div>
      </Card>

      <Card
        title="Criar nova API key"
        subtitle="Defina ambiente, escopos e limites para cada integração com governança e segurança."
      >
        {!canCreate ? (
          <p className="text-sm text-zinc-600">
            Seu perfil não possui permissão para criar chaves. Solicite `apikeys.create`.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Nome da chave</label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Site institucional - produção"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Ambiente</label>
                <Select
                  value={environment}
                  onChange={(event) =>
                    setEnvironment(event.target.value as "development" | "staging" | "production")
                  }
                >
                  <option value="development">development</option>
                  <option value="staging">staging</option>
                  <option value="production">production</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">
                  Limite mensal de requisições (opcional)
                </label>
                <Input
                  value={monthlyRequestLimit}
                  onChange={(event) => setMonthlyRequestLimit(event.target.value)}
                  inputMode="numeric"
                  placeholder="100000"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">
                  Limite mensal de custo em USD (opcional)
                </label>
                <Input
                  value={monthlyCostLimitUsd}
                  onChange={(event) => setMonthlyCostLimitUsd(event.target.value)}
                  inputMode="decimal"
                  placeholder="500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-zinc-600">Observações</label>
                <Textarea
                  className="min-h-20"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Projeto, responsável, política de rotação e uso permitido."
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-zinc-600">Escopos da API key</p>
              <div className="grid gap-2 md:grid-cols-2">
                {availableScopes.map((scope) => (
                  <label
                    key={scope.value}
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
                  >
                    <input
                      type="checkbox"
                      checked={scopes.includes(scope.value)}
                      onChange={() => toggleScope(scope.value)}
                    />
                    <span>{scope.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={createKey} disabled={creating}>
                {creating ? "Gerando..." : "Gerar API key"}
              </Button>
              <Button variant="secondary" onClick={refreshKeys} disabled={loading}>
                {loading ? "Atualizando..." : "Recarregar lista"}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {revealedSecret && (
        <Card
          title="Segredo da API key (exibição única)"
          subtitle="Armazene este valor em um cofre de segredos. Ele não será exibido novamente."
        >
          <p className="break-all rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs text-zinc-900">
            {revealedSecret.key}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="secondary" onClick={() => copyToClipboard(revealedSecret.key)}>
              Copiar segredo
            </Button>
            <span className="text-xs text-zinc-500">Prefixo: {revealedSecret.prefix}</span>
          </div>
        </Card>
      )}

      <Card title="API keys do tenant" subtitle="Gestão completa de chaves por escopo, limite e estado operacional.">
        {keys.length === 0 ? (
          <EmptyState
            title="Nenhuma API key criada"
            description="Crie a primeira chave para habilitar integrações com site, app, CRM, ERP ou qualquer backend."
          />
        ) : (
          <DataTable
            headers={[
              "Nome",
              "Prefixo",
              "Ambiente",
              "Escopos",
              "Limites",
              "Último uso",
              "Status",
              "Ações",
            ]}
          >
            {keys.map((apiKey) => (
              <tr key={apiKey.id}>
                <DataCell>
                  <p className="font-medium text-zinc-900">{apiKey.name}</p>
                  <p className="text-xs text-zinc-500">{formatDate(apiKey.createdAt)}</p>
                </DataCell>
                <DataCell>{apiKey.prefix}</DataCell>
                <DataCell>{apiKey.environment}</DataCell>
                <DataCell className="max-w-72 whitespace-normal text-xs text-zinc-600">
                  {apiKey.scopes.join(", ")}
                </DataCell>
                <DataCell className="text-xs">
                  <p>
                    {apiKey.monthlyRequestLimit
                      ? `${apiKey.monthlyRequestLimit.toLocaleString("pt-BR")} req/mês`
                      : "Req: sem limite"}
                  </p>
                  <p>{`Custo: ${formatCurrency(apiKey.monthlyCostLimitUsd)}`}</p>
                </DataCell>
                <DataCell>{formatDate(apiKey.lastUsedAt)}</DataCell>
                <DataCell>{getStatusBadge(apiKey.status)}</DataCell>
                <DataCell>
                  {canRevoke && apiKey.status === "ACTIVE" ? (
                    <Button
                      variant="danger"
                      className="h-8 px-3 text-xs"
                      disabled={revokingId === apiKey.id}
                      onClick={() => revokeKey(apiKey.id)}
                    >
                      {revokingId === apiKey.id ? "Revogando..." : "Revogar"}
                    </Button>
                  ) : (
                    <span className="text-xs text-zinc-500">-</span>
                  )}
                </DataCell>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>

      <Card
        title="Quickstart de integração"
        subtitle="Escolha endpoint e linguagem para conectar a IA da Identiq em qualquer stack."
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              className="w-64"
              value={snippetTarget}
              onChange={(event) => setSnippetTarget(event.target.value as SnippetTarget)}
            >
              <option value="site_chat">Site Chat (`/api/v1/site/chat`)</option>
              <option value="responses">Responses (`/api/v1/responses`)</option>
            </Select>
            <Select
              className="w-60"
              value={snippetLanguage}
              onChange={(event) => setSnippetLanguage(event.target.value as SnippetLanguage)}
            >
              <option value="curl">cURL</option>
              <option value="js">JavaScript (Node/backend)</option>
              <option value="python">Python (backend)</option>
            </Select>
            <Button variant="secondary" onClick={() => copyToClipboard(snippet)}>
              Copiar snippet
            </Button>
          </div>

          <pre className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-950 p-4 text-xs text-zinc-100">
            <code>{snippet}</code>
          </pre>
        </div>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
    </div>
  );
}
