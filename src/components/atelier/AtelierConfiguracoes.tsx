import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listLocalSettings, putLocalSetting, getLocalIdentity } from "@/lib/local/local-api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AtelierSetting } from "./types";

export function AtelierConfiguracoes({ disabled }: { disabled: boolean }) {
  const queryClient = useQueryClient();
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  const settingsQuery = useQuery({
    queryKey: ["atelier", "settings"],
    queryFn: async () => (await listLocalSettings()).settings as AtelierSetting[],
    enabled: !disabled,
  });

  const identityQuery = useQuery({
    queryKey: ["atelier", "identity"],
    queryFn: () => getLocalIdentity(),
    enabled: !disabled,
  });

  const put = useMutation({
    mutationFn: () => putLocalSetting(key, value),
    onSuccess: () => {
      setKey("");
      setValue("");
      queryClient.invalidateQueries({ queryKey: ["atelier", "settings"] });
    },
  });

  const settings = settingsQuery.data ?? [];

  return (
    <div className="space-y-4">
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
            Facetas (kaline, kharis, kuanyin, coder): referência de identidade herdada do
            ecossistema online — não são chats, áreas comerciais ou clientes separados aqui na
            Kaline Offline. O único chat ativo é o Chat Kaline.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Configurações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="chave"
              value={key}
              disabled={disabled}
              onChange={(e) => setKey(e.target.value)}
            />
            <Input
              placeholder="valor"
              value={value}
              disabled={disabled}
              onChange={(e) => setValue(e.target.value)}
            />
            <Button
              size="sm"
              disabled={disabled || !key.trim() || put.isPending}
              onClick={() => put.mutate()}
            >
              Salvar
            </Button>
          </div>
          <div className="space-y-1">
            {settings.map((s) => (
              <div key={s.key} className="text-sm flex justify-between rounded border p-2">
                <span className="font-mono">{s.key}</span>
                <span className="text-muted-foreground">{s.value_json}</span>
              </div>
            ))}
            {settings.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma configuração ainda.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
