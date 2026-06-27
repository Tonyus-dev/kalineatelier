import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listLocalRegistros,
  createLocalRegistro,
  archiveLocalRegistro,
} from "@/lib/local/local-api-client";
import { ATELIER_QUERY_KEYS } from "@/lib/local/query-keys";
import { REGISTRO_KINDS } from "@/lib/local/registro-kinds";
import { useAtelier } from "./AtelierContext";
import { AtelierAsync } from "./atelier-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AtelierRegistro as AtelierRegistroRow } from "./types";

export function AtelierRegistro() {
  const { offline: disabled } = useAtelier();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<string>(REGISTRO_KINDS[0]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const registrosQuery = useQuery({
    queryKey: ATELIER_QUERY_KEYS.registros,
    queryFn: async () => (await listLocalRegistros()).registros as AtelierRegistroRow[],
    enabled: !disabled,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ATELIER_QUERY_KEYS.registros });

  const create = useMutation({
    mutationFn: () => createLocalRegistro({ kind, title, content }),
    onSuccess: () => {
      setTitle("");
      setContent("");
      invalidate();
    },
  });

  const archive = useMutation({
    mutationFn: (id: string) => archiveLocalRegistro(id),
    onSuccess: invalidate,
  });

  const registros = registrosQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Registro Vivo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="w-40" disabled={disabled}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGISTRO_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Título"
            value={title}
            disabled={disabled}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <Textarea
          placeholder="Conteúdo"
          value={content}
          disabled={disabled}
          onChange={(e) => setContent(e.target.value)}
        />
        {create.error && (
          <p className="text-xs text-destructive">
            Não foi possível salvar: {(create.error as Error).message}
          </p>
        )}
        <Button
          size="sm"
          disabled={disabled || !title.trim() || !content.trim() || create.isPending}
          onClick={() => create.mutate()}
        >
          Adicionar registro
        </Button>

        <div className="space-y-2 max-h-96 overflow-auto">
          <AtelierAsync isLoading={registrosQuery.isLoading} error={registrosQuery.error}>
            {registros.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-2 rounded border p-2">
                <div>
                  <p className="text-sm font-medium">
                    [{r.kind}] {r.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{r.content}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={disabled || archive.isPending}
                  onClick={() => archive.mutate(r.id)}
                >
                  Arquivar
                </Button>
              </div>
            ))}
            {registros.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum registro ainda.</p>
            )}
          </AtelierAsync>
        </div>
      </CardContent>
    </Card>
  );
}
