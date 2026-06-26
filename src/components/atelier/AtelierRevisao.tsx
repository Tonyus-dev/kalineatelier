import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listLocalSediments,
  confirmLocalSediment,
  discardLocalSediment,
} from "@/lib/local/local-api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AtelierSedimento } from "./types";

export function AtelierRevisao({ disabled }: { disabled: boolean }) {
  const queryClient = useQueryClient();

  const sedimentosQuery = useQuery({
    queryKey: ["atelier", "sedimentos", "em_revisao"],
    queryFn: async () => (await listLocalSediments("em_revisao")).sediments as AtelierSedimento[],
    enabled: !disabled,
  });

  const confirm = useMutation({
    mutationFn: (id: string) => confirmLocalSediment(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["atelier", "sedimentos", "em_revisao"] }),
  });

  const discard = useMutation({
    mutationFn: (id: string) => discardLocalSediment(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["atelier", "sedimentos", "em_revisao"] }),
  });

  const sedimentos = sedimentosQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Revisão de Sedimentos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Sedimento é hipótese. Sedimentação não confirma verdade.
        </p>
        {sedimentos.map((s) => (
          <div key={s.id} className="space-y-1 rounded border p-2">
            <p className="text-sm">
              (nível {s.level}) {s.content}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={disabled || confirm.isPending}
                onClick={() => confirm.mutate(s.id)}
              >
                Confirmar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={disabled || discard.isPending}
                onClick={() => discard.mutate(s.id)}
              >
                Descartar
              </Button>
            </div>
          </div>
        ))}
        {sedimentos.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum sedimento em revisão.</p>
        )}
      </CardContent>
    </Card>
  );
}
