"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type TrainingDocument = {
  id: string;
  title: string;
  status: string;
  approved: boolean;
};

type TrainingCenterProps = {
  documents: TrainingDocument[];
  canUpload: boolean;
  canApprove: boolean;
  canIndex: boolean;
};

type ApiResponse = {
  ok: boolean;
  requestId?: string;
  data?: unknown;
  error?: {
    code: string;
    message: string;
  };
};

const categories = [
  "KYC",
  "AML",
  "Biometria",
  "Face Match",
  "Documentoscopia",
  "Device Fingerprint",
  "Compliance",
  "FAQ Comercial",
  "FAQ Técnico",
  "FAQ Institucional",
  "Políticas Internas",
  "Operações",
  "Integrações",
  "Suporte",
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function KnowledgeTrainingCenter({
  documents,
  canUpload,
  canApprove,
  canIndex,
}: TrainingCenterProps) {
  const router = useRouter();

  const [uploadLoading, setUploadLoading] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [uploadCategory, setUploadCategory] = useState("Operações");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadSupplementalContext, setUploadSupplementalContext] = useState("");
  const [uploadSensitivity, setUploadSensitivity] = useState("INTERNAL");
  const [uploadVisibility, setUploadVisibility] = useState("TENANT");
  const [uploadAutoApprove, setUploadAutoApprove] = useState(canApprove);
  const [uploadAutoIndex, setUploadAutoIndex] = useState(canIndex);
  const [uploadChunkSize, setUploadChunkSize] = useState("800");
  const [uploadOverlap, setUploadOverlap] = useState("120");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  const [manualTitle, setManualTitle] = useState("");
  const [manualCategory, setManualCategory] = useState("Operações");
  const [manualDescription, setManualDescription] = useState("");
  const [manualTags, setManualTags] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [manualVisibility, setManualVisibility] = useState("TENANT");
  const [manualSensitivity, setManualSensitivity] = useState("INTERNAL");
  const [manualAutoApprove, setManualAutoApprove] = useState(canApprove);
  const [manualAutoIndex, setManualAutoIndex] = useState(canIndex);
  const [manualChunkSize, setManualChunkSize] = useState("800");
  const [manualOverlap, setManualOverlap] = useState("120");

  const [selectedDocumentId, setSelectedDocumentId] = useState(documents[0]?.id ?? "");

  const selectedDocument = useMemo(
    () => documents.find((item) => item.id === selectedDocumentId) ?? null,
    [documents, selectedDocumentId]
  );

  async function parseResponse(response: Response) {
    const payload = (await response.json()) as ApiResponse;
    if (!payload.ok) {
      throw new Error(payload.error?.message ?? "Falha na operação.");
    }
    return payload;
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!uploadFiles.length) {
      setFeedback({ type: "error", text: "Selecione ao menos um arquivo para enviar." });
      return;
    }

    if (uploadAutoIndex && !uploadAutoApprove) {
      setFeedback({ type: "error", text: "Para indexação automática, ative também a aprovação automática." });
      return;
    }

    setUploadLoading(true);
    let successCount = 0;
    let failureCount = 0;
    let lastError = "";

    for (const file of uploadFiles) {
      const formData = new FormData();
      const generatedTitle = file.name.replace(/\.[^/.]+$/, "");

      formData.append("title", generatedTitle);
      formData.append("category", uploadCategory);
      formData.append("description", uploadDescription);
      formData.append("tags", uploadTags);
      formData.append("supplementalContext", uploadSupplementalContext);
      formData.append("visibility", uploadVisibility);
      formData.append("sensitivity", uploadSensitivity);
      formData.append("autoApprove", String(uploadAutoApprove));
      formData.append("autoIndex", String(uploadAutoIndex));
      formData.append("chunkSize", uploadChunkSize);
      formData.append("overlap", uploadOverlap);
      formData.append("source", "training_center_upload");
      formData.append("file", file);

      try {
        const response = await fetch("/api/internal/knowledge", {
          method: "POST",
          body: formData,
        });
        await parseResponse(response);
        successCount += 1;
      } catch (error) {
        failureCount += 1;
        lastError = error instanceof Error ? error.message : "Erro inesperado no upload.";
      }
    }

    setUploadLoading(false);
    setUploadFiles([]);

    if (failureCount === 0) {
      setFeedback({
        type: "success",
        text: `${successCount} arquivo(s) enviado(s) para a central de treinamento com sucesso.`,
      });
    } else {
      setFeedback({
        type: successCount > 0 ? "success" : "error",
        text:
          successCount > 0
            ? `${successCount} arquivo(s) enviado(s). ${failureCount} falharam: ${lastError}`
            : `Falha no upload: ${lastError}`,
      });
    }

    router.refresh();
  }

  async function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!manualTitle.trim() || manualContent.trim().length < 20) {
      setFeedback({
        type: "error",
        text: "Informe título e conteúdo manual com no mínimo 20 caracteres.",
      });
      return;
    }

    if (manualAutoIndex && !manualAutoApprove) {
      setFeedback({ type: "error", text: "Para indexação automática, ative também a aprovação automática." });
      return;
    }

    setManualLoading(true);

    try {
      const response = await fetch("/api/internal/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: manualTitle.trim(),
          slug: `${slugify(manualTitle)}-${Date.now()}`,
          category: manualCategory,
          description: manualDescription || undefined,
          tags: manualTags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          language: "pt-BR",
          visibility: manualVisibility,
          sensitivity: manualSensitivity,
          source: "training_center_manual",
          content: manualContent.trim(),
          autoApprove: manualAutoApprove,
          autoIndex: manualAutoIndex,
          chunkSize: Number(manualChunkSize),
          overlap: Number(manualOverlap),
        }),
      });

      await parseResponse(response);
      setFeedback({ type: "success", text: "Base manual adicionada e pronta para treino." });
      setManualTitle("");
      setManualDescription("");
      setManualTags("");
      setManualContent("");
      router.refresh();
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Falha ao salvar conteúdo manual.",
      });
    } finally {
      setManualLoading(false);
    }
  }

  async function runAction(action: "APPROVE" | "INDEX") {
    if (!selectedDocumentId) {
      setFeedback({ type: "error", text: "Selecione um documento para executar a ação." });
      return;
    }

    setActionLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/internal/knowledge", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: selectedDocumentId,
          action,
          useLocal: true,
          embeddingModel: "local-embedding-v1",
          chunkSize: 800,
          overlap: 120,
        }),
      });
      await parseResponse(response);

      setFeedback({
        type: "success",
        text: action === "APPROVE" ? "Documento aprovado com sucesso." : "Indexação local iniciada/concluída com sucesso.",
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Falha ao executar ação no documento.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  if (!canUpload) {
    return (
      <Card
        title="Central de Treinamento"
        subtitle="Seu perfil atual não possui permissão para alimentar a inteligência da plataforma."
      >
        <p className="text-sm text-zinc-600">
          Solicite os acessos <code>knowledge.upload</code>, <code>knowledge.approve</code> e{" "}
          <code>knowledge.reindex</code> para operar ingestão completa.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card
        title="Central de Treinamento da IA"
        subtitle="Envie documentos, fotos e conteúdo manual para aumentar a base de conhecimento e melhorar a recuperação contextual."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <form className="space-y-3 rounded-xl border border-zinc-200 p-4" onSubmit={handleUpload}>
            <h4 className="text-sm font-semibold text-zinc-900">Upload de arquivos e fotos</h4>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Arquivos</label>
              <Input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp"
                onChange={(event) => setUploadFiles(Array.from(event.target.files ?? []))}
              />
              <p className="mt-1 text-xs text-zinc-500">
                Tipos aceitos: PDF, DOCX, TXT, JPG, PNG e WEBP. Limite por arquivo: 25MB.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Categoria</label>
              <Select value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value)}>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Descrição</label>
              <Input
                value={uploadDescription}
                onChange={(event) => setUploadDescription(event.target.value)}
                placeholder="Contexto objetivo sobre esse conjunto de arquivos."
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Tags (separadas por vírgula)</label>
              <Input
                value={uploadTags}
                onChange={(event) => setUploadTags(event.target.value)}
                placeholder="onboarding, documento, política"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">
                Contexto complementar (obrigatório para fotos sem texto)
              </label>
              <Textarea
                className="min-h-20"
                value={uploadSupplementalContext}
                onChange={(event) => setUploadSupplementalContext(event.target.value)}
                placeholder="Descreva o que a imagem representa, regras e contexto operacional."
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Visibilidade</label>
                <Select value={uploadVisibility} onChange={(event) => setUploadVisibility(event.target.value)}>
                  <option value="TENANT">Tenant</option>
                  <option value="GLOBAL">Global</option>
                  <option value="PRIVATE">Privado</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Sensibilidade</label>
                <Select value={uploadSensitivity} onChange={(event) => setUploadSensitivity(event.target.value)}>
                  <option value="PUBLIC">Público</option>
                  <option value="INTERNAL">Interno</option>
                  <option value="PII">PII</option>
                  <option value="SENSITIVE">Sensível</option>
                  <option value="BIOMETRIC">Biométrico</option>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Chunk size</label>
                <Input
                  value={uploadChunkSize}
                  onChange={(event) => setUploadChunkSize(event.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Overlap</label>
                <Input
                  value={uploadOverlap}
                  onChange={(event) => setUploadOverlap(event.target.value)}
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="grid gap-2 text-xs text-zinc-600">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300"
                  checked={uploadAutoApprove}
                  disabled={!canApprove}
                  onChange={(event) => setUploadAutoApprove(event.target.checked)}
                />
                Aprovar automaticamente
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300"
                  checked={uploadAutoIndex}
                  disabled={!canIndex}
                  onChange={(event) => setUploadAutoIndex(event.target.checked)}
                />
                Indexar automaticamente (embeddings locais)
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={uploadLoading}>
              {uploadLoading ? "Enviando arquivos..." : "Enviar para treino"}
            </Button>
          </form>

          <form className="space-y-3 rounded-xl border border-zinc-200 p-4" onSubmit={handleManualSubmit}>
            <h4 className="text-sm font-semibold text-zinc-900">Base manual (treino textual)</h4>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Título</label>
              <Input
                value={manualTitle}
                onChange={(event) => setManualTitle(event.target.value)}
                placeholder="Procedimento de revisão documental para onboarding PJ"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Categoria</label>
              <Select value={manualCategory} onChange={(event) => setManualCategory(event.target.value)}>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Descrição</label>
              <Input
                value={manualDescription}
                onChange={(event) => setManualDescription(event.target.value)}
                placeholder="Resumo rápido do objetivo desse conteúdo."
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Tags (separadas por vírgula)</label>
              <Input
                value={manualTags}
                onChange={(event) => setManualTags(event.target.value)}
                placeholder="kyc, revisão, risco"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Visibilidade</label>
                <Select value={manualVisibility} onChange={(event) => setManualVisibility(event.target.value)}>
                  <option value="TENANT">Tenant</option>
                  <option value="GLOBAL">Global</option>
                  <option value="PRIVATE">Privado</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Sensibilidade</label>
                <Select value={manualSensitivity} onChange={(event) => setManualSensitivity(event.target.value)}>
                  <option value="PUBLIC">Público</option>
                  <option value="INTERNAL">Interno</option>
                  <option value="PII">PII</option>
                  <option value="SENSITIVE">Sensível</option>
                  <option value="BIOMETRIC">Biométrico</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Conteúdo base</label>
              <Textarea
                value={manualContent}
                onChange={(event) => setManualContent(event.target.value)}
                placeholder="Insira regras, fluxos, FAQ, políticas e orientações operacionais completas."
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Chunk size</label>
                <Input
                  value={manualChunkSize}
                  onChange={(event) => setManualChunkSize(event.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Overlap</label>
                <Input
                  value={manualOverlap}
                  onChange={(event) => setManualOverlap(event.target.value)}
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="grid gap-2 text-xs text-zinc-600">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300"
                  checked={manualAutoApprove}
                  disabled={!canApprove}
                  onChange={(event) => setManualAutoApprove(event.target.checked)}
                />
                Aprovar automaticamente
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300"
                  checked={manualAutoIndex}
                  disabled={!canIndex}
                  onChange={(event) => setManualAutoIndex(event.target.checked)}
                />
                Indexar automaticamente (embeddings locais)
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={manualLoading}>
              {manualLoading ? "Salvando conteúdo..." : "Adicionar à base de treino"}
            </Button>
          </form>
        </div>

        {feedback && (
          <div className="mt-4">
            <Badge
              label={feedback.text}
              variant={feedback.type === "success" ? "success" : "danger"}
            />
          </div>
        )}
      </Card>

      <Card
        title="Ações rápidas em documentos"
        subtitle="Aprove ou indexe documentos já enviados para acelerar o treinamento sem depender de provider externo."
      >
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <Select value={selectedDocumentId} onChange={(event) => setSelectedDocumentId(event.target.value)}>
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.title} ({document.status})
              </option>
            ))}
          </Select>

          <Button
            type="button"
            variant="secondary"
            disabled={actionLoading || !canApprove || !selectedDocumentId}
            onClick={() => runAction("APPROVE")}
          >
            Aprovar
          </Button>

          <Button
            type="button"
            disabled={actionLoading || !canIndex || !selectedDocumentId}
            onClick={() => runAction("INDEX")}
          >
            Indexar local
          </Button>
        </div>

        {selectedDocument && (
          <p className="mt-3 text-xs text-zinc-500">
            Documento selecionado: <strong>{selectedDocument.title}</strong> | status:{" "}
            <strong>{selectedDocument.status}</strong> | aprovado:{" "}
            <strong>{selectedDocument.approved ? "sim" : "não"}</strong>
          </p>
        )}
      </Card>
    </div>
  );
}
