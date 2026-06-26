import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listLocalRegistros,
  createLocalRegistro,
  archiveLocalRegistro,
} from "@/lib/local/local-api-client";
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

const KINDS = [
  "nota",
  "evento",
  "sentimento",
  "ideia",
  "dor",
  "ganho",
  "sonho",
  "pergunta",
  "decisao",
];

export function AtelierRegistro({ disabled }: { disabled: boolean }) {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState(KINDS[0]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const registrosQuery = useQuery({
    queryKey: ["atelier", "registros"],
    queryFn: async () => (await listLocalRegistros()).registros as AtelierRegistroRow[],
    enabled: !disabled,
  });

  const create = useMutation({
    mutationFn: () => createLocalRegistro({ kind, title, content }),
    onSuccess: () => {
      setTitle("");
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["atelier", "registros"] });
    },
  });

  const archive = useMutation({
    mutationFn: (id: string) => archiveLocalRegistro(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["atelier", "registros"] }),
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
              {KINDS.map((k) => (
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
        <Button
          size="sm"
          disabled={disabled || !title.trim() || !content.trim() || create.isPending}
          onClick={() => create.mutate()}
        >
          Adicionar registro
        </Button>

        <div className="space-y-2 max-h-96 overflow-auto">
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
        </div>
      </CardContent>
    </Card>
  );
}
