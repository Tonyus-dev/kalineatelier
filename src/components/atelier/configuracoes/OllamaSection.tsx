import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getLocalModelStatus,
  testLocalModel,
  testLocalVision,
  type LocalTestResult,
  type LocalVisionResult,
} from "@/lib/local/local-api-client";
import { ATELIER_QUERY_KEYS } from "@/lib/local/query-keys";
import { fileToBase64 } from "@/lib/local/file-utils";
import { useAtelier } from "../AtelierContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function modelName(model: unknown): string {
  if (model && typeof model === "object" && "name" in model) {
    return String((model as { name: unknown }).name);
  }
  return model ? String(model) : "—";
}

export function OllamaSection() {
  const { offline: disabled } = useAtelier();

  const modelStatusQuery = useQuery({
    queryKey: ATELIER_QUERY_KEYS.modelStatus,
    queryFn: () => getLocalModelStatus(),
    enabled: !disabled,
  });
  const model = modelStatusQuery.data;

  const [textTestResult, setTextTestResult] = useState<LocalTestResult | null>(null);
  const textTest = useMutation({
    mutationFn: () => testLocalModel(),
    onSuccess: setTextTestResult,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [visionTestResult, setVisionTestResult] = useState<LocalVisionResult | null>(null);
  const visionTest = useMutation({
    mutationFn: async () => {
      if (!imageFile) throw new Error("Selecione uma imagem.");
      const imageBase64 = await fileToBase64(imageFile);
      return testLocalVision({ imageBase64 });
    },
    onSuccess: setVisionTestResult,
  });

  return (
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
          <span className="font-mono text-xs">{modelName(model?.models?.general)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Modelo visão</span>
          <span className="font-mono text-xs">{modelName(model?.models?.vision)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status</span>
          <span>{model?.available ? "disponível" : "indisponível"}</span>
        </div>
        {!model?.available && model?.provider === "ollama" && (
          <p className="text-xs text-muted-foreground pt-1">
            Abra o Ollama e rode: ollama pull {modelName(model?.models?.general)}
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
  );
}
