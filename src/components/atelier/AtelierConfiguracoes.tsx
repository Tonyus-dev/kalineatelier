import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listLocalSettings,
  putLocalSetting,
  getLocalIdentity,
  checkLocalHealth,
  getLocalModelStatus,
  getLocalBridgeStatus,
} from "@/lib/local/local-api-client";
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

  const healthQuery = useQuery({
    queryKey: ["atelier", "health"],
    queryFn: () => checkLocalHealth(),
    enabled: !disabled,
    refetchInterval: 15000,
  });

  const modelStatusQuery = useQuery({
    queryKey: ["atelier", "model-status"],
    queryFn: () => getLocalModelStatus(),
    enabled: !disabled,
  });

  const bridgeStatusQuery = useQuery({
    queryKey: ["atelier", "bridge-status"],
    queryFn: () => getLocalBridgeStatus(),
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

  const health = healthQuery.data;
  const apiOk = health?.ok === true;
  const sqliteOk = apiOk; // /health falha por completo se o SQLite estiver com erro
  const model = modelStatusQuery.data;
  const bridge = bridgeStatusQuery.data;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Status — Conexões e Modelos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">API local</span>
            <span>{healthQuery.isLoading ? "verificando…" : apiOk ? "ativa" : "inativa"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Banco local (SQLite)</span>
            <span>{healthQuery.isLoading ? "verificando…" : sqliteOk ? "pronto" : "erro"}</span>
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
