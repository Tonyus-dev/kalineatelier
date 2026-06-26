/**
 * Resumo da identidade saneada, apenas com ponteiros para as fontes — nunca copiando
 * o conteúdo. A fonte de verdade continua em docs/canon/Identity.md (na raiz do repo).
 */

export function getIdentitySummary() {
  return {
    summary: "Identidade herdada do Totalidade saneado. Não duplicada aqui — apenas referenciada.",
    sources: [
      "docs/canon/Identity.md",
      "docs/kaline/Identity.md",
      "docs/kaline/LIBERTY.md",
      "docs/kaline/PRESENTE.md",
      "docs/kaline/Context.md",
      "docs/identity-audit.md",
    ],
  };
}
