import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listLocalSettings, putLocalSetting } from "@/lib/local/local-api-client";
import { ATELIER_QUERY_KEYS } from "@/lib/local/query-keys";
import { hashPin } from "@/lib/local/pin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { AtelierSetting } from "./types";

const PIN_SETTING_KEY = "atelier_pin_hash";

export function AtelierPinGate({ onUnlock }: { onUnlock: () => void }) {
  const queryClient = useQueryClient();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ATELIER_QUERY_KEYS.settings,
    queryFn: async () => (await listLocalSettings()).settings as AtelierSetting[],
  });

  const existingHash = settingsQuery.data?.find((s) => s.key === PIN_SETTING_KEY)?.value_json;
  const hasPin = !!existingHash;

  const setupPin = useMutation({
    mutationFn: async () => {
      const hash = await hashPin(pin);
      return putLocalSetting(PIN_SETTING_KEY, hash);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATELIER_QUERY_KEYS.settings });
      onUnlock();
    },
  });

  const unlock = useMutation({
    mutationFn: async () => hashPin(pin),
    onSuccess: (hash) => {
      const stored = JSON.parse(existingHash ?? "null");
      if (hash === stored) {
        setError(null);
        onUnlock();
      } else {
        setError("PIN incorreto.");
      }
    },
  });

  if (settingsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Verificando…</CardContent>
      </Card>
    );
  }

  if (!hasPin) {
    return (
      <Card className="max-w-sm mx-auto">
        <CardHeader>
          <CardTitle className="text-sm">Defina um PIN numérico</CardTitle>
          <CardDescription>
            Este PIN é gravado apenas localmente (hash em /settings) e protege o acesso à Kaline
            Atelier neste dispositivo. Não há e-mail nem conta — só este PIN.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input
            type="password"
            inputMode="numeric"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          <Input
            type="password"
            inputMode="numeric"
            placeholder="Confirme o PIN"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full"
            disabled={
              !pin.trim() || pin !== confirmPin || !/^\d{4,}$/.test(pin) || setupPin.isPending
            }
            onClick={() => {
              if (pin !== confirmPin) {
                setError("Os PINs não coincidem.");
                return;
              }
              setError(null);
              setupPin.mutate();
            }}
          >
            Salvar PIN
          </Button>
          {pin && !/^\d{4,}$/.test(pin) && (
            <p className="text-xs text-muted-foreground">Use ao menos 4 dígitos numéricos.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-sm mx-auto">
      <CardHeader>
        <CardTitle className="text-sm">Digite seu PIN</CardTitle>
        <CardDescription>Acesso à Kaline Atelier neste dispositivo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Input
          type="password"
          inputMode="numeric"
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          className="w-full"
          disabled={!pin.trim() || unlock.isPending}
          onClick={() => unlock.mutate()}
        >
          Entrar
        </Button>
      </CardContent>
    </Card>
  );
}
