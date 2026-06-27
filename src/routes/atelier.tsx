import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { checkLocalHealth } from "@/lib/local/local-api-client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AtelierChat } from "@/components/atelier/AtelierChat";
import { AtelierRegistro } from "@/components/atelier/AtelierRegistro";
import { AtelierJardim } from "@/components/atelier/AtelierJardim";
import { AtelierRevisao } from "@/components/atelier/AtelierRevisao";
import { AtelierInbox } from "@/components/atelier/AtelierInbox";
import { AtelierRelatorios } from "@/components/atelier/AtelierRelatorios";
import { AtelierConfiguracoes } from "@/components/atelier/AtelierConfiguracoes";
import { AtelierPinGate } from "@/components/atelier/AtelierPinGate";

export const Route = createFileRoute("/atelier")({ component: AtelierPage });

function StatusBadge() {
  const { data } = useQuery({
    queryKey: ["atelier", "health"],
    queryFn: () => checkLocalHealth(),
    refetchInterval: 10_000,
  });

  if (!data) return <Badge variant="secondary">verificando…</Badge>;
  if (data.ok) {
    return <Badge>API local online · {data.mode}</Badge>;
  }
  return <Badge variant="destructive">API local indisponível</Badge>;
}

function AtelierPage() {
  const [unlocked, setUnlocked] = useState(false);
  const { data: health } = useQuery({
    queryKey: ["atelier", "health"],
    queryFn: () => checkLocalHealth(),
    refetchInterval: 10_000,
  });
  const offline = !health?.ok;

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Kaline Atelier</h1>
          <p className="text-sm text-muted-foreground">
            Experiência offline-first sobre a API local em 127.0.0.1:64113.
          </p>
        </div>
        <StatusBadge />
      </div>

      {offline && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          API local indisponível. Inicie o servidor local com{" "}
          <code className="font-mono">npm run local:dev</code> (ou{" "}
          <code className="font-mono">bun run local:dev</code> na raiz). Nenhum dado é exibido ou
          salvo enquanto a API estiver fora do ar.
        </div>
      )}

      {!offline && !unlocked && (
        <div className="py-8">
          <AtelierPinGate onUnlock={() => setUnlocked(true)} />
        </div>
      )}

      {!offline && unlocked && (
        <Tabs defaultValue="chat">
          <TabsList className="flex-wrap">
            <TabsTrigger value="chat">Chat Kaline</TabsTrigger>
            <TabsTrigger value="registro">Registro Vivo</TabsTrigger>
            <TabsTrigger value="jardim">Jardim</TabsTrigger>
            <TabsTrigger value="revisao">Revisão</TabsTrigger>
            <TabsTrigger value="inbox">Inbox</TabsTrigger>
            <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
            <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
          </TabsList>
          <TabsContent value="chat">
            <AtelierChat disabled={offline} />
          </TabsContent>
          <TabsContent value="registro">
            <AtelierRegistro disabled={offline} />
          </TabsContent>
          <TabsContent value="jardim">
            <AtelierJardim disabled={offline} />
          </TabsContent>
          <TabsContent value="revisao">
            <AtelierRevisao disabled={offline} />
          </TabsContent>
          <TabsContent value="inbox">
            <AtelierInbox disabled={offline} />
          </TabsContent>
          <TabsContent value="relatorios">
            <AtelierRelatorios disabled={offline} />
          </TabsContent>
          <TabsContent value="configuracoes">
            <AtelierConfiguracoes disabled={offline} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
