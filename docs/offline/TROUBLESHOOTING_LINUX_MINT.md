# Solução de problemas — Kaline Offline no Linux Mint Xfce

## "Não foi possível executar" ao dar dois cliques no `.desktop`

O Linux Mint marca arquivos `.desktop` baixados como não-confiáveis por
padrão. Soluções:

1. Clique com o botão direito no arquivo `install-kaline-mint.desktop` →
   "Permitir execução" (ou "Allow execution") → tente de novo.
2. Ou dê permissão de execução manualmente:
   ```bash
   chmod +x scripts/install-kaline-mint.desktop scripts/install-kaline-mint.sh
   ```
3. Ou simplesmente rode pelo terminal (sempre funciona):
   ```bash
   bash scripts/install-kaline-mint.sh
   ```

## "bun/node/cargo não encontrado"

Instale a ferramenta faltando e rode o instalador de novo:
- bun: https://bun.sh
- node/npm: https://nodejs.org
- cargo/rustup (opcional, só para o companion nativo): https://rustup.rs

O instalador não quebra por falta de `cargo` — só avisa e usa o navegador
como alternativa para abrir a Kaline Janelinha.

## Companion Tauri não builda (erro de WebKitGTK/GTK)

Instale manualmente as dependências (Mint/Ubuntu):
```bash
sudo apt-get install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```
Em versões mais antigas, troque `libwebkit2gtk-4.1-dev` por
`libwebkit2gtk-4.0-dev`. Sem essas libs, o companion não builda, mas a Kaline
continua funcionando no navegador.

## Ícone do lançador não é a maçã

O instalador procura o ícone em `public/`, `src/assets/`, `assets/` e `docs/`
por nomes contendo "kaline", "apple", "maca/maçã", "logo", "icon" ou
"wordmark". Se não encontrar nenhum, usa um ícone de sistema genérico
(`utilities-terminal`) e avisa no terminal — isso não impede o uso normal.

## A Kaline Janelinha não aparece no painel do Xfce

A fixação automática no painel (`scripts/pin-kaline-to-mint-panel.sh`) é
deliberadamente cautelosa: se não conseguir confirmar que vai ser uma
alteração 100% segura e reversível, ela desiste e mostra esta alternativa
manual:

> Clique com o botão direito no painel do Xfce → Adicionar novo item →
> "Lançador" → aponte para o atalho "Kaline Janelinha" em
> `~/.local/share/applications/dev.tonyus.kaline-janelinha.desktop`.

Você também pode arrastar o atalho do menu de aplicativos até o painel.

## Porta 64113 ou 4173 "já em uso"

Provavelmente outra instância já está rodando. Rode
`bash scripts/check-kaline-mint.sh` para confirmar, e
`bash scripts/stop-kaline-mint.sh` antes de iniciar de novo, se necessário.
Os scripts nunca matam processos genéricos do seu usuário — só os que eles
mesmos iniciaram (rastreados por PID em `~/.kaline/run/`).

## Modelos do Ollama não aparecem

O instalador nunca baixa modelos automaticamente. Confirme manualmente:
```bash
ollama pull llama3.2:1b
```
(troque pelo modelo que faltar).

## Quero desfazer a fixação no painel

Edite o painel do Xfce normalmente (botão direito → remover item) — a
fixação só adiciona um lançador novo, nunca substitui nada existente, então
remover é seguro e não afeta outros itens do painel.
