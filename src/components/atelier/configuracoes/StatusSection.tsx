import { useQuery } from "@tanstack/react-query";
import { getLocalModelStatus, getLocalBridgeStatus } from "@/lib/local/local-api-client";
import { ATELIER_QUERY_KEYS } from "@/lib/local/query-keys";
import { useAtelier } from "../AtelierContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Visão geral de conexões e modelos. Usa o health compartilhado do contexto. */
export function StatusSection() {
  const { health, isLoading, offline } = useAtelier();
  const apiOk = health?.ok === true;

  const modelStatusQuery = useQuery({
    queryKey: ATELIER_QUERY_KEYS.modelStatus,
    queryFn: () => getLocalModelStatus(),
    enabled: !offline,
  });

  const bridgeStatusQuery = useQuery({
    queryKey: ATELIER_QUERY_KEYS.bridgeStatus,
    queryFn: () => getLocalBridgeStatus(),
    enabled: !offline,
  });

  const model = modelStatusQuery.data;
  const bridge = bridgeStatusQuery.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Status — Conexões e Modelos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">API local</span>
          <span>{isLoading ? "verificando…" : apiOk ? "ativa" : "inativa"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Banco local (SQLite)</span>
          <span>{isLoading ? "verificando…" : apiOk ? "pronto" : "erro"}</span>
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
  );
}
