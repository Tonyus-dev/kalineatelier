# Kaline Desktop Companion (Tauri)

`apps/kaline-desktop` é uma casca nativa fina escrita em Rust/Tauri. Ela não
tem lógica própria de chat, voz ou transcrição — só abre janelas que carregam
rotas já existentes da PWA (`/chat`, `/janelinha`), que por sua vez falam só
com `http://127.0.0.1:64113`.

## Os dois lançadores

- **`kaline-desktop`** (sem argumentos) — janela normal, 1200x800, carrega
  `/chat`.
- **`kaline-desktop --janelinha`** — "Kaline Janelinha": mini-janela
  always-on-top, ~420x620, redimensionável, sem decoração de sistema, oculta
  da barra de tarefas (`skip_taskbar`). Carrega `/janelinha`, que mostra o
  indicador `kitt-pulse` pulsando quando a Kaline fala/ouve, e dois botões:
  enviar mensagem (com resposta falada via Kokoro/Dora) e iniciar
  transcrição de reunião.

A URL base é configurável via variável de ambiente `KALINE_DESKTOP_APP_URL`
(default `http://127.0.0.1:4173`, a porta do `vite preview`).

## Build

Linux (testado em container com WebKitGTK/GTK3 instalados):
```bash
cd apps/kaline-desktop
npm install
npm run tauri build
```
Gera um `.deb` funcional (verificado com `dpkg-deb`/`ldd`). O AppImage pode
falhar em ambientes sem acesso direto ao GitHub Releases (não é um bug do
projeto) — o `.deb` é suficiente para uso normal.

Windows: mesmo comando (`npm run tauri build`), gera um instalador NSIS/MSI.
Não verificado em container Linux — siga
`docs/offline/INSTALL_WINDOWS.md` para o fluxo completo no Windows.

## Se o Tauri/Rust não estiver disponível

O instalador (`install-kaline-mint.sh` / `install-kaline-windows.ps1`) nunca
falha por falta de `cargo`/Rust. Nesse caso, os scripts de start abrem
`/chat` e `/janelinha` direto no navegador padrão, como alternativa honesta —
a experiência muda (sem always-on-top, sem ícone próprio), mas a
funcionalidade continua disponível.

## Segurança

A casca Tauri não abre nenhuma porta, não escuta rede, e não tem acesso a
nada que a própria PWA já não tenha. Microfone só ativa por ação explícita do
usuário dentro das rotas `/falar` e `/reuniao-rapida` — nunca wake word, nunca
escuta contínua.
