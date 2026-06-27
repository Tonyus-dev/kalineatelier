/**
 * Chaves de query do Atelier centralizadas — fonte única para evitar colisões e
 * dessincronização de invalidação entre componentes (ex.: settings usada tanto no
 * PinGate quanto em Configurações).
 */
export const ATELIER_QUERY_KEYS = {
  health: ["atelier", "health"] as const,
  settings: ["atelier", "settings"] as const,
  identity: ["atelier", "identity"] as const,
  modelStatus: ["atelier", "model-status"] as const,
  bridgeStatus: ["atelier", "bridge-status"] as const,
  transcribeStatus: ["atelier", "transcribe-status"] as const,
  threads: ["atelier", "threads"] as const,
  messages: (threadId: string) => ["atelier", "messages", threadId] as const,
  registros: ["atelier", "registros"] as const,
  memorias: ["atelier", "memorias"] as const,
  sediments: (status?: string) =>
    status ? (["atelier", "sediments", status] as const) : (["atelier", "sediments"] as const),
  reports: ["atelier", "reports"] as const,
} as const;
