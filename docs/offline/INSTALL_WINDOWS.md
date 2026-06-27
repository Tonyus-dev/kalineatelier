# Instalar a Kaline Offline no Windows

Pensado para uso pessoal/trabalho em um computador Windows comum, sem precisar
de administrador (salvo se alguma dependência exigir).

## Local padrão

```
%USERPROFILE%\Kaline\kalineatelier
```

Não é necessário instalar em `C:\Program Files`.

## Caminho mais rápido: portal instalador

Se você ainda não tem o repositório, o Portal Instalador da Kaline Offline
(`apps/installer-worker/`, ver `docs/offline/INSTALLER_WORKER.md`) entrega um
bootstrap pequeno que localiza ou clona o repositório e já chama o passo 3
abaixo por você:

```powershell
irm https://SEU-WORKER.workers.dev/install/windows.ps1 -OutFile install-kaline.ps1
powershell -ExecutionPolicy Bypass -File .\install-kaline.ps1
```

O restante deste guia continua valendo — o bootstrap só evita o passo manual
de clonar o repositório.

## Passo a passo

1. Baixe o repositório para `%USERPROFILE%\Kaline\kalineatelier` (com
   `git clone <url> "%USERPROFILE%\Kaline\kalineatelier"` ou baixando o .zip e
   extraindo nessa pasta).
2. Abra essa pasta no Explorer.
3. Dê dois cliques em `scripts\install-kaline-windows.bat`.
4. Se o Windows bloquear a execução do PowerShell, veja
   `docs/offline/TROUBLESHOOTING_WINDOWS.md` — o `.bat` já usa
   `-ExecutionPolicy Bypass` só para esse processo, sem alterar a política
   global do sistema.
5. Acompanhe as 10 etapas: verificação de ferramentas (git/node/npm/bun/
   ollama/cargo), instalação de dependências do projeto, build do
   local-server e do companion Tauri (se Rust estiver disponível),
   configuração do `.env`, verificação de Ollama/modelos, Whisper,
   Kokoro/Dora, criação de atalhos e diagnóstico final.
6. Use os atalhos criados na Área de Trabalho e no menu Iniciar (pasta
   "Kaline"): **Kaline Offline**, **Kaline Janelinha**,
   **Instalar/Atualizar Kaline**, **Verificar Kaline**, **Parar Kaline**.

## Sem administrador

O instalador funciona em modo usuário. Os atalhos são criados em:
```
%USERPROFILE%\Desktop
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Kaline
```
Nenhuma configuração global do Windows é alterada.

## Ollama, Whisper e Kokoro

Nenhum é obrigatório:
- **Ollama**: https://ollama.com. Sem ele, o modo "mock" continua
  funcionando. Modelos só são baixados com sua confirmação explícita.
- **Whisper**: o instalador procura em
  `%USERPROFILE%\Kaline\motores\whisper.cpp\...`; se não achar, avisa e
  segue (transcrição fica indisponível até configurar manualmente).
- **Kokoro/Dora**: mesma lógica; sem o modelo, a voz cai para o
  `speechSynthesis` do navegador.

## Atualizar depois

```powershell
git pull
powershell -ExecutionPolicy Bypass -File scripts\install-kaline-windows.ps1
```

## Segurança

O instalador e os scripts de start/stop/check nunca usam `0.0.0.0`, nunca
abrem porta pública, nunca mexem no firewall sem sua autorização, nunca
enviam áudio para a nuvem, nunca baixam modelos grandes sem confirmação,
nunca sobrescrevem `.env` sem backup, e nunca exigem administrador sem
necessidade real.

Veja também `docs/offline/DESKTOP_COMPANION.md`,
`docs/offline/TROUBLESHOOTING_WINDOWS.md` e, para problemas específicos do
bootstrap baixado pelo portal, `docs/offline/TROUBLESHOOTING_INSTALLER.md`.
