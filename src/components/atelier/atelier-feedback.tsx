import type { ReactNode } from "react";
import { CardListSkeleton } from "@/components/loading-states";

/** Erro inline para listas/cards do Atelier (não derruba a aba inteira). */
export function AtelierInlineError({ error }: { error: Error }) {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
      Erro ao carregar: {error.message || "falha inesperada na API local."}
    </div>
  );
}

/**
 * Mostra skeleton durante o carregamento, erro inline em falha, e o conteúdo quando
 * pronto — para que listas vazias por loading/erro não pareçam "sem dados".
 */
export function AtelierAsync({
  isLoading,
  error,
  rows = 3,
  children,
}: {
  isLoading: boolean;
  error: unknown;
  rows?: number;
  children: ReactNode;
}) {
  if (isLoading) return <CardListSkeleton rows={rows} />;
  if (error)
    return <AtelierInlineError error={error instanceof Error ? error : new Error(String(error))} />;
  return <>{children}</>;
}
