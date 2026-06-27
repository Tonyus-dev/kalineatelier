import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AtelierProvider, useAtelier } from "@/components/atelier/AtelierContext";
import { AtelierChat } from "@/components/atelier/AtelierChat";
import { AtelierRegistro } from "@/components/atelier/AtelierRegistro";
import { AtelierJardim } from "@/components/atelier/AtelierJardim";
import { AtelierRevisao } from "@/components/atelier/AtelierRevisao";
import { AtelierRelatorios } from "@/components/atelier/AtelierRelatorios";
import { AtelierConfiguracoes } from "@/components/atelier/AtelierConfiguracoes";
import { AtelierPinGate } from "@/components/atelier/AtelierPinGate";

export const Route = createFileRoute("/atelier")({
  component: () => (
    <AtelierProvider>
      <AtelierPage />
    </AtelierProvider>
  ),
});

function StatusBadge() {
  const { health, isLoading } = useAtelier();

  if (isLoading && !health) return <Badge variant="secondary">verificando…</Badge>;
  if (health?.ok) return <Badge>API local online · {health.mode}</Badge>;
  return <Badge variant="destructive">API local indisponível</Badge>;
}

function AtelierPage() {
  const [unlocked, setUnlocked] = useState(false);
  const { offline } = useAtelier();

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
            <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
            <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
          </TabsList>
          <TabsContent value="chat">
            <AtelierChat />
          </TabsContent>
          <TabsContent value="registro">
            <AtelierRegistro />
          </TabsContent>
          <TabsContent value="jardim">
            <AtelierJardim />
          </TabsContent>
          <TabsContent value="revisao">
            <AtelierRevisao />
          </TabsContent>
          <TabsContent value="relatorios">
            <AtelierRelatorios />
          </TabsContent>
          <TabsContent value="configuracoes">
            <AtelierConfiguracoes />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
