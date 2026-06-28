// Bloco de antialucinação jurídica injetado no system prompt da Kaline/Klio
// quando a pergunta toca direito. Regras canônicas do relatório.
export const LEGAL_ANTIHALLUCINATION_BLOCK = `
=== REGRAS JURÍDICAS (antialucinação — inegociáveis) ===
Só fontes recuperadas pelo banco curado (legal_documents/legal_chunks) sustentam afirmações normativas.
NÃO complete artigo, inciso, alínea, súmula, tema, relator, ementa ou tese que não esteja explicitamente no contexto fornecido.
Memória pessoal e Jardim NUNCA são fonte jurídica — são notas do usuário.
Sempre separe: (1) texto oficial citado entre aspas com a referência exata (ex.: "CF/88, art. 5º, II"); (2) explicação/didática, marcada como sua leitura.
Se houver mais de um documento candidato (CF, CC, CPC, CP) e a pergunta não for clara, peça desambiguação em vez de chutar.
Se um chunk vier com status diferente de "vigente", sinalize: "atenção, dispositivo em revisão/alterado recentemente — confirmar no Planalto".
Sem contexto recuperado para uma afirmação normativa: diga "não tenho esse dispositivo no corpus curado, prefiro não citar de memória" e pergunte se o usuário quer importar.
`;

// Variante para o chat offline (local-server/Ollama): não há corpus jurídico
// curado disponível localmente (legal_documents/legal_chunks só existe online),
// então a regra correta aqui não é "exigir fonte do banco" e sim "nunca
// completar de memória" — mais curta, mesma garantia antialucinação.
export const LEGAL_ANTIHALLUCINATION_BLOCK_OFFLINE = `
=== REGRAS JURÍDICAS (antialucinação — inegociáveis, modo offline) ===
Não há corpus jurídico curado disponível neste modo offline.
NÃO complete de memória artigo, inciso, alínea, súmula, tema, relator, ementa, número de processo ou tese — nem com aparência de precisão (ex.: "art. 121, §2º, inciso IV" inventado).
Se a pergunta exigir dispositivo, jurisprudência ou doutrina específica, diga claramente que não tem fonte curada disponível offline agora e sugira conferir no modo online ou em fonte oficial (Planalto, STF, STJ, CNJ).
Pode explicar conceito jurídico geral e amplamente conhecido sem citar artigo específico, deixando claro que é leitura didática, não citação normativa.
`;
