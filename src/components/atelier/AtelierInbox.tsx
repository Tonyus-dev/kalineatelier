import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listLocalInbox, updateLocalInboxEventStatus } from "@/lib/local/local-api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type InboxEvent = {
  id: string;
  source: string;
  type: string;
  title: string | null;
  payload_json: string;
  trust_level: string;
  status: string;
  received_at: string;
};

/**
 * Revisão da Inbox: tudo que chega pela ponte (Olhar de Kairós) ou por captura/transcrição
 * (reuniões) entra aqui como `untrusted`/`pending` e NUNCA é promovido sozinho para Registro
 * Vivo, Jardim, Sedimentos ou Decisões. Aceitar/descartar é sempre ação humana.
 */
export function AtelierInbox({ disabled }: { disabled: boolean }) {
  const queryClient = useQueryClient();

  const inboxQuery = useQuery({
    queryKey: ["atelier", "inbox", "pending"],
    queryFn: async () => (await listLocalInbox("pending")).events as InboxEvent[],
    enabled: !disabled,
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "accepted" | "discarded" }) =>
      updateLocalInboxEventStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["atelier", "inbox", "pending"] }),
  });

  const events = inboxQuery.data ?? [];

  function preview(payloadJson: string): string {
    try {
      const parsed = JSON.parse(payloadJson);
      const text = JSON.stringify(parsed, null, 2);
      return text.length > 600 ? `${text.slice(0, 600)}…` : text;
    } catch {
      return payloadJson;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Revisão da Inbox</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Tudo que vem da ponte ou de transcrições entra como <strong>não confiável</strong> e
          pendente. Nada é aplicado automaticamente — você aceita ou descarta.
        </p>
        {events.map((e) => (
          <div key={e.id} className="space-y-2 rounded border p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{e.title ?? e.type}</span>
              <span className="text-[10px] uppercase text-muted-foreground">
                {e.source} · {e.trust_level}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {new Date(e.received_at).toLocaleString("pt-BR")}
            </p>
            <pre className="max-h-40 overflow-auto rounded bg-muted/40 p-2 text-[11px] whitespace-pre-wrap">
              {preview(e.payload_json)}
            </pre>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={disabled || update.isPending}
                onClick={() => update.mutate({ id: e.id, status: "accepted" })}
              >
                Aceitar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={disabled || update.isPending}
                onClick={() => update.mutate({ id: e.id, status: "discarded" })}
              >
                Descartar
              </Button>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum evento pendente na inbox.</p>
        )}
      </CardContent>
    </Card>
  );
}
