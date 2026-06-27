import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listLocalSettings,
  putLocalSetting,
  getLocalIdentity,
  checkLocalHealth,
  getLocalModelStatus,
  getLocalBridgeStatus,
  getLocalTranscribeStatus,
  testLocalModel,
  testLocalVision,
  transcribeLocalFile,
  type LocalTestResult,
  type LocalVisionResult,
  type LocalTranscribeResult,
} from "@/lib/local/local-api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AtelierSetting } from "./types";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function AtelierConfiguracoes({ disabled }: { disabled: boolean }) {
  const queryClient = useQueryClient();
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  const settingsQuery = useQuery({
    queryKey: ["atelier", "settings"],
    queryFn: async () => (await listLocalSettings()).settings as AtelierSetting[],
    enabled: !disabled,
  });

  const identityQuery = useQuery({
    queryKey: ["atelier", "identity"],
    queryFn: () => getLocalIdentity(),
    enabled: !disabled,
  });

  const healthQuery = useQuery({
    queryKey: ["atelier", "health"],
    queryFn: () => checkLocalHealth(),
    enabled: !disabled,
    refetchInterval: 15000,
  });

  const modelStatusQuery = useQuery({
    queryKey: ["atelier", "model-status"],
    queryFn: () => getLocalModelStatus(),
    enabled: !disabled,
  });

  const bridgeStatusQuery = useQuery({
    queryKey: ["atelier", "bridge-status"],
    queryFn: () => getLocalBridgeStatus(),
    enabled: !disabled,
  });

  const transcribeStatusQuery = useQuery({
    queryKey: ["atelier", "transcribe-status"],
    queryFn: () => getLocalTranscribeStatus(),
    enabled: !disabled,
  });

  const put = useMutation({
    mutationFn: () => putLocalSetting(key, value),
    onSuccess: () => {
      setKey("");
      setValue("");
      queryClient.invalidateQueries({ queryKey: ["atelier", "settings"] });
    },
  });

  const [textTestResult, setTextTestResult] = useState<LocalTestResult | null>(null);
  const textTest = useMutation({
    mutationFn: () => testLocalModel(),
    onSuccess: (result) => setTextTestResult(result),
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [visionTestResult, setVisionTestResult] = useState<LocalVisionResult | null>(null);
  const visionTest = useMutation({
    mutationFn: async () => {
      if (!imageFile) throw new Error("Selecione uma imagem.");
      const imageBase64 = await fileToBase64(imageFile);
      return testLocalVision({ imageBase64 });
    },
    onSuccess: (result) => setVisionTestResult(result),
  });

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcribeResult, setTranscribeResult] = useState<LocalTranscribeResult | null>(null);
  const transcribeTest = useMutation({
    mutationFn: async () => {
      if (!audioFile) throw new Error("Selecione um arquivo de áudio.");
      return transcribeLocalFile(audioFile);
    },
    onSuccess: (result) => setTranscribeResult(result),
  });

  const settings = settingsQuery.data ?? [];
  const transcribeStatus = transcribeStatusQuery.data;

  const health = healthQuery.data;
  const apiOk = health?.ok === true;
  const sqliteOk = apiOk; // /health falha por completo se o SQLite estiver com erro
  const model = modelStatusQuery.data;
  const bridge = bridgeStatusQuery.data;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Status — Conexões e Modelos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">API local</span>
            <span>{healthQuery.isLoading ? "verificando…" : apiOk ? "ativa" : "inativa"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Banco local (SQLite)</span>
            <span>{healthQuery.isLoading ? "verificando…" : sqliteOk ? "pronto" : "erro"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">IA</span>
            <span>
              {model ? `${model.provider}${model.configured ? "" : " (não configurado)"}` : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ponte com a nuvem</span>
            <span>{bridge ? (bridge.mode === "disabled" ? "desativada" : bridge.mode) : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Túnel</span>
            <span>não implementado</span>
          </div>
          {model?.message && <p className="text-xs text-muted-foreground pt-1">{model.message}</p>}
          {bridge?.message && <p className="text-xs text-muted-foreground">{bridge.message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">IA local — Ollama</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Provider</span>
            <span>{model?.provider ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Base URL</span>
            <span className="font-mono text-xs">{model?.baseUrl ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Modelo geral</span>
            <span className="font-mono text-xs">
              {typeof model?.models?.general === "object"
                ? model.models.general.name
                : (model?.models?.general ?? "—")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Modelo visão</span>
            <span className="font-mono text-xs">
              {typeof model?.models?.vision === "object"
                ? model.models.vision.name
                : (model?.models?.vision ?? "—")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span>{model?.available ? "disponível" : "indisponível"}</span>
          </div>
          {!model?.available && model?.provider === "ollama" && (
            <p className="text-xs text-muted-foreground pt-1">
              Abra o Ollama e rode: ollama pull {String(model?.models?.general ?? "qwen3.5:4b")}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              disabled={disabled || textTest.isPending}
              onClick={() => textTest.mutate()}
            >
              Testar modelo local
            </Button>
          </div>
          {textTestResult && (
            <p className="text-xs text-muted-foreground pt-1">
              {textTestResult.ok
                ? `${textTestResult.text}${textTestResult.fallback ? ` (fallback mock: ${textTestResult.warning})` : ""}`
                : `Erro: ${textTestResult.message}`}
            </p>
          )}

          <div className="flex gap-2 items-center pt-2">
            <input
              type="file"
              accept="image/*"
              disabled={disabled}
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={disabled || !imageFile || visionTest.isPending}
              onClick={() => visionTest.mutate()}
            >
              Enviar imagem para teste
            </Button>
          </div>
          {visionTestResult && (
            <p className="text-xs text-muted-foreground pt-1">
              {visionTestResult.ok ? visionTestResult.text : `Erro: ${visionTestResult.message}`}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Whisper — transcrição local</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Provider</span>
            <span>{transcribeStatus?.provider ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Modelo</span>
            <span className="font-mono text-xs">
              {transcribeStatus?.available ? transcribeStatus.model.split("/").pop() : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Idioma</span>
            <span>{transcribeStatus?.available ? transcribeStatus.language : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span>{transcribeStatus?.available ? "disponível" : "indisponível"}</span>
          </div>
          {!transcribeStatus?.available && (
            <p className="text-xs text-muted-foreground pt-1">
              Verifique WHISPER_CPP_BIN e WHISPER_CPP_MODEL no .env do local-server.
            </p>
          )}

          <div className="flex gap-2 items-center pt-2">
            <input
              type="file"
              accept="audio/*"
              disabled={disabled}
              onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
              className="text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={disabled || !audioFile || transcribeTest.isPending}
              onClick={() => transcribeTest.mutate()}
            >
              Enviar áudio para transcrição
            </Button>
          </div>
          {transcribeResult && (
            <p className="text-xs text-muted-foreground pt-1">
              {transcribeResult.ok ? transcribeResult.text : `Erro: ${transcribeResult.message}`}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Identidade (somente leitura)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-sm">{identityQuery.data?.summary ?? "—"}</p>
          <p className="text-xs text-muted-foreground">
            Fontes: {identityQuery.data?.sources.join(", ") ?? "—"}
          </p>
          <p className="text-xs text-muted-foreground pt-2">
            Facetas (kaline, kharis, kuanyin, coder): referência de identidade herdada do
            ecossistema online — não são chats, áreas comerciais ou clientes separados aqui na
            Kaline Offline. O único chat ativo é o Chat Kaline.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Configurações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="chave"
              value={key}
              disabled={disabled}
              onChange={(e) => setKey(e.target.value)}
            />
            <Input
              placeholder="valor"
              value={value}
              disabled={disabled}
              onChange={(e) => setValue(e.target.value)}
            />
            <Button
              size="sm"
              disabled={disabled || !key.trim() || put.isPending}
              onClick={() => put.mutate()}
            >
              Salvar
            </Button>
          </div>
          <div className="space-y-1">
            {settings.map((s) => (
              <div key={s.key} className="text-sm flex justify-between rounded border p-2">
                <span className="font-mono">{s.key}</span>
                <span className="text-muted-foreground">{s.value_json}</span>
              </div>
            ))}
            {settings.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma configuração ainda.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
