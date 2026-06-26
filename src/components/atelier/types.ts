/**
 * Tipos de leitura para os dados vindos da API local (PR 2). Espelham os shapes do
 * `local-server`, mas não importam nada de lá — os dois projetos são isolados.
 */

export type AtelierFacet = "kaline" | "kharis" | "kuanyin" | "coder";

export type AtelierThread = {
  id: string;
  title: string;
  facet: AtelierFacet;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type AtelierMessage = {
  id: string;
  thread_id: string;
  role: "system" | "user" | "assistant";
  content: string;
  created_at: string;
};

export type AtelierRegistro = {
  id: string;
  kind: string;
  title: string;
  content: string;
  created_at: string;
};

export type AtelierMemoria = {
  id: string;
  title: string;
  content: string;
  ease: number;
  interval_days: number;
  due_at: string | null;
  review_count: number;
};

export type AtelierSedimento = {
  id: string;
  level: number;
  content: string;
  status: "em_revisao" | "confirmado" | "descartado" | "promovido";
  created_at: string;
  metadata_json: string | null;
};

export type AtelierReport = {
  id: string;
  title: string;
  kind: string;
  content_md: string;
  created_at: string;
};

export type AtelierSetting = {
  key: string;
  value_json: string;
  updated_at: string;
};
