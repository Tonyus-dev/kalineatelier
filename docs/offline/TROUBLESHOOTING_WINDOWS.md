# Solução de problemas — Kaline Offline no Windows

## "Não é possível executar scripts" / política de execução do PowerShell

O Windows bloqueia scripts `.ps1` por padrão. Você não precisa mudar a
política global — use o `.bat`, que já passa `-ExecutionPolicy Bypass`
apenas para aquele processo:
```bat
powershell -ExecutionPolicy Bypass -File "%~dp0install-kaline-windows.ps1"
```
Se preferir rodar o `.ps1` direto, faça o mesmo manualmente:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-kaline-windows.ps1
```

## "git/node/npm/bun não encontrado"

Instale a ferramenta faltando e rode o instalador de novo:
- git: https://git-scm.com
- node/npm: https://nodejs.org
- bun: https://bun.sh
- cargo/rustup (opcional, só para o companion nativo): https://rustup.rs

## Companion Tauri não builda

Sem o Rust/Tauri toolchain (ou em ambiente corporativo restrito), o
instalador não falha — ele avisa e os scripts de start abrem
`http://127.0.0.1:4173/chat` e `/janelinha` no navegador padrão como
alternativa honesta.

## Ollama/modelos

https://ollama.com para instalar. Verifique com:
```powershell
ollama list
```
Modelos nunca são baixados automaticamente — o instalador pergunta antes
(`Modelo X não encontrado. Deseja baixar agora...? [s/N]`).

## Whisper

Coloque o binário e o modelo nos caminhos esperados:
```
%USERPROFILE%\Kaline\motores\whisper.cpp\build\bin\Release\whisper-cli.exe
%USERPROFILE%\Kaline\motores\whisper.cpp\models\ggml-small.bin
```
Rode o instalador de novo, ou edite `local-server\.env` manualmente
(`WHISPER_CPP_BIN`, `WHISPER_MODEL_PATH`).

## Kokoro/Dora

Coloque o modelo/voices em:
```
%USERPROFILE%\Kaline\motores\kokoro\kokoro-v1.0.int8.onnx
%USERPROFILE%\Kaline\motores\kokoro\voices-v1.0.bin
```
Sem isso, `/tts/status` fica `misconfigured`/`disabled` e o navegador usa
`speechSynthesis` como alternativa — nada quebra.

## Porta 64113 ou 4173 já em uso

Rode `powershell -File scripts\check-kaline-windows.ps1` para confirmar, e
`powershell -File scripts\stop-kaline-windows.ps1` antes de iniciar de novo.
Os scripts só param processos que eles mesmos iniciaram (rastreados por PID
em `%USERPROFILE%\.kaline\run\`).

## Ambiente corporativo bloqueia alguma etapa

Os scripts mostram um erro claro e o próximo passo manual em vez de falhar
silenciosamente. Se o antivírus/política de grupo bloquear a execução de
PowerShell ou a instalação de dependências, rode os passos manuais
equivalentes descritos em `docs/offline/INSTALL_WINDOWS.md` ou peça ajuda ao
time de TI para liberar `powershell.exe` para scripts locais do usuário.

## Abrir a Kaline Offline / Janelinha manualmente

```powershell
powershell -File scripts\start-kaline-windows.ps1 -Open main
powershell -File scripts\start-kaline-windows.ps1 -Open janelinha
```

## Atualizar

```powershell
git pull
powershell -ExecutionPolicy Bypass -File scripts\install-kaline-windows.ps1
```
