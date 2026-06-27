import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { checkLocalHealth, type LocalHealthResult } from "@/lib/local/local-api-client";
import { ATELIER_QUERY_KEYS } from "@/lib/local/query-keys";

/**
 * Estado compartilhado do Atelier. Centraliza o poll de saúde da API local em um único
 * lugar (antes eram 3 queries duplicadas) e expõe `offline` para os componentes, evitando
 * o prop-drilling de `disabled`.
 */
type AtelierContextValue = {
  health: LocalHealthResult | undefined;
  isLoading: boolean;
  /** true quando a API local não respondeu ok — bloqueia ações que tocam o servidor. */
  offline: boolean;
};

const AtelierContext = createContext<AtelierContextValue | null>(null);

export function AtelierProvider({ children }: { children: ReactNode }) {
  const { data: health, isLoading } = useQuery({
    queryKey: ATELIER_QUERY_KEYS.health,
    queryFn: () => checkLocalHealth(),
    refetchInterval: 10_000,
  });

  return (
    <AtelierContext.Provider value={{ health, isLoading, offline: !health?.ok }}>
      {children}
    </AtelierContext.Provider>
  );
}

export function useAtelier(): AtelierContextValue {
  const ctx = useContext(AtelierContext);
  if (!ctx) throw new Error("useAtelier deve ser usado dentro de <AtelierProvider>");
  return ctx;
}
