# Instalar a Kaline Offline no Linux Mint (Xfce)

Este guia cobre a instalação completa da Kaline Offline em um Linux Mint com o
ambiente Xfce (o padrão do Linux Mint). Foco: Linux Mint Xfce. Se você usa
Cinnamon, a maior parte dos passos funciona igual, mas a fixação automática no
painel (passo 7) é específica do Xfce.

## O que é instalado

- **local-server**: API local em `http://127.0.0.1:64113` (nunca exposta fora
  do seu computador).
- **PWA**: interface web da Kaline, servida em `http://127.0.0.1:4173`.
- **Companion Tauri** (opcional, se `cargo`/Rust estiverem disponíveis): janelas
  nativas — app completo e "Kaline Janelinha" (mini-janela flutuante).
- **Atalhos** no menu de aplicativos (e na Área de Trabalho, se existir).

Nada disso é "a Kaline" em si — são só lançadores e processos de sistema
operacional. A inteligência roda dentro do local-server, falando só com
`127.0.0.1`.

## Passo a passo

1. Baixe o repositório (`git clone ...` ou `gh repo clone Tonyus-dev/kalineatelier`)
   em uma pasta como `~/Kaline/kalineatelier`.
2. Abra um terminal nessa pasta.
3. Rode:
   ```bash
   bash scripts/install-kaline-mint.sh
   ```
   Ou dê dois cliques em `scripts/install-kaline-mint.desktop` (veja a seção de
   solução de problemas se o Mint bloquear a execução por clique).
4. Acompanhe as 10 etapas no terminal: dependências de sistema, ferramentas
   (bun/node/npm/cargo), build do local-server e do companion, configuração do
   `.env`, verificação de Ollama/modelos, Whisper, Kokoro/Dora, criação de
   atalhos, tentativa de fixação no painel do Xfce, e diagnóstico final.
5. Ao final, use os atalhos criados no menu de aplicativos:
   - **Kaline Offline** — abre o app completo.
   - **Kaline Janelinha** — abre a mini-janela flutuante.
   - **Instalar/Atualizar Kaline** — roda o instalador de novo (para atualizar).
   - **Verificar Kaline** — roda o diagnóstico (`check-kaline-mint.sh`).
   - **Parar Kaline** — encerra os processos locais.

## Dois cliques no `.desktop` não funcionam?

O Linux Mint, por segurança, às vezes não deixa executar um `.desktop` com um
duplo clique direto do gerenciador de arquivos. Veja
`docs/offline/TROUBLESHOOTING_LINUX_MINT.md` para o passo exato (clicar com o
botão direito → "Permitir execução" ou similar).

## Sobre Ollama, Whisper e Kokoro

Nenhum desses é obrigatório para o instalador terminar com sucesso:

- **Ollama**: se não estiver instalado, o instalador avisa e segue — o modo
  "mock" do local-server continua funcionando. Modelos nunca são baixados sem
  você confirmar explicitamente (`[s/N]`).
- **Whisper**: o instalador só procura nos caminhos prováveis documentados; se
  não achar, transcrição fica indisponível até você configurar manualmente.
- **Kokoro/Dora**: mesma lógica — sem o modelo, a voz cai para o
  `speechSynthesis` do navegador como alternativa honesta.

## Segurança

O instalador e os scripts de start/stop/check nunca:
- usam `0.0.0.0` ou abrem porta pública;
- mexem em firewall;
- enviam áudio para a nuvem;
- baixam modelos grandes sem você confirmar;
- sobrescrevem `.env` sem fazer backup antes;
- tocam no painel do Xfce sem fazer backup do estado atual primeiro, e nunca
  removem itens existentes do seu painel.

Veja também `docs/offline/DESKTOP_COMPANION.md` (companion Tauri) e
`docs/offline/TROUBLESHOOTING_LINUX_MINT.md`.
