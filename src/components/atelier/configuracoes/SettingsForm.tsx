import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listLocalSettings, putLocalSetting } from "@/lib/local/local-api-client";
import { ATELIER_QUERY_KEYS } from "@/lib/local/query-keys";
import { useAtelier } from "../AtelierContext";
import { AtelierAsync } from "../atelier-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AtelierSetting } from "../types";

export function SettingsForm() {
  const { offline: disabled } = useAtelier();
  const queryClient = useQueryClient();
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  const settingsQuery = useQuery({
    queryKey: ATELIER_QUERY_KEYS.settings,
    queryFn: async () => (await listLocalSettings()).settings as AtelierSetting[],
    enabled: !disabled,
  });

  const put = useMutation({
    mutationFn: () => putLocalSetting(key, value),
    onSuccess: () => {
      setKey("");
      setValue("");
      queryClient.invalidateQueries({ queryKey: ATELIER_QUERY_KEYS.settings });
    },
  });

  const settings = settingsQuery.data ?? [];

  return (
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
        {put.error && (
          <p className="text-xs text-destructive">
            Não foi possível salvar: {(put.error as Error).message}
          </p>
        )}
        <div className="space-y-1">
          <AtelierAsync isLoading={settingsQuery.isLoading} error={settingsQuery.error} rows={2}>
            {settings.map((s) => (
              <div key={s.key} className="text-sm flex justify-between rounded border p-2">
                <span className="font-mono">{s.key}</span>
                <span className="text-muted-foreground">{s.value_json}</span>
              </div>
            ))}
            {settings.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma configuração ainda.</p>
            )}
          </AtelierAsync>
        </div>
      </CardContent>
    </Card>
  );
}
