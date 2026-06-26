# Checklist de Release — Kaline Offline v0.1

Checklist a ser percorrido antes de qualquer release/tag desta fase tunnel-ready.

## Build e testes

- [ ] `bun run typecheck` passou
- [ ] `bun run build` passou
- [ ] `bun run test` passou
- [ ] `cd local-server && npm run build` passou
- [ ] `node scripts/smoke-local-server.js` passou (com `local-server` rodando)

## Ambiente e segredos

- [ ] `.env.example` (raiz) revisado, sem secrets reais
- [ ] `local-server/.env.example` revisado, sem secrets reais
- [ ] Nenhum segredo real versionado (`git diff` revisado manualmente)
- [ ] `OPENROUTER_API_KEY` e demais chaves continuam fora do `.env.example`

## Documentação

- [ ] `docs/offline/INSTALL.md` atualizada
- [ ] `docs/offline/MODELS_LOCAL.md` atualizada
- [ ] `docs/offline/TUNNEL_READY.md` atualizada
- [ ] `docs/offline/TROUBLESHOOTING.md` atualizada
- [ ] `docs/offline/README.md` aponta para os documentos acima

## Escopo funcional (ver `OFFLINE_SCOPE.md`)

- [ ] Kuan-Yin comércio ausente da Offline
- [ ] Chat Kuan-Yin ausente da Offline
- [ ] Chat Kháris ausente da Offline
- [ ] Treinos dedicado, Drive, Jurídico, Perfis & Convites ausentes da Offline
- [ ] Home, Chat Kaline, Facetas, Agenda, Câmara do Eco, Registro Vivo, Jardim, Revisão,
      Klio/Estudos, Livros/Resumos, Meu Perfil continuam acessíveis

## Túnel e modelos

- [ ] Túnel desativado por padrão (`KALINE_TUNNEL_MODE=disabled`)
- [ ] `GET /bridge/status` responde com `mode: "disabled"`
- [ ] Provider mock funciona sem configuração extra
- [ ] OpenRouter documentado (e não habilitado por padrão)
- [ ] Ollama documentado (e não habilitado por padrão)
- [ ] Câmara do Eco documentada/preservada (ver `OFFLINE_SCOPE.md` e nav do app)

## Empacotamento

- [ ] Nenhum `node_modules` incluído na release
- [ ] Nenhum banco real do usuário (`local-server/data/*.sqlite`) incluído
- [ ] Nenhum `.env` incluído (apenas `.env.example`)
- [ ] Nenhum modelo de IA incluído
- [ ] Ver `release/CHECKLIST.md` para o checklist de empacotamento detalhado

Só marque este PR como pronto quando todos os itens acima estiverem checados.
