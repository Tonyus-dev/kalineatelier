# Solução de problemas — Portal Instalador da Kaline Offline

Este documento cobre problemas específicos do **portal** (Cloudflare Worker)
e dos **bootstraps** baixáveis (`apps/installer-worker/install/*`). Para
problemas da instalação real em si (dependências, Tauri, painel do Xfce,
porta em uso etc.), veja:

- `docs/offline/TROUBLESHOOTING_LINUX_MINT.md`
- `docs/offline/TROUBLESHOOTING_WINDOWS.md`

## `gh` não existe

O bootstrap depende do GitHub CLI para localizar/clonar o repositório com
segurança (sem pedir token no portal).

- Linux: `sudo apt install gh` (ou veja https://github.com/cli/cli#installation)
- Windows: `winget install --id GitHub.cli`

Depois, rode o bootstrap de novo.

## Não tenho acesso ao repo

```bash
gh auth login
```

Siga o fluxo interativo (navegador ou código de dispositivo). **Nunca cole
tokens ou chaves secretas no portal nem em nenhum script** — a autenticação
acontece inteiramente no seu terminal, fora do navegador.

Se `gh auth login` funcionar mas o clone ainda falhar, confirme que sua
conta tem acesso ao repositório `Tonyus-dev/kalineatelier`.

## Mint bloqueou o script

O Linux Mint marca arquivos baixados como não confiáveis por padrão.
Soluções:

1. Clique com o botão direito no arquivo baixado → "Permitir execução" (ou
   "Allow execution") → tente de novo.
2. Ou dê permissão manualmente:
   ```bash
   chmod +x kaline-installer-linux-mint.sh kaline-installer-linux-mint.desktop
   ```
3. Ou rode direto pelo terminal (sempre funciona):
   ```bash
   bash kaline-installer-linux-mint.sh
   ```

## PowerShell bloqueou o script

O Windows bloqueia `.ps1` por padrão. Use o `.bat` baixado pelo portal — ele
já chama o PowerShell com `-ExecutionPolicy Bypass` apenas para aquele
processo, sem alterar a política global do sistema:

```bat
powershell -ExecutionPolicy Bypass -File "%~dp0kaline-installer-windows.ps1"
```

Se preferir rodar o `.ps1` direto:

```powershell
powershell -ExecutionPolicy Bypass -File kaline-installer-windows.ps1
```

## Ollama não está rodando

Isso é verificado pelo instalador real, não pelo bootstrap. Instale em
https://ollama.com e inicie o serviço. Sem ele, a instalação segue normal —
o modo mock do `local-server` continua funcionando.

## Modelo Ollama ausente

O instalador real nunca baixa modelos sem confirmação. Quando perguntar
`Modelo X não encontrado. Deseja baixar agora? [s/N]`, responda `s` para
baixar, ou `N` para seguir sem ele (a Kaline é instalada, mas a IA local
fica indisponível/limitada até você baixar o modelo manualmente com
`ollama pull <modelo>`).

## Whisper Small não encontrado

O instalador real procura o binário/modelo nos caminhos conhecidos (veja
`docs/offline/INSTALL_LINUX_MINT.md` / `INSTALL_WINDOWS.md`). Se não
encontrar, avisa e segue — a transcrição fica indisponível até você
configurar `WHISPER_CPP_BIN` / `WHISPER_MODEL_PATH` manualmente em
`local-server/.env`. Isso nunca quebra a instalação.

## Kokoro/Dora não encontrado

Mesma lógica do Whisper: sem o modelo/voices do Kokoro, `/tts/status` fica
`misconfigured`/`disabled` e o navegador usa `speechSynthesis` como
alternativa. A instalação não falha por isso.

## Janelinha não apareceu na barra do Mint

A fixação automática no painel do Xfce
(`scripts/pin-kaline-to-mint-panel.sh`) é deliberadamente cautelosa: se não
conseguir confirmar que a alteração é 100% segura e reversível, ela desiste
e mostra a alternativa manual:

> Abra o menu de aplicativos → procure "Kaline Janelinha" → clique com o
> botão direito → "Adicionar ao painel" (ou arraste o ícone até a barra).

## O Worker em si está fora do ar

O portal é só uma porta de entrada — você pode pular direto para o
instalador real se já tiver o repositório:

```bash
bash scripts/install-kaline-mint.sh        # Linux
powershell -ExecutionPolicy Bypass -File scripts\install-kaline-windows.ps1  # Windows
```
