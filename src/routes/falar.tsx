import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FalarCard } from "@/components/companion/FalarCard";

export const Route = createFileRoute("/falar")({ component: FalarPage });

function FalarPage() {
  return (
    <div className="mx-auto max-w-md p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Falar com Kaline</CardTitle>
        </CardHeader>
        <CardContent>
          <FalarCard />
        </CardContent>
      </Card>
    </div>
  );
}
