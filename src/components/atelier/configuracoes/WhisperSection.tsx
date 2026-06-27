import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getLocalTranscribeStatus,
  transcribeLocalFile,
  type LocalTranscribeResult,
} from "@/lib/local/local-api-client";
import { ATELIER_QUERY_KEYS } from "@/lib/local/query-keys";
import { useAtelier } from "../AtelierContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WhisperSection() {
  const { offline: disabled } = useAtelier();

  const transcribeStatusQuery = useQuery({
    queryKey: ATELIER_QUERY_KEYS.transcribeStatus,
    queryFn: () => getLocalTranscribeStatus(),
    enabled: !disabled,
  });
  const transcribeStatus = transcribeStatusQuery.data;

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcribeResult, setTranscribeResult] = useState<LocalTranscribeResult | null>(null);
  const transcribeTest = useMutation({
    mutationFn: async () => {
      if (!audioFile) throw new Error("Selecione um arquivo de áudio.");
      return transcribeLocalFile(audioFile);
    },
    onSuccess: setTranscribeResult,
  });

  return (
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
  );
}
