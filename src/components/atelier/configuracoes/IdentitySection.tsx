import { useQuery } from "@tanstack/react-query";
import { getLocalIdentity } from "@/lib/local/local-api-client";
import { ATELIER_QUERY_KEYS } from "@/lib/local/query-keys";
import { useAtelier } from "../AtelierContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function IdentitySection() {
  const { offline: disabled } = useAtelier();

  const identityQuery = useQuery({
    queryKey: ATELIER_QUERY_KEYS.identity,
    queryFn: () => getLocalIdentity(),
    enabled: !disabled,
  });

  return (
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
          Facetas (kaline, kharis, kuanyin, coder): referência de identidade herdada do ecossistema
          online — não são chats, áreas comerciais ou clientes separados aqui na Kaline Offline. O
          único chat ativo é o Chat Kaline.
        </p>
      </CardContent>
    </Card>
  );
}
