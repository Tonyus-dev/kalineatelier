import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReuniaoCard } from "@/components/companion/ReuniaoCard";

export const Route = createFileRoute("/reuniao-rapida")({ component: ReuniaoRapidaPage });

function ReuniaoRapidaPage() {
  return (
    <div className="mx-auto max-w-md p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Gravar reunião</CardTitle>
        </CardHeader>
        <CardContent>
          <ReuniaoCard />
        </CardContent>
      </Card>
    </div>
  );
}
