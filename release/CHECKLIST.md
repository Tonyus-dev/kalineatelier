# Checklist de empacotamento — Kaline Offline v0.1

- [ ] `git status` limpo (nada pendente fora do esperado)
- [ ] `bun run typecheck && bun run build && bun run test` passaram
- [ ] `cd local-server && npm run build` passou
- [ ] `node scripts/check-local-env.js` documentado como passo opcional para quem for testar
- [ ] `node scripts/smoke-local-server.js` passou com `local-server` rodando localmente
- [ ] Nenhum arquivo `.env` real está rastreado (`git ls-files | grep -E '\\.env$'` vazio)
- [ ] Nenhum arquivo `.sqlite`/`.sqlite-wal`/`.sqlite-shm` está rastreado
- [ ] `node_modules` não está rastreado (raiz nem `local-server`)
- [ ] Checklist funcional de `../docs/offline/RELEASE.md` concluído
- [ ] Tag/versão definida (ex.: `v0.1.0-offline`) se for gerar um zip/release no GitHub

Ver também [`README_RELEASE.md`](./README_RELEASE.md) para o que entra/não entra no pacote.
