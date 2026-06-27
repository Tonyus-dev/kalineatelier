# Kaline Desktop (PR 2 — companion nativo)

Casca nativa fininha em [Tauri](https://tauri.app), escrita em Rust, que só abre janelas
apontando para a **Kaline Offline já em execução** (PWA + `local-server`). Não tem
frontend próprio, não duplica lógica de chat/voz/transcrição — tudo isso já existe no
PR 1 (`/`, `/falar`, `/reuniao-rapida`, `/janelinha`).

Dois lançadores no menu de aplicativos do Linux (não na barra de tarefas):

1. **K∧LINE** — abre uma janela normal com o app completo (`/chat`).
2. **Janelinha da Kaline** — abre uma janela pequena, sem decoração, **always-on-top**,
   carregando a rota `/janelinha` (KITT pulsando + botões de falar/gravar).

O binário é o mesmo (`kaline-desktop`); o segundo lançador só passa `--janelinha`.

## ⚠️ Aviso honesto sobre verificação

Neste container havia Rust/Cargo, e foi possível instalar as libs de sistema do
WebKitGTK/GTK3 (`libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `librsvg2-dev`,
`libayatana-appindicator3-dev`, `patchelf`) e validar de fato:

- `cargo check` e `cargo build --release` compilam limpos (sem warnings).
- `npm run tauri build` gera o `.deb` (`Kaline Desktop_0.1.0_amd64.deb`) com sucesso,
  incluindo o lançador principal auto-gerado (`Exec=kaline-desktop`, `Icon=kaline-desktop`)
  — confirmado inspecionando o `.deb` com `dpkg-deb -x`.
- `ldd` no binário gerado mostra todas as bibliotecas dinâmicas resolvidas.
- O empacotamento AppImage falhou **só** por um problema de proxy de rede deste
  container (download de `AppRun` do GitHub via `binary-releases` quebra o protocolo
  HTTP do proxy), não por um erro no código ou na config — deve funcionar normalmente
  fora deste ambiente restrito.

O que **não foi possível** verificar aqui: abrir as janelas de fato (sem display/X
server no container) e o instalador `.msi`/NSIS do Windows (sem toolchain Windows).
Esses dois testes manuais — abrir os dois lançadores e confirmar visualmente a
janelinha always-on-top sem decoração, e o build/instalação no Windows — ficam para a
máquina do usuário (Linux Mint e, se aplicável, Windows).

## Pré-requisitos (Linux)

```bash
# Debian/Ubuntu/Mint
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev \
  libayatana-appindicator3-dev patchelf build-essential curl

# Rust (se ainda não tiver)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## Rodar em desenvolvimento

1. Suba o `local-server` e a Kaline Offline normalmente (na raiz do monorepo):
   ```bash
   bun run local:dev      # local-server em 127.0.0.1:64113
   bun run build && bun run preview   # PWA servida em http://127.0.0.1:4173
   ```
2. Nesta pasta (`apps/kaline-desktop`):
   ```bash
   npm install
   npm run tauri dev
   ```
   Para abrir a janelinha em vez do app completo:
   ```bash
   npm run tauri dev -- -- --janelinha
   ```

A URL base é `http://127.0.0.1:4173` por padrão. Para apontar para outra porta/URL
(ex.: produção do app, ou outra porta do `vite preview`), defina:

```bash
export KALINE_DESKTOP_APP_URL=http://127.0.0.1:4173
```

## Build e instalação dos dois lançadores (Linux)

```bash
npm run tauri build
```

Isso gera, em `src-tauri/target/release/bundle/`:

- `deb/kaline-desktop_0.1.0_amd64.deb` — instala o binário em `/usr/bin/kaline-desktop`
  e já registra **um** lançador (`K∧LINE`) automaticamente.
- `appimage/kaline-desktop_0.1.0_amd64.AppImage` — binário portátil único.

O **segundo lançador** (Janelinha) não é gerado automaticamente pelo bundler — é
manual, igual em qualquer um dos dois casos:

```bash
# Depois de instalar o .deb (binário em /usr/bin/kaline-desktop):
mkdir -p ~/.local/share/icons/hicolor/256x256/apps
cp src-tauri/icons/128x128@2x.png ~/.local/share/icons/hicolor/256x256/apps/kaline-desktop.png
cp packaging/linux/dev.tonyus.kaline-desktop.janelinha.desktop \
   ~/.local/share/applications/
update-desktop-database ~/.local/share/applications/ 2>/dev/null || true
```

Se for usar o **AppImage** em vez do `.deb`, instale os dois lançadores manualmente
(troque `Exec=kaline-desktop` pelo caminho absoluto do `.AppImage` nos dois arquivos
antes de copiar):

```bash
cp packaging/linux/dev.tonyus.kaline-desktop.desktop \
   packaging/linux/dev.tonyus.kaline-desktop.janelinha.desktop \
   ~/.local/share/applications/
# edite os dois arquivos copiados: Exec=/caminho/para/kaline-desktop_0.1.0_amd64.AppImage [--janelinha]
```

Depois de instalado, os dois ícones aparecem no menu de aplicativos do sistema
(ex.: Cinnamon/GNOME), ao lado de qualquer outro atalho — não na barra de tarefas.

## Windows (escrito, não verificado)

Sem toolchain Windows neste container; os passos abaixo seguem a documentação oficial
do Tauri e devem ser validados na máquina do usuário:

1. Instale [Rust](https://rustup.rs) e o
   [Microsoft Visual C++ Build Tools](https://tauri.app/start/prerequisites/#windows)
   (Tauri usa o WebView2, que já vem com o Windows 10/11 atualizado).
2. `npm install` e `npm run tauri build` nesta pasta geram um instalador `.msi` (e/ou
   `.exe` via NSIS, já habilitado em `tauri.conf.json`) em
   `src-tauri/target/release/bundle/`.
3. Para os dois lançadores no menu Iniciar, crie dois atalhos `.lnk` apontando para o
   mesmo `.exe` instalado — um sem argumentos, outro com `--janelinha` — usando o
   instalador NSIS customizado ou manualmente após a instalação. Isso não foi
   automatizado neste PR; é trabalho futuro caso o usuário use Windows no dia a dia.

## Fora de escopo deste companion

Sem lógica própria de chat, voz, transcrição, sync ou armazenamento — tudo isso
continua só na PWA e no `local-server` (127.0.0.1:64113). O Rust aqui só abre janelas
de webview apontando para URLs já existentes. Sem tray icon contínuo, sem wake word,
sem autostart — nada disso foi pedido.
