import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listLocalMemories, reviewLocalMemoria } from "@/lib/local/local-api-client";
import { ATELIER_QUERY_KEYS } from "@/lib/local/query-keys";
import { useAtelier } from "./AtelierContext";
import { AtelierAsync } from "./atelier-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AtelierMemoria } from "./types";

const QUALITIES: { quality: string; label: string }[] = [
  { quality: "errei", label: "Errei" },
  { quality: "dificil", label: "Difícil" },
  { quality: "ok", label: "Ok" },
  { quality: "facil", label: "Fácil" },
];

export function AtelierJardim() {
  const { offline: disabled } = useAtelier();
  const queryClient = useQueryClient();

  const memoriasQuery = useQuery({
    queryKey: ATELIER_QUERY_KEYS.memorias,
    queryFn: async () => (await listLocalMemories()).memories as AtelierMemoria[],
    enabled: !disabled,
  });

  const review = useMutation({
    mutationFn: ({ id, quality }: { id: string; quality: string }) =>
      reviewLocalMemoria(id, quality),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ATELIER_QUERY_KEYS.memorias }),
  });

  const memorias = memoriasQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Jardim de Memórias</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <AtelierAsync isLoading={memoriasQuery.isLoading} error={memoriasQuery.error}>
          {memorias.map((m) => (
            <div key={m.id} className="space-y-1 rounded border p-2">
              <p className="text-sm font-medium">{m.title}</p>
              <p className="text-sm text-muted-foreground">{m.content}</p>
              <p className="text-xs text-muted-foreground">
                revisões: {m.review_count} · intervalo: {m.interval_days}d · vence:{" "}
                {m.due_at ?? "—"}
              </p>
              <div className="flex gap-1">
                {QUALITIES.map((q) => (
                  <Button
                    key={q.quality}
                    size="sm"
                    variant="outline"
                    disabled={disabled || review.isPending}
                    onClick={() => review.mutate({ id: m.id, quality: q.quality })}
                  >
                    {q.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
          {memorias.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhuma memória ainda.</p>
          )}
        </AtelierAsync>
      </CardContent>
    </Card>
  );
}
