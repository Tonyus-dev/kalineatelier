/**
 * Tipos de entrada do Registro Vivo (lado offline / Atelier).
 *
 * Espelha o CHECK do schema do local-server (`registro_vivo.kind`). Mantido aqui para a
 * Kaline Offline; a rota online `registro-vivo.tsx` usa sua própria lista (server
 * functions, escopo separado), por isso não é compartilhada.
 */
export const REGISTRO_KINDS = [
  "nota",
  "evento",
  "sentimento",
  "ideia",
  "dor",
  "ganho",
  "sonho",
  "pergunta",
  "decisao",
] as const;

export type RegistroKind = (typeof REGISTRO_KINDS)[number];
