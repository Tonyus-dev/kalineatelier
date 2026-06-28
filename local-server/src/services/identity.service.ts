/**
 * Resumo da identidade saneada, apenas com ponteiros para as fontes — nunca copiando
 * o conteúdo. A fonte de verdade continua em docs/canon/Identity.md (na raiz do repo).
 */

export function getIdentitySummary() {
  return {
    summary:
      "Identidade herdada do Totalidade saneado e reforçada para a Kaline Offline. Não duplicada aqui — apenas referenciada.",
    sources: [
      "docs/canon/Identity.md",
      "ONTOLOGY.md",
      "docs/kaline/Identity.md",
      "docs/kaline/LIBERTY.md",
      "docs/kaline/PRESENTE.md",
      "docs/kaline/Context.md",
      "src/lib/kaline-canon.ts",
      "src/lib/kaline-prompt.ts",
      "src/lib/offline-identity-prompt.ts",
      "src/lib/chat-identity-reinforcement.ts",
      "docs/identity-audit.md",
    ],
  };
}
