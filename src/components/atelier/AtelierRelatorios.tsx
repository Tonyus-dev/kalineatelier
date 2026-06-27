import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { listLocalReports, generateLocalReport } from "@/lib/local/local-api-client";
import { ATELIER_QUERY_KEYS } from "@/lib/local/query-keys";
import { useAtelier } from "./AtelierContext";
import { AtelierAsync } from "./atelier-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AtelierReport } from "./types";

export function AtelierRelatorios() {
  const { offline: disabled } = useAtelier();
  const queryClient = useQueryClient();

  const reportsQuery = useQuery({
    queryKey: ATELIER_QUERY_KEYS.reports,
    queryFn: async () => (await listLocalReports()).reports as AtelierReport[],
    enabled: !disabled,
  });

  const generate = useMutation({
    mutationFn: () => generateLocalReport(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ATELIER_QUERY_KEYS.reports }),
  });

  const reports = reportsQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Relatórios</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          size="sm"
          disabled={disabled || generate.isPending}
          onClick={() => generate.mutate()}
        >
          Gerar relatório
        </Button>
        <div className="space-y-4 max-h-96 overflow-auto">
          <AtelierAsync isLoading={reportsQuery.isLoading} error={reportsQuery.error}>
            {reports.map((r) => (
              <div key={r.id} className="rounded border p-3">
                <p className="text-sm font-medium mb-2">
                  {r.title} <span className="text-muted-foreground">({r.kind})</span>
                </p>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{r.content_md}</ReactMarkdown>
                </div>
              </div>
            ))}
            {reports.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum relatório gerado ainda.</p>
            )}
          </AtelierAsync>
        </div>
      </CardContent>
    </Card>
  );
}
